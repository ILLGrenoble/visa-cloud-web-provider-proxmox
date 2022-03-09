import { singleton } from "tsyringe";
import { CloudInstanceState, Flavour, Image, Instance, Metrics, Resource } from "../../models";
import axios, { AxiosInstance } from "axios";
import { CloudProvider } from "../cloud-provider.interface";
import { logger } from "../../utils";
import { DBService } from "../database/db.service";
import { HttpException } from "../../exceptions";
import yaml from "js-yaml";
import { APPLICATION_CONFIG } from "../../application-config";


@singleton()
export class ProxmoxService implements CloudProvider {

    private readonly _client: AxiosInstance;
    private readonly _dbService: DBService;
    private readonly _selectCoeff: number;
    /**
     * Create a new proxmox service
     */
    constructor(
        proxmoxEndpoint: string,
        timeout: number,
        PVEAPIToken: string,
        dbService: DBService,
        selectCoeff: number
    ) {
        this._client = this.createClient(proxmoxEndpoint, timeout, PVEAPIToken);
        this._dbService = dbService;
        this._selectCoeff = selectCoeff;
    }

    /**
     * Create a new axios client
     * @private
     */
    private createClient(proxmoxEndpoint: string, timeout: number, PVEAPIToken: string): AxiosInstance {
        const client = axios.create({
            baseURL: proxmoxEndpoint,
            timeout: timeout,
            proxy: false,
            headers: {
                Authorization: `PVEAPIToken=${PVEAPIToken}`
            }
        });
        client.interceptors.response.use((response) => response, (error) => {
            if (error instanceof HttpException) {
                throw error;
            }
            if (axios.isAxiosError(error)) {
                throw new HttpException(`${error.message} | ${error.response?.statusText}`, error?.response?.status);
            }
        });
        return client;
    }

    // We don't know on which node the vm is. Because a vm could be migrated manually, it's better not to store this in DB, but to query it each time we need the info
    private async _getResourceForId(id: string): Promise<Resource> {
        const resourcesUrl = 'cluster/resources';
        const resourceList: [any] = (await this._client.get(resourcesUrl, { params: { type: 'vm' } })).data.data;
        const res = resourceList.find((resource => resource.vmid == id));
        if (!res) {
            this._dbService.deleteInstance(id);
            logger.warning(`Instance ${id} deleted from database because it can't be found in proxmox`);
            throw new HttpException("Instance not found in Proxmox", 404);
        }
        return res;
    }

