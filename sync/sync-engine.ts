import { App, TFile, Platform } from "obsidian";
import CuriePlugin from "../main";
import { CurieApiClient, Server } from "../api/client";
import { hashString } from "../util/hashing";

export type SyncProgress = {
    stage: "scanning" | "syncing" | "complete";
    currentFile?: string;
    completed: number;
    total: number;
};
export type SyncProgressCallback = (progress: SyncProgress) => void;

export class CurieSyncEngine
{
    api: CurieApiClient;
    interval: number | null = null;
    isSyncing: boolean = false;

    lastHeartbeat: string | null = null;
    lastSync: string | null = null;

    constructor(private app: App, private plugin: CuriePlugin)
    {
        const server = new Server(plugin.settings.apiBaseUrl);
        if (plugin.settings.deviceToken)
        {
            server.setToken(plugin.settings.deviceToken);
        }
        this.api = new CurieApiClient(server);
    }

    async start()
    {
        await this.registerDevice();
        this.startHeartbeat();
    }

    stop()
    {
        if (this.interval) clearInterval(this.interval);
        for (const timer of this.modifyTimeouts.values())
        {
            window.clearTimeout(timer);
        }
        this.modifyTimeouts.clear();
    }

    async registerDevice()
    {
        if (!this.plugin.settings.deviceId || !this.plugin.settings.deviceToken)
        {
            try
            {
                const platformLabel = Platform.isIosApp
                    ? "Obsidian iOS"
                    : Platform.isAndroidApp
                    ? "Obsidian Android"
                    : Platform.isMacOS
                    ? "Obsidian macOS"
                    : "Obsidian Desktop";
                const deviceName = `${platformLabel} (${this.app.vault.getName()})`;

                const res = await this.api.registerDevice(
                    deviceName,
                    this.plugin.settings.setupKey
                );

                this.plugin.settings.deviceId = res.id;
                this.plugin.settings.deviceToken = res.token;
                this.api.setToken(res.token);

                await this.plugin.saveSettings();
                console.log("[Curie] Device registered successfully with token");
            }
            catch (err)
            {
                console.error("[Curie] Failed to register device:", err);
            }
        }
        else
        {
            this.api.setToken(this.plugin.settings.deviceToken);
        }
    }

    startHeartbeat()
    {
        this.interval = window.setInterval(async () =>
        {
            if (!this.plugin.settings.deviceId) return;

            try
            {
                await this.api.sendHeartbeat(this.plugin.settings.deviceId);
                this.plugin.setStatusConnected();
                this.lastHeartbeat = new Date().toLocaleTimeString();
            }
            catch (err)
            {
                this.plugin.setStatusDisconnected();
                console.warn("[Curie] Heartbeat failed:", err);
            }
        }, 10000);
    }

    async fullSync(onProgress?: SyncProgressCallback)
    {
        const vaultId = this.plugin.settings.vaultId;
        const deviceId = this.plugin.settings.deviceId;

        if (!vaultId || !deviceId) return;

        this.isSyncing = true;
        this.plugin.setStatusSyncing();

        try
        {
            const files = this.app.vault.getMarkdownFiles();
            const total = files.length;
            onProgress?.({
                stage: "scanning",
                completed: 0,
                total,
            });

            let completed = 0;
            for (const file of files)
            {
                onProgress?.({
                    stage: "syncing",
                    currentFile: file.path,
                    completed,
                    total,
                });
                await this.syncFile(file);
                completed++;
            }

            onProgress?.({
                stage: "complete",
                completed: total,
                total,
            });

            this.plugin.setStatusConnected();
            this.lastSync = new Date().toLocaleTimeString();
            console.log("[Curie] Full sync completed at", this.lastSync);
        }
        catch (err)
        {
            console.error("[Curie] Full sync error:", err);
            throw err;
        }
        finally
        {
            this.isSyncing = false;
        }
    }

    private modifyTimeouts: Map<string, number> = new Map();

    async onLocalFileModified(file: TFile)
    {
        if (this.isSyncing) return;

        const existing = this.modifyTimeouts.get(file.path);
        if (existing)
        {
            window.clearTimeout(existing);
        }

        const timer = window.setTimeout(async () =>
        {
            this.modifyTimeouts.delete(file.path);
            if (this.isSyncing) return;
            await this.syncFile(file);
        }, 1500);

        this.modifyTimeouts.set(file.path, timer);
    }

    private async syncFile(file: TFile)
    {
        const vaultId = this.plugin.settings.vaultId;
        const deviceId = this.plugin.settings.deviceId;

        if (!vaultId || !deviceId) return;

        try
        {
            const content = await this.app.vault.read(file);
            const hash = await hashString(content);

            const diff = await this.api.getDiff(deviceId, vaultId, file.path, hash);

            if (diff.action === "noop") return;

            if (diff.action === "pull")
            {
                console.log("[Curie] Pulling newer version from server for:", file.path);
                const { content: remoteContent } = await this.api.downloadFileContent(vaultId, file.path);

                // Temporarily disable modification trigger while writing remote changes
                this.isSyncing = true;
                try
                {
                    await this.app.vault.modify(file, remoteContent);
                }
                finally
                {
                    this.isSyncing = false;
                }
                return;
            }

            if (diff.action === "conflict")
            {
                console.log("[Curie] Conflict detected for:", file.path, "Preserving both sides");
                await this.api.uploadFileContent(vaultId, file.path, content, true);
                return;
            }

            // PUSH
            console.log("[Curie] Pushing file to server:", file.path);
            await this.api.uploadFileContent(vaultId, file.path, content, false);
        }
        catch (err)
        {
            console.error("[Curie] Sync failed for file", file.path, err);
        }
    }
}
