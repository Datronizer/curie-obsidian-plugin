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
            .addText((text) =>
                text
                    .setPlaceholder("http://your-vm:3000")
                    .setValue(this.plugin.settings.apiBaseUrl)
                    .onChange(async (value) =>
                    {
                        this.plugin.settings.apiBaseUrl = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Vault ID")
            .addText((text) =>
                text
                    .setPlaceholder("UUID of your Curie vault")
                    .setValue(this.plugin.settings.vaultId)
                    .onChange(async (value) =>
                    {
                        this.plugin.settings.vaultId = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