    /**
     * Call a function after proxmox finish a task
     * taskId is usually the only return of a proxmox API call that create a task (clone, start, stop ...)
     */
    private async _checkTask(taskId, callback) {
        try {
            const taskRes = (await this._client.get(`cluster/tasks`)).data.data;
            const task = taskRes.find(t => t.upid == taskId);
            if (task.status == 'OK') {
                callback();
            } else {
                setTimeout(this._checkTask.bind(this), 500, taskId, callback);
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * There's no load balancing available in proxmox. We need to DIY to chose on which node we clone the template.
     * This function sort the nodes on available capacity.
     * There's no single "capacity available" number, so we need to roll our own.
     */
    private async _selectBestNode(minCpus, minRam): Promise<string> {
        // get list of nodes with enough resources
        const nodesRes = (await this._client.get('nodes')).data.data as [any];
        const availableNodes = nodesRes.filter((node) => (node.maxcpu - node.cpu) > minCpus && (node.maxmem - node.mem) * 1024 * 1024 * 1024 > minRam);
        if (!availableNodes || availableNodes.length == 0) {
            throw new Error("selectBestNode: Can't find any node to select from");
        }

        // basic sort criteria: number of (4GB + 1 core) available
        const res = availableNodes.sort((a, b) => {
            const scoreA = (a.maxcpu - a.cpu) + (a.maxmem - a.mem) / (this._selectCoeff);
            const scoreB = (b.maxcpu - b.cpu) + (b.maxmem - b.mem) / (this._selectCoeff);
            if (scoreA == scoreB) return 0;
            return (scoreA < scoreB) ? 1 : -1;
        })[0].node;
        return res;
    }

    /**
     * Get an instance for a given instance identifier
     * @param id the instance identifier
     */
    async instance(id: string): Promise<Instance> {
        logger.info(`Fetching instance: ${id}`);

        const resource = await this._getResourceForId(id);

        const instanceDb = await this._dbService.getInstance(id);
        if (instanceDb == undefined) {
            logger.warning(`VM ${id} not in database`);
            throw new HttpException("Instance not found in Proxmox", 404);
        }

        const runningStates = [CloudInstanceState.ACTIVE.toString(), CloudInstanceState.STOPPING.toString()];
        if (instanceDb.status == CloudInstanceState.STOPPED && resource.status == "running") {
            this._dbService.updateInstanceStatus(id, CloudInstanceState.ACTIVE);
            instanceDb.status = CloudInstanceState.ACTIVE;
        } else if (runningStates.includes(instanceDb.status) && resource.status == "stopped") {
            this._dbService.updateInstanceStatus(id, CloudInstanceState.STOPPED);
            instanceDb.status = CloudInstanceState.STOPPED;
        }

        const node: string = resource.node;

        const networkUrl = `nodes/${node}/qemu/${id}/agent/network-get-interfaces`;
        try {
            const networkResult = (await this._client.get(networkUrl)).data.data.result;
            var vmIP = networkResult[1]["ip-addresses"].find(addr => addr["ip-address-type"] == "ipv4")["ip-address"];
            if (instanceDb.status != CloudInstanceState.STOPPING.toString()) {
                this._dbService.updateInstanceStatus(id, CloudInstanceState.ACTIVE);
                instanceDb.status = CloudInstanceState.ACTIVE;
            }
        } catch (error) {
            vmIP = '';
        }

        const firewallUrl = `nodes/${node}/qemu/${id}/firewall/rules`;
        const firewallResult = (await this._client.get(firewallUrl)).data.data;
        const securityGroups = firewallResult.filter(fw => fw.type == "group").map(fw => fw.action);

        return {
            id: "" + resource.vmid,
            name: resource.name || resource.id,
            state: CloudInstanceState[instanceDb.status],
            flavourId: instanceDb.flavourId,
            imageId: instanceDb.imageId,
            createdAt: instanceDb.createdAt,
            address: vmIP,
            securityGroups: securityGroups,
            fault: null
        };
    }

    /**
     * Get a list of instances
     */
    async instances(): Promise<Instance[]> {
        logger.info(`Fetching instances`);
        const resourcesUrl = 'cluster/resources';
        const resourceList: Array<any> = await (await this._client.get(resourcesUrl, { params: { type: 'vm' } })).data.data.filter(x => x.status == "running");
        const instancesDb: any[] = await this._dbService.getInstances();
        const vmIPs = await Promise.all(resourceList.map(async resource => {
            const networkUrl = `nodes/${resource.node}/${resource.id}/agent/network-get-interfaces`;
            try {
                const networkResult = (await this._client.get(networkUrl)).data.data.result;
                return [resource.vmid, networkResult[1]["ip-addresses"].find(addr => addr["ip-address-type"] == "ipv4")["ip-address"]];
            } catch (e) {
                return [resource.id, ""];
            }
        }));

        const vmIPs2 = vmIPs.reduce((array, item): Object => {
            array[item[0]] = item[1];
            return array;
        }, {});
        return resourceList.map<Instance>((resource): Instance => {
            const instanceDb = instancesDb.find(x => x.id == resource.vmid as string);
            const vmIP = vmIPs2[resource.vmid];
            const securityGroups = [];
            return {
                id: resource.vmid,
                name: resource.id,
                state: resource.status,
                flavourId: instanceDb.flavourId,
                imageId: instanceDb.imageId,
                createdAt: instanceDb.createdAt,
                address: vmIP,
                securityGroups: securityGroups,
                fault: undefined
            };
        });
    }

    /**
     * Get a list of instance identifiers
     */
    async instanceIdentifiers(): Promise<string[]> {
        logger.info(`Fetching instance identifiers`);
        const resourcesUrl = 'cluster/resources';
        const resourceList: Array<any> = await (await this._client.get(resourcesUrl, { params: { type: 'vm' } })).data.data;
        return resourceList.map(resource => resource.vmid);
    }

    /**
     * Get the security groups for a given instance identifier
     * @param id the instance identifier
     */
    async securityGroupsForInstance(id: string): Promise<string[]> {
        logger.info(`Fetching security groups for instance: ${id}`);
        const resource = await this._getResourceForId(id);

        const firewallUrl = `nodes/${resource.node}/qemu/${id}/firewall/rules`;
        const firewallResult = (await this._client.get(firewallUrl)).data.data;
        const securityGroups = firewallResult.filter(fw => fw.type == "group").map(fw => fw.action);
        return securityGroups;
    }

    /**
     * Remove a security for a given instance identifier
     * @param id the instance identifier
     * @param name the security group name
     */
    async removeSecurityGroupFromInstance(id: string, name: string): Promise<void> {
        logger.info(`Removing security group ${name} for instance: ${id}`);
        const resource = await this._getResourceForId(id);

        const firewallUrl = `nodes/${resource.node}/qemu/${id}/firewall/rules`;
        const firewallResult = (await this._client.get(firewallUrl)).data.data;

        const ruleId = firewallResult.find(fw => fw.type == "group" && fw.action == name).pos;
        const ruleUrl = `nodes/${resource.node}/qemu/${id}/firewall/rules/${ruleId}`;
        return await this._client.delete(ruleUrl);
    }

    /**
     * Add a security for a given instance identifier
     * @param id the instance identifier
     * @param name the security group name
     */
    async addSecurityGroupForInstance(id: string, name: string): Promise<void> {
        logger.info(`Adding security group ${name} for instance: ${id}`);
        const resource = await this._getResourceForId(id);

        const firewallUrl = `nodes/${resource.node}/qemu/${id}/firewall/rules`;
        return await this._client.post(firewallUrl, { action: name, type: "group" });
    }

    /**
     * Create a new instance
     * @param name the name of the instance
     * @param imageId the proxmox image identifier
     * @param flavourId the proxmox flavour identifier
     * @param securityGroups a list of proxmox security groups
     * @param metadata the cloud init metadata
     * @param bootCommand the boot command to use when starting the instance
     */
    async createInstance(name: string,
        imageId: string,
        flavourId: string,
        securityGroups: string[],
        metadata: Map<string, string>,
        bootCommand: string): Promise<string> {
        logger.info(`Creating new instance: ${name}`);

        const flavour = await this._dbService.getFlavour(flavourId);
        const image = (await this.getImageInternal(imageId));

        const node = await this._selectBestNode(flavour.cpus, flavour.ram);

        const vmId = (await this._client.get('cluster/nextid')).data.data;

        await this._dbService.createInstance(vmId, name, flavourId, imageId, metadata, bootCommand);

        // send infos to metadata server
        axios.post(APPLICATION_CONFIG().proxmox.metadataServer + vmId,
            {
                metadata: yaml.dump({
                    meta: metadata,
                    project_id: APPLICATION_CONFIG().proxmox.projectId
                }),
                userdata: "#cloud-config\n" + yaml.dump({
                    runcmd: [bootCommand],
                    fqdn: `${APPLICATION_CONFIG().proxmox.instancePrefix.toLowerCase()}-${vmId}`
                })
            }).catch(error => {
                console.error(`Cannot send metadata: ${error}`);
                throw new Error(`Cannot send metadata: ${error}`);
            }).then(() => console.log('metadata sent'));

        // need to get template node
        const templateNode = image.node;
        const cloneUrl = `nodes/${templateNode}/${image.id}/clone`;
        const cloneRes = (await this._client.post(cloneUrl, { newid: vmId, name: name, target: node })).data.data;

        let vmCloned: boolean = false;

        // This one need to be synchronous (can't configure before clone is finished), we can't use checkTask
        do {
            const taskRes = (await this._client.get(`cluster/tasks`)).data.data;
            const task = taskRes.find(t => t.upid == cloneRes);
            if (task.status == 'OK') {
                vmCloned = true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        } while (!vmCloned);

        const newInstanceUrl = `nodes/${node}/qemu/${vmId}/config`;
        await this._client.post(newInstanceUrl, {
            agent: 'enabled=1',
            cores: flavour.cpus,
            memory: flavour.ram * 1024,
            ostype: 'l26',
            bootdisk: 'scsi0',
            serial0: 'socket',
            smbios1: `base64=1,serial=${Buffer.from('ds=nocloud-net;s=' + APPLICATION_CONFIG().proxmox.metadataServer + vmId + '/').toString('base64')}`,
        });

        securityGroups.forEach((group) => {
            const firewallRuleUrl = `nodes/${node}/qemu/${vmId}/firewall/rules`;
            this._client.post(firewallRuleUrl, {
                action: group,
                type: "group",
                comment: "Security group from VISA"
            });
        })

        this.startInstance(vmId);

        return vmId;
    }

    /**
     * Shutdown an instance
     * @param id the instance identifier
     */
    async shutdownInstance(id: string): Promise<void> {
        logger.info(`Shutting down instance: ${id}`);

        const resource = await this._getResourceForId(id);

        this._dbService.updateInstanceStatus(id, CloudInstanceState.STOPPING);
        const shutdownURL = `nodes/${resource.node}/qemu/${id}/status/shutdown`;
        this._client.post(shutdownURL);
    }

    /**
     * Hard stop an instance
     * @param id the instance identifier
     */
    async stopInstance(id: string): Promise<void> {
        logger.info(`Stopping instance: ${id}`);

        const resource = await this._getResourceForId(id);

        this._dbService.updateInstanceStatus(id, CloudInstanceState.STOPPING);
        const stopURL = `nodes/${resource.node}/qemu/${id}/status/stop`;
        this._client.post(stopURL);
    }

    /**
     * Start an instance
     * @param id the instance identifier
     */
    async startInstance(id: string): Promise<void> {
        logger.info(`Starting instance: ${id}`);

        const resource = await this._getResourceForId(id);
        const vm = await this._dbService.getInstance(id);

        if (vm.startCount < APPLICATION_CONFIG().proxmox.maxStartRetry) {
            this._dbService.setStartCount(resource.id, vm.startCount + 1);
        } else {
            const errorMessage = `Start of vm ${id} failed after ${APPLICATION_CONFIG().proxmox.maxStartRetry} retries`;
            logger.error(errorMessage);
            throw new HttpException(errorMessage, 500);
        }

        logger.info(`Starting vm ${id}: try number ${vm.startCount + 1}`)
        const startURL = `nodes/${resource.node}/qemu/${id}/status/start`;
        this._client.post(startURL);
    }

    /**
     * Reboot an instance
     * @param id the instance identifier
     */
    async rebootInstance(id: string): Promise<void> {
        logger.info(`Rebooting instance: ${id}`);

        const resource = await this._getResourceForId(id);

        this._dbService.updateInstanceStatus(id, CloudInstanceState.REBOOTING);
        const startURL = `nodes/${resource.node}/qemu/${id}/status/reboot`;
        const rebootRes = (await this._client.post(startURL)).data.data;
        this._checkTask(rebootRes, () => {
            this._dbService.updateInstanceStatus(id, CloudInstanceState.ACTIVE)
        });
    }

    /**
     * Delete an instance
     * @param id the instance identifier
     */
    async deleteInstance(id: string): Promise<void> {
        logger.info(`Deleting instance: ${id}`);

        const resource = await this._getResourceForId(id);

        if (resource.status == "running") {
            return this.stopInstance(id);
        }
        const deleteURL = `nodes/${resource.node}/qemu/${id}`;
        await this._client.delete(deleteURL);
        this._dbService.deleteInstance(id);

        // send infos to metadata server
        axios.delete(APPLICATION_CONFIG().proxmox.metadataServer + id);
    }

    /**
     * Get a list of images
     */
    async images(): Promise<Image[]> {
        logger.info(`Fetching images`);
        const templates = (await this._client.get('cluster/resources')).data.data.filter(x => x.template == 1);

        return templates.map((x): Image => {
            return {
                id: x.id.split('/')[1],
                name: x.name,
                size: x.maxdisk,
                createdAt: ''
            }
        });
    }

    /**
     * Get an image
     * @param id the image identifier
     */
    async image(id: string): Promise<Image> {
        logger.info(`Fetching image: ${id}`);
        const image = await this.getImageInternal(id);
        return {
            id: image.id.split('/')[1],
            name: image.name,
            size: image.maxdisk,
            createdAt: ''
        };
    }

    /**
     * Return unformated image
     */
    async getImageInternal(id: string): Promise<any> {
        const imageRes = (await this._client.get('cluster/resources')).data.data;
        const image = imageRes.find(x => x.template == 1 && x.id == `qemu/${id}`);
        if (!image) {
            throw new Error(`Cannot find image ${id} in cluster`);
        }
        return image;
    }

    /**
     * Get a list of flavours
     */
    async flavours(): Promise<Flavour[]> {
        logger.info(`Fetching flavours`);
        const flavours = await this._dbService.getFlavours();
        return flavours.map((x): Flavour => {
            return {
                id: x.id,
                name: x.name,
                cpus: x.cpus,
                disk: x.disk,
                ram: Math.round(x.ram * 1024)
            }
        });
    }

    /**
     * Get a flavour
     * @param id the flavour identifier
     */
    async flavour(id: string): Promise<Flavour> {
        logger.info(`Fetching flavour: ${id}`);
        const image = await this._dbService.getFlavour(id);
        return {
            id: image.id,
            name: image.name,
            cpus: image.cpus,
            disk: image.disk,
            ram: image.ram
        };
    }

    /**
     * Get the cloud metrics (i.e. memory used, number of instances etc.)
     */
    async metrics(): Promise<Metrics> {
        logger.info(`Fetching metrics`);
        const nodesUrl = 'nodes';
        const nodes: any[] = (await this._client.get(nodesUrl)).data.data;


        const resourcesUrl = 'cluster/resources';
        const resourceList: [any] = (await this._client.get(resourcesUrl, { params: { type: 'vm' } })).data.data;

        const res = nodes.reduce((prev, current) => {
            current.maxcpu += prev.maxcpu;
            current.maxmem += prev.maxmem;
            current.maxdisk += prev.maxdisk;
            current.cpu += prev.cpu;
            current.mem += prev.mem;
            current.disk += prev.disk;
            return current
        })
        return {
            maxTotalRamSize: Math.round(res.maxmem / 1024 / 1024),
            maxTotalCores: res.maxcpu,
            maxTotalInstances: 0, // Not available
            totalCoresUsed: res.cpu,
            totalInstancesUsed: resourceList.length,
            totalRamUsed: Math.round(res.mem / 1024 / 1024)
        };
    }

    /**
     * Get all available security groups
     */
    async securityGroups(): Promise<string[]> {
        logger.info(`Fetching all available security groups`);
        const securityGroupsUrl = 'cluster/firewall/groups';
        const securityGroups: [any] = await (await this._client.get(securityGroupsUrl)).data.data;

        return securityGroups.map((x): string => x.group);
    }

}
