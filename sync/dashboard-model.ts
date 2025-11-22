import { App, Modal } from "obsidian";
import CuriePlugin from "../main";
import { formatDuration, timeAgoInMs } from "../util/time";
import { VaultDto } from "api/dtos/vault";

export class CurieDashboardModal extends Modal
{
    plugin: CuriePlugin;

    constructor(app: App, plugin: CuriePlugin)
    {
        super(app);
        this.plugin = plugin;
    }

    onOpen()
    {
        const { contentEl } = this;

        const settings = this.plugin.settings;
        const engine = this.plugin.syncEngine;

        contentEl.createEl("h2", { text: "Curie" });

        // Connection Status
        contentEl.createEl("p", { text: "Connection:" });
        contentEl.createEl("p", { text: `Backend: ${settings.apiBaseUrl}` });
        contentEl.createEl("p", { text: `Vault ID: ${settings.vaultId}` });
        contentEl.createEl("p", { text: `Device ID: ${settings.deviceId ?? "Not registered"}` });

        contentEl.createEl("hr");

        // Sync Info
        contentEl.createEl("p", { text: "Status:" });
        contentEl.createEl("p", { text: `Last Heartbeat: ${engine.lastHeartbeat ?? "N/A"}` });
        contentEl.createEl("p", { text: `Last Sync: ${engine.lastSync ?? "N/A"}` });

        contentEl.createEl("hr");

        // Vault Info from Server
        if (this.plugin.settings.vaultId)
        {
            this.plugin.syncEngine.api.getVaultInfo(this.plugin.settings.vaultId)
                .then((vaultInfo) =>
                {
                    contentEl.createEl("p", { text: "Vault Info from Server:" });
                    contentEl.createEl("ul", { text: "ID: " + vaultInfo.id });
                    contentEl.createEl("ul", { text: "Vault Name: " + vaultInfo.name });
                    contentEl.createEl("ul", { text: "Created At: " + new Date(vaultInfo.createdAt).toLocaleString() });
                    contentEl.createEl("ul", { text: "Last updated: " + formatDuration(timeAgoInMs(new Date(vaultInfo.updatedAt))) + " ago" });
                })
                .catch((err) =>
                {
                    contentEl.createEl("p", { text: "Failed to fetch vault info from server." });
                });
        }
        else
        {
            let vaultList: VaultDto[] = [];
            this.plugin.syncEngine.api.getVaultList()
                .then((vaultList) =>
                {
                    vaultList = vaultList;
                })
                .catch((err) =>
                {
                    contentEl.createEl("p", { text: "Failed to fetch vault list from server." });
                });

            contentEl.createEl("p", { text: "Vault Info from Server: N/A (No Vault ID configured)" });
            contentEl.createEl("br");
            contentEl.createEl("p", { text: "You need to create a vault on the server before syncing." });
            contentEl.createEl("p", { text: "Or you can choose an existing vault by choosing one below:" });

            contentEl.createEl("table", undefined, (tableEl: any) =>
            {
                const headerRow = tableEl.createEl("tr");
                headerRow.createEl("th", { text: "Vault ID" });
                headerRow.createEl("th", { text: "Vault Name" });
                headerRow.createEl("th", { text: "Created At" });
                headerRow.createEl("th", { text: "Select" });

                for (const vault of vaultList)
                {
                    const row = tableEl.createEl("tr");
                    row.createEl("td", { text: vault.id });
                    row.createEl("td", { text: vault.name });
                    row.createEl("td", { text: new Date(vault.createdAt).toLocaleString() });
                    const selectCell = row.createEl("td");
                    const selectButton = selectCell.createEl("button", { text: "Select" });
                    selectButton.onclick = async () =>
                    {
                        this.plugin.settings.vaultId = vault.id;
                        await this.plugin.saveSettings();
                        contentEl.createEl("p", { text: `Selected vault "${vault.name}" with ID: ${vault.id}` });
                    };
                }
            });

            contentEl.createEl("br");
            contentEl.createEl("input", { type: "text", placeholder: "Enter Vault Name" });
            const btnCreateVault = contentEl.createEl("button", { text: "Create Vault" });
            btnCreateVault.onclick = async () =>
            {
                // Implement vault creation logic here
                const inputEl = contentEl.querySelector("input") as HTMLInputElement;
                const vaultName = inputEl.value.trim();
                if (vaultName.length === 0) return;

                try
                {
                    console.log("Creating vault with name:", vaultName);
                    const res = await this.plugin.syncEngine.api.createVault(vaultName);
                    this.plugin.settings.vaultId = res.id;
                    await this.plugin.saveSettings();
                    contentEl.createEl("p", { text: `Vault "${vaultName}" created with ID: ${res.id}` });
                }
                catch (err)
                {
                    contentEl.createEl("p", { text: "Failed to create vault on server." });
                }
            };
        }

        contentEl.createEl("hr");


        // Buttons
        const btnForceSync = contentEl.createEl("button", { text: "Force Sync" });
        btnForceSync.onclick = async () =>
        {
            await engine.fullSync();
        };

        const btnOpenSettings = contentEl.createEl("button", { text: "Open Settings" });
        btnOpenSettings.onclick = () =>
        {
            //   this.plugin.openSettings();
            this.close();
        };
    }

    onClose()
    {
        const { contentEl } = this;
        contentEl.empty();
    }
}
