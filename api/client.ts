import { requestUrl } from "obsidian";
import { VaultDto } from "./dtos/vault";
import { DeviceDto } from "./dtos/device.dto";

export class CurieApiClient
{
    constructor(private server: Server) { }

    //#region Device Operations
    async registerDevice(name: string): Promise<{ id: string }>
    {
        return await this.server.post("/devices/register", { name });
    }
    //#endregion


    //#region Vault Operations
    async getVaultList(): Promise<VaultDto[]>
    {
        return await this.server.get(`/vaults/`);
    }

    async getVaultInfo(vaultId: string): Promise<VaultDto>
    {
        return await this.server.get(`/vaults/${vaultId}`);
    }

    async createVault(name: string): Promise<{ id: string }>
    {
        return await this.server.post("/vaults/", { name });
    }
    //#endregion


    //#region Sync Operations
    async getDiff(deviceId: string, vaultId: string, filePath: string, clientHash: string): Promise<{ action: "noop" | "pull" | "push" }>
    {
        return await this.server.post(`/sync/diff`, {
            deviceId,
            vaultId,
            path: filePath,
            clientHash
        });
    }
    //#endregion


    //#region Heartbeat
    async sendHeartbeat(deviceId: string): Promise<DeviceDto>
    {
        return await this.server.post("/devices/heartbeat", { deviceId });
    }
    //#endregion


    //#region File Operations
    async getFileHash(fileId: string): Promise<{ hash: string }>
    {
        return await this.server.get(`/files/${fileId}/hash`);
    }

    async uploadFile(fileId: string, content: ArrayBuffer): Promise<void>
    {
        await this.server.post(`/files/${fileId}/upload`, { content });
    }

    async downloadFile(fileId: string): Promise<{ content: ArrayBuffer }>
    {
        return await this.server.get(`/files/${fileId}/download`);
    }

    async upsertFile(vaultId: string, path: string, content: string, hash: string): Promise<void>
    {
        await this.server.put(`/vaults/${vaultId}/files/`, {
            path,
            content,
            hash
        });
    }
    //#endregion
}

export class Server
{
    constructor(private baseUrl: string) { }

    async post<T>(path: string, body: any): Promise<T>
    {
        const res = await requestUrl({
            url: `${this.baseUrl}${path}`,
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });
        console.log(res);

        return res.json as T;
    }

    async put<T>(path: string, body: any): Promise<T>
    {
        const res = await requestUrl({
            url: `${this.baseUrl}${path}`,
            method: "PUT",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" }
        });

        return res.json as T;
    }

    async get<T>(path: string): Promise<T>
    {
        const res = await requestUrl({
            url: `${this.baseUrl}${path}`,
            method: "GET"
        });
        console.log(res)

        return res.json as T;
    }
    //9f0cfcc8-da3e-4a0a-a485-11f8c9378264
}