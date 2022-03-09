export class ApplicationConfig {

    server: {
        port: number,
        host: string
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

    database: {
        path: string;
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
                port: process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_PORT == null ? 4001 : +process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_PORT,
                host: process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_HOST == null ? 'localhost' : process.env.VISA_WEB_PROVIDER_PROXMOX_SERVER_HOST
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
            database: {
                path: process.env.TYPEORM_DATABASE
            }
        };
    }
    return applicationConfig;
}
