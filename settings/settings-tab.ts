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
            .setDesc("The HTTP/HTTPS base URL of your self-hosted Project Curie server (e.g. http://localhost:3000 or https://curie.yourdomain.com)")
            .addText((text) =>
                text
                    .setPlaceholder("http://localhost:3000")
                    .setValue(this.plugin.settings.apiBaseUrl)
                    .onChange((value) =>
                    {
                        this.plugin.settings.apiBaseUrl = value.trim();
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Setup Key")
            .setDesc("Master setup key for registering this device")
            .addText((text) =>
                text
                    .setPlaceholder("Setup key")
                    .setValue(this.plugin.settings.setupKey)
                    .onChange((value) =>
                    {
                        this.plugin.settings.setupKey = value.trim();
                        void this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Vault ID")
            .setDesc("UUID of your Curie vault")
            .addText((text) =>
                text
                    .setPlaceholder("UUID of your Curie vault")
                    .setValue(this.plugin.settings.vaultId)
                    .onChange((value) =>
                    {
                        this.plugin.settings.vaultId = value.trim();
                        void this.plugin.saveSettings();
                    })
            );
    }
}
