export class ApplicationConfig {

    server: {
        port: number,
        host: string,
        authToken: string
    };

    logging: {
        level: string;
        timezone: string;
        syslog: {
            host: string,
            port: number,
            appName: string
        }
    };

    proxmox: {
        proxmoxEndpoint: string;
        timeout: number;
        user: string;
        password: string;
        coeff: number;
        metadataServer: string;
        projectId: string;
        instancePrefix: string;
        maxStartRetry: number;
    };

    database: {
        host: string,
        port: number,
        database: string,
        schema: string,
        username: string,
        password: string,
    }

    constructor(data?: Partial<ApplicationConfig>) {
        Object.assign(this, data);
    }
}

let applicationConfig: ApplicationConfig;

export function APPLICATION_CONFIG(): ApplicationConfig {
    if (applicationConfig == null) {
        applicationConfig = {
            server: {
                port: process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_PORT == null ? 4000 : +process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_PORT,
                host: process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_HOST == null ? 'localhost' : process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_HOST,
                authToken: process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_AUTH_TOKEN
            },
            logging: {
                level: process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_LEVEL == null ? 'info' : process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_LEVEL,
                timezone: process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_TIMEZONE,
                syslog: {
                    host: process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_HOST,
                    port: process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_PORT == null ? null : +process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_PORT,
                    appName: process.env.VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_APP_NAME
                }
            },
            proxmox: {
                proxmoxEndpoint: process.env.VISA_WEB_PROVIDER_PROXMOX_ENDPOINT,
                timeout: +process.env.VISA_WEB_PROVIDER_PROXMOX_TIMEOUT,
                user: process.env.VISA_WEB_PROVIDER_PROXMOX_USER,
                password: process.env.VISA_WEB_PROVIDER_PROXMOX_PASSWORD,
                coeff: process.env.VISA_WEB_PROVIDER_PROXMOX_SELECT_COEFF == null ? 1024*1024*1024*4 : + process.env.VISA_WEB_PROVIDER_PROXMOX_SELECT_COEFF,
                metadataServer: process.env.VISA_WEB_PROVIDER_PROXMOX_METADATA_SERVER,
                projectId: process.env.VISA_WEB_PROVIDER_PROXMOX_PROJECT_ID,
                instancePrefix: process.env.VISA_CLOUD_SERVER_NAME_PREFIX == null ? 'VISA_INSTANCE' : process.env.VISA_CLOUD_SERVER_NAME_PREFIX,
                maxStartRetry: process.env.VISA_CLOUD_SERVER_MAX_START_RETRY == null ? 10 : parseInt(process.env.VISA_CLOUD_SERVER_MAX_START_RETRY)
            },
            database: {
                host: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_HOST,
                port: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_PORT == null ? 5432 : +process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_PORT,
                database: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_DATABASE,
                schema: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_SCHEMA,
                username: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_USERNAME,
                password: process.env.VISA_WEB_PROVIDER_PROXMOX_CONNECTOR_PASSWORD,
            },
        };
    }
    return applicationConfig;
}
