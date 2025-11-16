export interface CurieSettings
{
    apiBaseUrl: string;
    vaultId: string;
    deviceId: string | null;
}

export const DEFAULT_SETTINGS: CurieSettings = {
    apiBaseUrl: "http://localhost:3000",
    vaultId: "",
    deviceId: null
};
