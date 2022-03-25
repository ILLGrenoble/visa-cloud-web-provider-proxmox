import { singleton } from "tsyringe";
import {logger} from "../utils";
import { APPLICATION_CONFIG } from "../application-config";
import { Connection, createConnection, getRepository} from 'typeorm';
import { VM } from "../models";
import { HttpException } from "../exceptions";


@singleton()
export class CloudInitService {
    private readonly _connectionPromise: Promise<Connection>;
    private _connection: Connection;

    constructor () {
        this._connectionPromise = createConnection({
            type: "postgres",
            host: APPLICATION_CONFIG().database.host,
            port: APPLICATION_CONFIG().database.port,
            database: APPLICATION_CONFIG().database.database,
            schema: APPLICATION_CONFIG().database.schema,
            username: APPLICATION_CONFIG().database.username,
            password: APPLICATION_CONFIG().database.password,
            entities: [VM],
            synchronize: true,
            logging: true
        });
        this._connectionPromise.then(connection => this._connection = connection);
    }

    async getUserData(id: string) {
        logger.info(`Get user data for vm ${id}`);
        await this._connectionPromise;
        const repository = getRepository(VM);
        const vm = await repository.findOne(id);
        if (!vm) {
            throw new HttpException(`Instance ${id} not found`, 404);
        }
        return vm.userData;
    }

    async getMetaData(id: string) {
        logger.info(`Get meta data for vm ${id}`);
        await this._connectionPromise;
        const repository = getRepository(VM);
        const vm = await repository.findOne(id);
        if (!vm) {
            throw new HttpException(`Instance ${id} not found`, 404);
        }
        return vm.metaData;
    }

    async deleteVM(id: string) {
        logger.info(`Deleting vm ${id}`);
        await this._connectionPromise;
        const repository = getRepository(VM);
        await repository.delete(id);
    }

    async saveVM(id: string, metadata: string, userdata: string) {
        logger.info(`Inserting vm ${id} in database`);
        await this._connectionPromise;
        const repository = getRepository(VM);
        const newVm = new VM();
        newVm.id = id;
        newVm.metaData = metadata;
        newVm.userData = userdata;
        repository.save(newVm);
    }
}