import {NextFunction, Request, Response} from "express";
import {singleton} from "tsyringe";
import {ProxmoxService} from "../services";
import { DBService } from "../services/database/db.service";

@singleton()
export class FlavourController {

    private readonly _proxmox: ProxmoxService;
    private readonly _db: DBService;

    /**
     * Create a new flavour controller
     * @param proxmox the proxmox API http client
     */
    constructor(readonly proxmox: ProxmoxService, readonly dbService: DBService) {
        this._proxmox = proxmox;
        this._db = dbService;
    }

    /**
     * Get a list of all flavours
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async all(request: Request, response: Response, next: NextFunction) {
        try {
            const flavours = await this._proxmox.flavours();
            response.json(flavours);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a flavour for a given identifier
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async get(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const flavor = await this._proxmox.flavour(id);
            response.json(flavor);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new flavour
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async new(request: Request, response: Response, next: NextFunction) {
        try {
            const {id, name, cpus, disk, ram} = request.params;
            await this._db.createFlavour(id, name, cpus, disk, ram);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a flavour
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async delete(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            await this._db.deleteFlavour(id);
        } catch (error) {
            next(error);
        }
    }

}
