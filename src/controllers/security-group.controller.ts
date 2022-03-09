import {NextFunction, Request, Response} from "express";
import {singleton} from "tsyringe";
import {ProxmoxService} from "../services";

@singleton()
export class SecurityGroupController {

    private readonly _proxmox: ProxmoxService;

    /**
     * Create a new security group controller
     * @param proxmox the proxmox API http client
     */
    constructor(readonly proxmox: ProxmoxService) {
        this._proxmox = proxmox;
    }

    /**
     * Get a list of security groups
     * @param request the http request
     * @param response the http response
     * @param next the next middleware handler
     */
    public async all(request: Request, response: Response, next: NextFunction) {
        try {
            const groups = await this._proxmox.securityGroups();
            response.json(groups);
        } catch (error) {
            next(error);
        }
    }

}
