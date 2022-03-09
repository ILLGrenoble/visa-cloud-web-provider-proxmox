import "reflect-metadata";
import { logger } from "./utils";
import express from 'express'
import * as http from 'http';
import {APPLICATION_CONFIG} from './application-config';
import {container} from "./ioc";
import { CloudInitController } from "./controllers";

export class Application {

    private _server: http.Server;

    async start(): Promise<null> {
        if (!this._server) {
            // Start the application
            logger.info('Starting application');

            const app = express();
            app.use(express.json());

            const ciRouter = express.Router();
            ciRouter.get('/:id/user-data', (req, res, next) => container.resolve(CloudInitController).user(req, res, next));
            ciRouter.get('/:id/meta-data', (req, res, next) => container.resolve(CloudInitController).meta(req, res, next));
            ciRouter.get('/:id/vendor-data', (req, res, next) => res.end());
            ciRouter.post('/:id', (req, res, next) => container.resolve(CloudInitController).register(req, res, next));
            ciRouter.delete('/:id', (req, res, next) => container.resolve(CloudInitController).unregister(req, res, next))
            app.use('/ci', ciRouter);

            const port = APPLICATION_CONFIG().server.port;
            const host = APPLICATION_CONFIG().server.host;
            this._server = app.listen(port, host);
            logger.info(`Application started (listening on ${host}:${port})`);
        }

        return null;
    }

    async stop(): Promise<null> {
        if (this._server) {
            logger.info('Stopping http server...');
            this._server.close();

            logger.info('... http server stopped');
            this._server = null;
        }

        return null;
    }
}