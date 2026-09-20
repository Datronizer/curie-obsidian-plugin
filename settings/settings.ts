export interface CurieSettings
{
    apiBaseUrl: string;
    vaultId: string;
    deviceId: string | null;
    deviceToken: string | null;
    setupKey: string;
    userEmail?: string;
    vaultName?: string;
}

export const DEFAULT_SETTINGS: CurieSettings = {
    apiBaseUrl: "http://localhost:3000",
    vaultId: "",
    deviceId: null,
    deviceToken: null,
    setupKey: "curie-dev-master-key-secret",
    userEmail: "",
    vaultName: "",
};
