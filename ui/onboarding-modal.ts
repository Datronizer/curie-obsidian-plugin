import { App, Modal, Setting, Notice, Platform } from "obsidian";
import CuriePlugin from "../main";

interface RemoteVault
{
    id: string;
    name: string;
}

export class CurieOnboardingModal extends Modal
{
    private plugin: CuriePlugin;
    private serverUrl: string;
    private email: string = "";
    private password: string = "";
    private deviceName: string = "";
    private availableVaults: RemoteVault[] = [];

    constructor(app: App, plugin: CuriePlugin)
    {
        super(app);
        this.plugin = plugin;
        this.serverUrl = plugin.settings.apiBaseUrl || "http://localhost:3000";

        const platformLabel = Platform.isIosApp
            ? "Obsidian iOS"
            : Platform.isAndroidApp
            ? "Obsidian Android"
            : Platform.isMacOS
            ? "Obsidian macOS"
            : "Obsidian Desktop";
        this.deviceName = `${platformLabel} (${app.vault.getName()})`;
    }

    onOpen()
    {
        this.renderLoginStep();
    }

    onClose()
    {
        this.contentEl.empty();
    }

    /**
     * Step 1: Server URL, Email, and Password Login
     */
    private renderLoginStep(errorMessage?: string)
    {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Welcome to Curie" });
        contentEl.createEl("p", {
            text: "Sign in with your Curie account to connect and synchronize this vault.",
            cls: "curie-onboarding-desc",
        });

        const serverHint = contentEl.createEl("p", {
            cls: "curie-subtle-id",
        });
        serverHint.appendText("Requires a running, self-hosted Project Curie server (");
        serverHint.createEl("a", {
            text: "github.com/Datronizer/project-curie",
            href: "https://github.com/Datronizer/project-curie",
        });
        serverHint.appendText(").");

        if (errorMessage)
        {
            const errorEl = contentEl.createEl("div", { cls: "curie-error-banner" });
            errorEl.createEl("p", { text: `⚠️ ${errorMessage}` });
        }

        // Server URL Setting
        new Setting(contentEl)
            .setName("Server URL")
            .setDesc("The base address of your Curie server instance")
            .addText((text) =>
                text
                    .setPlaceholder("http://localhost:3000")
                    .setValue(this.serverUrl)
                    .onChange((val) =>
                    {
                        this.serverUrl = val.trim();
                    })
            );

        // Email Setting
        new Setting(contentEl)
            .setName("Email")
            .setDesc("Your Curie account email address")
            .addText((text) =>
                text
                    .setPlaceholder("user@example.com")
                    .setValue(this.email)
                    .onChange((val) =>
                    {
                        this.email = val.trim();
                    })
            );

        // Password Setting
        new Setting(contentEl)
            .setName("Password")
            .setDesc("Your account password")
            .addText((text) =>
            {
                text.inputEl.type = "password";
                text
                    .setPlaceholder("••••••••")
                    .setValue(this.password)
                    .onChange((val) =>
                    {
                        this.password = val;
                    });
            });

        // Device Name Setting
        new Setting(contentEl)
            .setName("Device Name")
            .setDesc("A label identifying this Obsidian device")
            .addText((text) =>
                text
                    .setPlaceholder("e.g. MacBook Pro")
                    .setValue(this.deviceName)
                    .onChange((val) =>
                    {
                        this.deviceName = val.trim();
                    })
            );

        // Action Buttons
        const buttonContainer = contentEl.createEl("div", { cls: "curie-modal-buttons" });
        const loginBtn = buttonContainer.createEl("button", {
            text: "Sign In",
            cls: "mod-cta",
        });

        loginBtn.onclick = async () =>
        {
            if (!this.serverUrl || !this.email || !this.password)
            {
                this.renderLoginStep("Server URL, Email, and Password are required.");
                return;
            }

            loginBtn.disabled = true;
            loginBtn.setText("Signing in...");

            try
            {
                this.plugin.syncEngine.api.setBaseUrl(this.serverUrl);
                const res = await this.plugin.syncEngine.api.login(
                    this.email,
                    this.password,
                    this.deviceName || "Obsidian Client"
                );

                // Save credentials to plugin settings
                this.plugin.settings.apiBaseUrl = this.serverUrl;
                this.plugin.settings.deviceId = res.device.id;
                this.plugin.settings.deviceToken = res.device.token;
                this.plugin.settings.userEmail = res.user.email;
                this.plugin.syncEngine.api.setToken(res.device.token);
                await this.plugin.saveSettings();

                this.availableVaults = res.vaults || [];
                this.renderVaultResolutionStep();
            }
            catch (err: unknown)
            {
                console.error("[Curie Onboarding] Login failed:", err);
                const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your URL and credentials.";
                this.renderLoginStep(msg);
            }
        };
    }

