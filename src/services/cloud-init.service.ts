import { singleton } from "tsyringe";
import { DBService } from "./database/db.service";
import {logger} from "../utils";
import yaml from "js-yaml";


@singleton()
export class CloudInitService {
    private readonly _db: DBService;

    constructor (readonly dbService: DBService) {
        this._db = dbService;
    }

    async getUserData(id: string) {
        logger.info(`Get user data for vm ${id}`);
        const instance = await this._db.getInstance(id);
        const userData = {runcmd: [instance.bootCommand]}
        return "#cloud-config\n" + yaml.dump(userData);
    }

    async getMetaData(id: string) {
        logger.info(`Get meta data for vm ${id}`);
        const instance = await this._db.getInstance(id);
        return `${instance.metadata}`;
    }
}