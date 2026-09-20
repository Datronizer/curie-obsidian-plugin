import { App, PluginSettingTab, Setting } from "obsidian";
import CuriePlugin from "../main";

export class CurieSettingTab extends PluginSettingTab
{
    plugin: CuriePlugin;

    constructor(app: App, plugin: CuriePlugin)
    {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void
    {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("API Base URL")
            .setDesc("The base URL of your Curie server")
            .addText((text) =>
                text
                    .setPlaceholder("http://localhost:3000")
                    .setValue(this.plugin.settings.apiBaseUrl)
                    .onChange(async (value) =>
                    {
                        this.plugin.settings.apiBaseUrl = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Setup Key")
            .setDesc("Master setup key for registering this device")
            .addText((text) =>
                text
                    .setPlaceholder("Setup key")
                    .setValue(this.plugin.settings.setupKey)
                    .onChange(async (value) =>
                    {
                        this.plugin.settings.setupKey = value.trim();
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Vault ID")
            .setDesc("UUID of your Curie vault")
            .addText((text) =>
                text
                    .setPlaceholder("UUID of your Curie vault")
                    .setValue(this.plugin.settings.vaultId)
                    .onChange(async (value) =>
                    {
                        this.plugin.settings.vaultId = value.trim();
                        await this.plugin.saveSettings();
                    })
            );
    }
}