    /**
     * Step 2: Vault Auto-Matching and Unrecorded Prompt
     */
    private renderVaultResolutionStep()
    {
        const { contentEl } = this;
        contentEl.empty();

        const localVaultName = this.app.vault.getName();
        contentEl.createEl("h2", { text: "Vault Setup" });

        // Check if there is an exact or case-insensitive match
        const matchedVault = this.availableVaults.find(
            (v) => v.name.trim().toLowerCase() === localVaultName.trim().toLowerCase()
        );

        if (matchedVault)
        {
            // Smart Match Found
            contentEl.createEl("p", {
                text: `Found an existing remote vault matching your local vault: "${matchedVault.name}".`,
            });

            const buttonContainer = contentEl.createEl("div", { cls: "curie-modal-buttons" });
            const connectBtn = buttonContainer.createEl("button", {
                text: `Connect to "${matchedVault.name}" & Sync`,
                cls: "mod-cta",
            });

            connectBtn.onclick = () =>
            {
                connectBtn.disabled = true;
                void (async () =>
                {
                    this.plugin.settings.vaultId = matchedVault.id;
                    this.plugin.settings.vaultName = matchedVault.name;
                    await this.plugin.saveSettings();
                    this.renderInitialSyncStep();
                })();
            };

            // Alternative: Choose different vault if desired
            if (this.availableVaults.length > 1)
            {
                contentEl.createEl("hr");
                contentEl.createEl("p", { text: "Or choose a different remote vault:" });
                this.renderVaultDropdown();
            }
        }
        else
        {
            // No Match Found - Prompt user to add vault to Curie
            const promptBox = contentEl.createEl("div", { cls: "curie-prompt-box" });
            promptBox.createEl("h3", {
                text: `Your vault "${localVaultName}" is not recorded in Curie yet.`,
            });
            promptBox.createEl("p", {
                text: "Would you like to add it to Curie? This will create a new cloud vault linked to your local notes.",
            });

            const buttonContainer = promptBox.createEl("div", { cls: "curie-modal-buttons" });
            const createBtn = buttonContainer.createEl("button", {
                text: `Add "${localVaultName}" to Curie`,
                cls: "mod-cta",
            });

            createBtn.onclick = () =>
            {
                createBtn.disabled = true;
                createBtn.setText("Adding vault...");

                void (async () =>
                {
                    try
                    {
                        const newVault = await this.plugin.syncEngine.api.createVault(localVaultName);
                        this.plugin.settings.vaultId = newVault.id;
                        this.plugin.settings.vaultName = localVaultName;
                        await this.plugin.saveSettings();

                        new Notice(`Vault "${localVaultName}" added to Curie!`);
                        this.renderInitialSyncStep();
                    }
                    catch (err: unknown)
                    {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.error("[Curie Onboarding] Vault creation failed:", err);
                        new Notice(`Failed to create vault: ${msg}`);
                        createBtn.disabled = false;
                        createBtn.setText(`Add "${localVaultName}" to Curie`);
                    }
                })();
            };

            if (this.availableVaults.length > 0)
            {
                contentEl.createEl("hr");
                contentEl.createEl("p", { text: "Or link this local vault to an existing remote vault:" });
                this.renderVaultDropdown();
            }
        }
    }

    private renderVaultDropdown()
    {
        const { contentEl } = this;
        let selectedVaultId = this.availableVaults[0]?.id || "";

        new Setting(contentEl)
            .setName("Existing Vaults")
            .setDesc("Select an existing remote vault to sync with")
            .addDropdown((dropdown) =>
            {
                for (const v of this.availableVaults)
                {
                    dropdown.addOption(v.id, v.name);
                }
                dropdown.setValue(selectedVaultId);
                dropdown.onChange((val) =>
                {
                    selectedVaultId = val;
                });
            })
            .addButton((btn) =>
            {
                btn.setButtonText("Link Selected Vault").onClick(() =>
                {
                    void (async () =>
                    {
                        const selected = this.availableVaults.find((v) => v.id === selectedVaultId);
                        if (!selected) return;

                        this.plugin.settings.vaultId = selected.id;
                        this.plugin.settings.vaultName = selected.name;
                        await this.plugin.saveSettings();
                        this.renderInitialSyncStep();
                    })();
                });
            });
    }

    /**
     * Step 3: Initial Sync with Real-Time Progress Bar
     */
    private async renderInitialSyncStep()
    {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Synchronizing Vault" });
        contentEl.createEl("p", {
            text: "Performing initial synchronization with Curie...",
            cls: "curie-sync-subtitle",
        });

        const statusText = contentEl.createEl("div", {
            text: "Initializing sync...",
            cls: "curie-sync-status",
        });

        const progressContainer = contentEl.createEl("div", { cls: "curie-progress-container" });
        const progressBar = progressContainer.createEl("progress", {
            cls: "curie-progress-bar",
        });
        progressBar.value = 0;
        progressBar.max = 100;

        const actionContainer = contentEl.createEl("div", { cls: "curie-modal-buttons" });

        try
        {
            await this.plugin.syncEngine.fullSync((progress) =>
            {
                if (progress.stage === "scanning")
                {
                    statusText.setText(`Scanning local files (${progress.total} found)...`);
                    progressBar.removeAttribute("value"); // Indeterminate
                }
                else if (progress.stage === "syncing")
                {
                    const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                    progressBar.value = percent;
                    progressBar.max = 100;
                    statusText.setText(
                        `Syncing: ${progress.currentFile || ""} (${progress.completed}/${progress.total} files, ${percent}%)`
                    );
                }
                else if (progress.stage === "complete")
                {
                    progressBar.value = 100;
                    statusText.setText(`✓ Synchronization complete! All ${progress.total} files are up to date.`);
                }
            });

            statusText.setText("✓ Setup complete! Your vault is connected and in sync.");

            const doneBtn = actionContainer.createEl("button", {
                text: "Done",
                cls: "mod-cta",
            });
            doneBtn.onclick = () =>
            {
                void this.plugin.syncEngine.start();
                this.close();
            };
        }
        catch (err: unknown)
        {
            console.error("[Curie Onboarding] Initial sync error:", err);
            const msg = err instanceof Error ? err.message : String(err);
            statusText.setText(`⚠️ Initial sync encountered an issue: ${msg}`);

            const retryBtn = actionContainer.createEl("button", {
                text: "Retry Sync",
                cls: "mod-cta",
            });
            retryBtn.onclick = () =>
            {
                void this.renderInitialSyncStep();
            };

            const skipBtn = actionContainer.createEl("button", {
                text: "Continue and Sync in Background",
            });
            skipBtn.onclick = () =>
            {
                void this.plugin.syncEngine.start();
                this.close();
            };
        }
    }
}
