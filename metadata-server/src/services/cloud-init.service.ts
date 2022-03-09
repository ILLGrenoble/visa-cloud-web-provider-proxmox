import { singleton } from "tsyringe";
import {logger} from "../utils";
import { open, Database } from 'sqlite';
import sqlite3 from "sqlite3";
import { APPLICATION_CONFIG } from "../application-config";

interface VM {
    id: string;
    userData: string;
    metaData: string;
}


@singleton()
export class CloudInitService {
    private readonly _db: Database;
    private readonly _dbPromise: Promise<Database>;

    constructor () {
        this._dbPromise = open({filename: APPLICATION_CONFIG().database.path, driver: sqlite3.Database});
        this._dbPromise.then((res) => {
            // @ts-ignore
            this._db = res;
        });

    }

    async getUserData(id: string) {
        logger.info(`Get user data for vm ${id}`);
        const userData = (await this._db.get<VM>('SELECT user_data FROM vm WHERE id=?', id)).userData;
        return userData;
    }

    async getMetaData(id: string) {
        logger.info(`Get meta data for vm ${id}`);
        await this._dbPromise; 
        const metaData = (await this._db.get<VM>('SELECT meta_data FROM vm WHERE id=?', id)).metaData;
        return metaData;
    }

    async deleteVM(id: string) {
        logger.info(`Deleting vm ${id}`);
        await this._dbPromise; 
        await this._db.run('DELETE FROM vm WHERE id=?', id);
    }

    async saveVM(id: string, metadata: string, userdata: string) {
        logger.info(`Inserting vm ${id} in database`);
        await this._dbPromise; 
        await this._db.run('INSERT INTO vm (id, user_data, meta_data) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET user_data=?2, meta_data=?3', id, userdata, metadata);
    }
}