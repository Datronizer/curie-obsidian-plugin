import { App, Modal, Notice, Setting } from "obsidian";
import CuriePlugin from "../main";
import { CurieOnboardingModal } from "../ui/onboarding-modal";
import { VaultDto } from "../api/dtos/vault";

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
        this.render();
    }

    onClose()
    {
        this.contentEl.empty();
    }

    render()
    {
        const { contentEl } = this;
        contentEl.empty();

        const isConfigured = Boolean(
            this.plugin.settings.deviceToken && this.plugin.settings.vaultId
        );

        if (!isConfigured)
        {
            this.renderUnauthenticatedView();
        }
        else
        {
            this.renderAuthenticatedView();
        }
    }

    /**
     * Unauthenticated State: Displays "Not Connected" and a "Log In to Curie" button
     */
    private renderUnauthenticatedView()
    {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Curie Cloud" });

        const badgeContainer = contentEl.createEl("div", { cls: "curie-status-header" });
        badgeContainer.createEl("div", {
            text: "⚪ Not Connected",
            cls: "curie-status-badge curie-badge-disconnected",
        });

        contentEl.createEl("p", {
            text: "This vault is not connected to a Curie account. Sign in to automatically sync your notes with the cloud.",
            cls: "curie-onboarding-desc",
        });

        const infoBox = contentEl.createEl("div", { cls: "curie-info-box" });
        infoBox.createEl("p", { text: `Server URL: ${this.plugin.settings.apiBaseUrl}` });
        infoBox.createEl("p", { text: `Local Vault: ${this.app.vault.getName()}` });

        const buttonContainer = contentEl.createEl("div", { cls: "curie-modal-buttons" });

        const loginBtn = buttonContainer.createEl("button", {
            text: "Log In to Curie",
            cls: "mod-cta",
        });
        loginBtn.onclick = () =>
        {
            this.close();
            new CurieOnboardingModal(this.app, this.plugin).open();
        };

        const settingsBtn = buttonContainer.createEl("button", {
            text: "Settings",
        });
        settingsBtn.onclick = () =>
        {
            (this.app as any).setting?.open?.();
            (this.app as any).setting?.openTabById?.(this.plugin.manifest.id);
            this.close();
        };
    }

    /**
     * Authenticated State: Live status check, account details, sync controls, and logout
     */
    private renderAuthenticatedView()
    {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Curie Cloud Dashboard" });

        // Status Badge element (updated live)
        const statusContainer = contentEl.createEl("div", { cls: "curie-status-header" });
        const statusBadge = statusContainer.createEl("div", {
            text: "🟡 Checking connection to Curie...",
            cls: "curie-status-badge",
        });

        // Summary Card
        const card = contentEl.createEl("div", { cls: "curie-summary-card" });

        const userRow = card.createEl("p");
        userRow.createEl("strong", { text: "Account: " });
        userRow.appendText(this.plugin.settings.userEmail || "Signed In");

        const deviceRow = card.createEl("p");
        deviceRow.createEl("strong", { text: "Device: " });
        deviceRow.appendText(`Obsidian (${this.app.vault.getName()})`);

        const vaultRow = card.createEl("p");
        vaultRow.createEl("strong", { text: "Linked Vault: " });
        vaultRow.appendText(this.plugin.settings.vaultName || "Personal Vault");

        card.createEl("p", {
            text: `Vault ID: ${this.plugin.settings.vaultId}`,
            cls: "curie-subtle-id",
        });

        const syncRow = card.createEl("p");
        syncRow.createEl("strong", { text: "Last Sync: " });
        const syncTextSpan = syncRow.createEl("span", {
            text: this.plugin.syncEngine.lastSync || "Never",
        });

        card.createEl("p", {
            text: `Server: ${this.plugin.settings.apiBaseUrl}`,
            cls: "curie-subtle-id",
        });

        // Run live connectivity check
        this.performLiveHealthCheck(statusBadge);

        // Progress bar container for live sync feedback
        const syncFeedbackBox = contentEl.createEl("div", { cls: "curie-sync-feedback" });

        // Action Buttons
        const buttonContainer = contentEl.createEl("div", { cls: "curie-modal-buttons" });

        const syncBtn = buttonContainer.createEl("button", {
            text: "Sync Now",
            cls: "mod-cta",
        });
        syncBtn.onclick = async () =>
        {
            syncBtn.disabled = true;
            syncBtn.setText("Syncing...");
            syncFeedbackBox.empty();

            const statusLine = syncFeedbackBox.createEl("p", { text: "Scanning notes..." });
            const progressBar = syncFeedbackBox.createEl("progress", {
                cls: "curie-progress-bar",
            });
            progressBar.value = 0;
            progressBar.max = 100;
            progressBar.style.width = "100%";

            try
            {
                await this.plugin.syncEngine.fullSync((progress) =>
                {
                    if (progress.stage === "syncing")
                    {
                        const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                        progressBar.value = percent;
                        statusLine.setText(`Syncing: ${progress.currentFile || ""} (${progress.completed}/${progress.total})`);
                    }
                    else if (progress.stage === "complete")
                    {
                        progressBar.value = 100;
                        statusLine.setText(`✓ Sync complete! ${progress.total} files up to date.`);
                    }
                });
                syncTextSpan.setText(this.plugin.syncEngine.lastSync || new Date().toLocaleTimeString());
                new Notice("Curie: Vault sync completed!");
            }
            catch (err: any)
            {
                statusLine.setText(`⚠️ Sync error: ${err.message}`);
                new Notice(`Curie sync failed: ${err.message}`);
            }
            finally
            {
                syncBtn.disabled = false;
                syncBtn.setText("Sync Now");
            }
        };

        const switchVaultBtn = buttonContainer.createEl("button", {
            text: "Switch Vault",
        });
        switchVaultBtn.onclick = async () =>
        {
            await this.renderSwitchVaultSection(contentEl);
        };

        const disconnectBtn = buttonContainer.createEl("button", {
            text: "Log Out / Disconnect",
            cls: "mod-warning",
        });
        disconnectBtn.onclick = async () =>
        {
            const confirmed = window.confirm(
                "Are you sure you want to disconnect this vault from Curie? Your local notes will remain untouched, but background sync will stop."
            );
            if (!confirmed) return;

            this.plugin.syncEngine.stop();
            this.plugin.settings.deviceToken = null;
            this.plugin.settings.deviceId = null;
            this.plugin.settings.vaultId = "";
            this.plugin.settings.userEmail = "";
            this.plugin.settings.vaultName = "";
            await this.plugin.saveSettings();
            this.plugin.setStatusDisconnected();

            new Notice("Disconnected from Curie.");
            this.renderUnauthenticatedView();
        };
    }

    private async performLiveHealthCheck(statusBadge: HTMLElement)
    {
        try
        {
            if (this.plugin.settings.deviceId)
            {
                await this.plugin.syncEngine.api.sendHeartbeat(this.plugin.settings.deviceId);
            }
            statusBadge.setText("🟢 Connected to Curie");
            statusBadge.addClass("curie-status-connected");
            this.plugin.setStatusConnected();
        }
        catch (err: any)
        {
            statusBadge.setText("🔴 Offline (Server unreachable)");
            statusBadge.addClass("curie-status-offline");
            this.plugin.setStatusDisconnected();
        }
    }

    private async renderSwitchVaultSection(container: HTMLElement)
    {
        const existingSection = container.querySelector(".curie-switch-vault-section");
        if (existingSection)
        {
            existingSection.remove();
            return;
        }

        const section = container.createEl("div", { cls: "curie-switch-vault-section" });
        section.createEl("hr");
        section.createEl("h4", { text: "Switch Connected Vault" });

        try
        {
            const vaults: VaultDto[] = await this.plugin.syncEngine.api.getVaultList();
            if (!vaults || vaults.length === 0)
            {
                section.createEl("p", { text: "No other vaults found on your account." });
                return;
            }

            let selectedVaultId = vaults[0]?.id;

            new Setting(section)
                .setName("Select Vault")
                .setDesc("Choose which remote vault to link this local Obsidian vault with:")
                .addDropdown((dropdown) =>
                {
                    for (const v of vaults)
                    {
                        dropdown.addOption(v.id, v.name);
                    }
                    dropdown.setValue(this.plugin.settings.vaultId || selectedVaultId);
                    dropdown.onChange((val) =>
                    {
                        selectedVaultId = val;
                    });
                })
                .addButton((btn) =>
                {
                    btn.setButtonText("Switch & Save").setCta().onClick(async () =>
                    {
                        const chosen = vaults.find((v) => v.id === selectedVaultId);
                        if (!chosen) return;

                        this.plugin.settings.vaultId = chosen.id;
                        this.plugin.settings.vaultName = chosen.name;
                        await this.plugin.saveSettings();
                        new Notice(`Switched to vault "${chosen.name}"`);
                        this.renderAuthenticatedView();
                    });
                });
        }
        catch (err: any)
        {
            section.createEl("p", { text: `Failed to load vaults: ${err.message}` });
        }
    }
}
