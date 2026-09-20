import { requestUrl } from "obsidian";
import { VaultDto } from "./dtos/vault";
import { DeviceDto } from "./dtos/device.dto";

export class CurieApiClient
{
    constructor(private server: Server) { }

    setToken(token: string | null)
    {
        this.server.setToken(token);
    }

    setBaseUrl(url: string)
    {
        this.server.setBaseUrl(url);
    }

    //#region Auth Operations
    async login(
        email: string,
        password: string,
        deviceName?: string
    ): Promise<{
        user: { id: string; name: string; email: string };
        device: { id: string; name: string; token: string };
        vaults: Array<{ id: string; name: string }>;
    }>
    {
        return await this.server.post("/auth/login", { email, password, deviceName });
    }
    //#endregion

    //#region Device Operations
    async registerDevice(name: string, setupKey?: string): Promise<{ id: string; token: string }>
    {
        const headers: Record<string, string> = {};
        if (setupKey)
        {
            headers["x-setup-key"] = setupKey;
        }

        return await this.server.post("/devices/register", { name }, headers);
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
    async getDiff(
        deviceId: string,
        vaultId: string,
        filePath: string,
        clientHash: string
    ): Promise<{ action: "noop" | "pull" | "push" | "conflict"; serverHash?: string }>
    {
        return await this.server.post(`/sync/diff`, {
            deviceId,
            vaultId,
            path: filePath,
            clientHash,
        });
    }
    //#endregion

    //#region Heartbeat
    async sendHeartbeat(deviceId: string): Promise<DeviceDto>
    {
        return await this.server.post("/devices/heartbeat", { deviceId });
    }
    //#endregion

    //#region File Content Operations
    async downloadFileContent(vaultId: string, path: string): Promise<{ content: string; hash?: string }>
    {
        const encodedPath = encodeURIComponent(path);
        const res = await requestUrl({
            url: `${this.server.getBaseUrl()}/vaults/${vaultId}/content?path=${encodedPath}`,
            method: "GET",
            headers: this.server.getAuthHeaders(),
        });

        return {
            content: res.text,
            hash: res.headers["x-curie-hash"],
        };
    }

    async uploadFileContent(
        vaultId: string,
        path: string,
        content: string,
        isConflict: boolean = false
    ): Promise<{ hash: string; size: number; conflictCopyPath?: string }>
    {
        const encodedPath = encodeURIComponent(path);
        const conflictFlag = isConflict ? "&conflict=true" : "";
        const res = await requestUrl({
            url: `${this.server.getBaseUrl()}/vaults/${vaultId}/content?path=${encodedPath}${conflictFlag}`,
            method: "PUT",
            body: content,
            headers: {
                ...this.server.getAuthHeaders(),
                "Content-Type": "text/markdown",
            },
        });

        return res.json as { hash: string; size: number; conflictCopyPath?: string };
    }

    async upsertFile(vaultId: string, path: string, content: string, hash: string): Promise<void>
    {
        await this.server.put(`/vaults/${vaultId}/files/`, {
            path,
            content,
            hash,
        });
    }
    //#endregion
}

export class Server
{
    private token: string | null = null;

    constructor(private baseUrl: string) { }

    setToken(token: string | null)
    {
        this.token = token;
    }

    setBaseUrl(url: string)
    {
        this.baseUrl = url.replace(/\/+$/, "");
    }

    getBaseUrl(): string
    {
        return this.baseUrl.replace(/\/+$/, "");
    }

    getAuthHeaders(): Record<string, string>
    {
        const headers: Record<string, string> = {};
        if (this.token)
        {
            headers["Authorization"] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async post<T>(path: string, body: unknown, customHeaders: Record<string, string> = {}): Promise<T>
    {
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        const res = await requestUrl({
            url: `${this.getBaseUrl()}${cleanPath}`,
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                ...this.getAuthHeaders(),
                ...customHeaders,
            },
        });

        return res.json as T;
    }

    async put<T>(path: string, body: unknown): Promise<T>
    {
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        const res = await requestUrl({
            url: `${this.getBaseUrl()}${cleanPath}`,
            method: "PUT",
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                ...this.getAuthHeaders(),
            },
        });

        return res.json as T;
    }

    async get<T>(path: string): Promise<T>
    {
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        const res = await requestUrl({
            url: `${this.getBaseUrl()}${cleanPath}`,
            method: "GET",
            headers: {
                ...this.getAuthHeaders(),
            },
        });

        return res.json as T;
    }
}