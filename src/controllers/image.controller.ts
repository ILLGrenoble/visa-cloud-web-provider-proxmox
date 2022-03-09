import {NextFunction, Request, Response} from "express";
import {singleton} from "tsyringe";
import {ProxmoxService} from "../services";
import { DBService } from "../services/database/db.service";
import { logger } from "../utils";

@singleton()
export class ImageController {

    private readonly _proxmox: ProxmoxService;
    private readonly _db: DBService;

    /**
     * Create a new image controller
     * @param proxmox the proxmox API http client
     */
    constructor(readonly proxmox: ProxmoxService, readonly dbService: DBService) {
        this._proxmox = proxmox;
        this._db = dbService;
    }

    /**
     * Get a list of all images
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async all(request: Request, response: Response, next: NextFunction) {
        try {
            const images = await this._proxmox.images();
            response.json(images);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get an image for a given identifier
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async get(request: Request, response: Response, next: NextFunction) {
        try {
            const {id} = request.params;
            const image = await this._proxmox.image(id);
            response.json(image);
        } catch (error) {
            logger.error(error.stack);
            next(error);
        }
    }

}
