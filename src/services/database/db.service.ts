import { singleton } from "tsyringe";
import { Flavour, Vm } from "../../models";
import { Connection, createConnection } from "typeorm";
import yaml from "js-yaml";

@singleton()
export class DBService {

    private readonly _connection: Connection;

    constructor(
    ) {
        createConnection().then((conn) => {
            // @ts-ignore
            this._connection = conn;
        });
    }

    public async getFlavours(): Promise<Flavour[]> {
        const repo = this._connection.getRepository(Flavour);
        return repo.find();
    }

    public async getFlavour(id: string): Promise<Flavour> {
        const repo = this._connection.getRepository(Flavour);
        return repo.findOne(id);
    }

    public async createFlavour(id, name, cpus, disk, ram) {
        const repo = this._connection.getRepository(Flavour);
        const flavour = new Flavour();
        flavour.id = id;
        flavour.name = name;
        flavour.cpus = cpus;
        flavour.disk = disk;
        flavour.ram = ram;
        repo.insert(flavour);
    }

    public async deleteFlavour(id) {
        const repo = this._connection.getRepository(Flavour);
        repo.delete(id);
    }

    public async getInstance(id: string): Promise<Vm> {
        const repo = this._connection.getRepository(Vm);
        return repo.findOne(id);
    }

    public async getInstances(): Promise<Vm[]> {
        const repo = this._connection.getRepository(Vm);
        return repo.find();
    }

    public async createInstance(id, name, flavourId, imageId, metadata, bootCommand) {
        const repo = this._connection.getRepository(Vm);
        let vm = new Vm();
        vm.id = id;
        vm.name = name;
        vm.flavourId = flavourId;
        vm.imageId = imageId;
        vm.metadata = yaml.dump({meta:metadata});
        vm.bootCommand = bootCommand;
        repo.save(vm);
    }

    public async deleteInstance(id) {
        const repo = this._connection.getRepository(Vm);
        repo.delete(id);
    }

    public async updateInstanceStatus(id, status) {
        const repo = this._connection.getRepository(Vm);
        repo.update(id, {status: status});
    }

    public async setStartCount(id: string, count: number) {
        const repo = this._connection.getRepository(Vm);
        repo.update(id, {startCount: count})
    }
}