import {NextFunction, Request, Response} from "express";
import {singleton} from "tsyringe";
import {ProxmoxService} from "../services";

@singleton()
export class MetricsController {

    private readonly _proxmox: ProxmoxService;

    /**
     * Create a new image controller
     * @param proxmox the promox API http client
     */
    constructor(readonly proxmox: ProxmoxService) {
        this._proxmox = proxmox;
    }

    /**
     * Get a list of metrics
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async all(request: Request, response: Response, next: NextFunction) {
        try {
            const metrics = await this._proxmox.metrics();
            response.json(metrics);
        } catch (error) {
            next(error);
        }
    }


}
