import { App, TFile } from "obsidian";
import CuriePlugin from "../main";
import { CurieApiClient } from "../api/client";
import { hashString } from "../util/hashing";

export class CurieSyncEngine
{
    api: CurieApiClient;
    interval: number | null = null;

    lastHeartbeat: string | null = null;
    lastSync: string | null = null;


    constructor(private app: App, private plugin: CuriePlugin)
    {
        this.api = new CurieApiClient(plugin.settings.apiBaseUrl);
    }


    async start()
    {
        await this.registerDevice();
        this.startHeartbeat();
    }

    stop()
    {
        if (this.interval) clearInterval(this.interval);
    }


    async registerDevice()
    {
        if (!this.plugin.settings.deviceId)
        {
            const res = await this.api.post<{ id: string }>("/devices/register", {
                name: "Obsidian Desktop"
            });

            this.plugin.settings.deviceId = res.id;
            await this.plugin.saveSettings();
        }
    }

    startHeartbeat()
    {
        this.interval = window.setInterval(async () =>
        {
            if (!this.plugin.settings.deviceId) return;

            await this.api.post("/devices/heartbeat", {
                deviceId: this.plugin.settings.deviceId
            });

            this.lastHeartbeat = new Date().toLocaleTimeString();
        }, 10000);
    }


    async fullSync()
    {
        // For now just update lastSync, we will implement properly later
        this.lastSync = new Date().toLocaleTimeString();
    }

    /**
     * Sync triggered when user edits a file
     */
    async onLocalFileModified(file: TFile)
    {
        const vaultId = this.plugin.settings.vaultId;
        const deviceId = this.plugin.settings.deviceId;

        if (!vaultId || !deviceId) return;

        const content = await this.app.vault.read(file);
        const hash = await hashString(content);

        const diff = await this.api.post<{ action: "noop" | "pull" | "push" }>("/sync/diff", {
            deviceId,
            fileId: file.path, // for alpha, we treat path as id
            clientHash: hash
        });

        if (diff.action === "noop") return;

        if (diff.action === "pull")
        {
            // Download file from server later if needed
            return;
        }

        // PUSH
        await this.api.post(`/vaults/${vaultId}/files`, {
            path: file.path,
            content,
            hash
        });
    }
}
