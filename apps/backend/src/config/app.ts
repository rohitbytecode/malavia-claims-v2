import packageJson from '../../package.json' with { type: "json" };

export const APP_CONFIG = {
    ORG_NAME: "Malavia Hospital",
    APP_NAME: "Malavia Claims Management",
    DESCRIPTION: "Internal hospital cashless claim management system",
    VERSION: packageJson.version,
    API_VERSION: "v1",
};