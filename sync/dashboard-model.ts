import { App, Modal } from "obsidian";
import CuriePlugin from "../main";

export class CurieDashboardModal extends Modal {
  plugin: CuriePlugin;

  constructor(app: App, plugin: CuriePlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;

    const settings = this.plugin.settings;
    const engine = this.plugin.syncEngine;

    contentEl.createEl("h2", { text: "Project Curie Sync" });

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

    // Buttons
    const btnForceSync = contentEl.createEl("button", { text: "Force Sync" });
    btnForceSync.onclick = async () => {
      await engine.fullSync();
      this.close();
    };

    const btnOpenSettings = contentEl.createEl("button", { text: "Open Settings" });
    btnOpenSettings.onclick = () => {
    //   this.plugin.openSettings();
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
