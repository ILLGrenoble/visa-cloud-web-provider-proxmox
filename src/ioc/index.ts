import {container} from 'tsyringe';
import {ProxmoxService} from "../services";
import {APPLICATION_CONFIG} from "../application-config";
import { DBService } from '../services/database/db.service';

container.register<ProxmoxService>(ProxmoxService, {
    useValue: new ProxmoxService(
        APPLICATION_CONFIG().proxmox.proxmoxEndpoint,
        APPLICATION_CONFIG().proxmox.timeout,
        APPLICATION_CONFIG().proxmox.user + '=' + APPLICATION_CONFIG().proxmox.password,
        container.resolve(DBService),
        APPLICATION_CONFIG().proxmox.coeff
    )
});
export {container};
