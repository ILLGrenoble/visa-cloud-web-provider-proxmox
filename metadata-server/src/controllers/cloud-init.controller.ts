import { NextFunction, Request, Response } from "express";
import {singleton} from "tsyringe";
import { CloudInitService } from "../services/cloud-init.service";

@singleton()
export class CloudInitController {
    private readonly _ci: CloudInitService;

    constructor (readonly ciService: CloudInitService) {
        this._ci = ciService;
    }

    public async user(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const result = await this._ci.getUserData(id);
            response.send(result);
        } catch (error) {
            next(error);
        }
    }

    public async meta(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const result = await this._ci.getMetaData(id);
            response.send(result);
        } catch (error) {
            next(error);
        }
    }

    public async register(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const metadata = request.body.metadata;
            const userdata = request.body.userdata;
            const result = await this._ci.saveVM(id, metadata, userdata);
            response.send(result);
        } catch (error) {
            next(error);
        }
    }

    public async unregister(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const result = await this._ci.deleteVM(id);
            response.send(result);
        } catch (error) {
            next(error);
        }
    }
}