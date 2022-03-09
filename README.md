# VISA Cloud Web Provider for Proxmox

This project contains the source code for an implementation of using Proxmox as a *Web Cloud Provider* in VISA.

VISA (Virtual Infrastructure for Scientific Analysis) makes it simple to create compute instances on facility cloud infrastructure to analyse your experimental data using just your web browser.

See the [User Manual](https://visa.readthedocs.io/en/latest/) for deployment instructions and end user documentation.

## Description

The VISA Cloud Web Provider Proxmox providers a RESTful web service for interacting with the [Proxmox API](https://pve.proxmox.com/pve-docs/api-viewer/index.html). VISA can be configured to use a *web provider* that will contact your cloud provider of choice.

### Building the application

```
npm install
```

### Running the server
```
npm start
```

The application requires environment variables to be set. These can be in a `.env` file at the root of the project. Details of the environment variables are given below.


### Environment variables

The following environment variables are used to configure VISA Cloud Web Provider for Proxmox and can be placed in a `.env` file:

| Environment variable | Default value | Usage |
| ---- | ---- | ---- |
| VISA_WEB_PROVIDER_PROXMOX_SERVER_PORT | 4000 | The port on which to run the server |
| VISA_WEB_PROVIDER_PROXMOX_SERVER_HOST | localhost | The hostname on which the server is listening on |
| VISA_WEB_PROVIDER_PROXMOX_SERVER_AUTH_TOKEN |  | The expected `x-auth-token` value |
| VISA_WEB_PROVIDER_PROXMOX_LOG_LEVEL | 'info' | Application logging level |
| VISA_WEB_PROVIDER_PROXMOX_LOG_TIMEZONE |  | The timezone for the formatting the time in the application log |
| VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_HOST |  | The syslog host (optional) |
| VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_PORT |  | The syslog port (optional) |
| VISA_WEB_PROVIDER_PROXMOX_LOG_SYSLOG_APP_NAME |  | The syslog application name (optional) |
| VISA_WEB_PROVIDER_PROXMOX_ENDPOINT |  | URL of proxmox API (ends with `/api2/json/`)
| VISA_WEB_PROVIDER_PROXMOX_TIMEOUT |  | Timeout of HTTP calls to proxmox
| VISA_WEB_PROVIDER_PROXMOX_USER |  | Username of proxmox API token (user@realm!tokenname)
| VISA_WEB_PROVIDER_PROXMOX_PASSWORD |  | Proxmox API token password
| VISA_WEB_PROVIDER_PROXMOX_SELECT_COEFF | 4294967296 | Ratio of CPU to ram for load balancing
| VISA_WEB_PROVIDER_PROXMOX_METADATA_SERVER |  | URL of the metadata server (must be accessible from the VM)
| VISA_WEB_PROVIDER_PROXMOX_PROJECT_ID |  | Unique ID that you can choose and will be passe to the instance. It can be used to distinguish between dev/preprod/prod env.
| VISA_CLOUD_SERVER_NAME_PREFIX | 'VISA_INSTANCE' | Prefix for instance name in proxmox
| VISA_CLOUD_SERVER_MAX_START_RETRY | 10 | Proxmox sometime return that a clone is finished before it's true, and so we try to start it too early. This parameter allows to retry multiple time before deciding that there's a problem.
| TYPEORM_HOST |  | Postgres host for connector database
| TYPEORM_USERNAME |  | Postgres username for connector database
| TYPEORM_PASSWORD |  | Postgres password for connector database
| TYPEORM_DATABASE |  | Postgres database for connector database
| TYPEORM_SCHEMA |  | Postgres schema for connector database

## Flavours

There is no flavour in proxmox, thus you need to manually create them in the `flavour` table of the proxmox connector database.

## Acknowledgements

<img src="https://github.com/panosc-eu/panosc/raw/master/Work%20Packages/WP9%20Outreach%20and%20communication/PaNOSC%20logo/PaNOSClogo_web_RGB.jpg" width="200px"/> 

VISA has been developed as part of the Photon and Neutron Open Science Cloud (<a href="http://www.panosc.eu" target="_blank">PaNOSC</a>)

<img src="https://github.com/panosc-eu/panosc/raw/master/Work%20Packages/WP9%20Outreach%20and%20communication/images/logos/eu_flag_yellow_low.jpg"/>

PaNOSC has received funding from the European Union's Horizon 2020 research and innovation programme under grant agreement No 823852.
