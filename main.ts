import { Plugin, TFile } from "obsidian";
import { CurieSettings, DEFAULT_SETTINGS } from "./settings/settings";
import { CurieSettingTab } from "./settings/settings-tab";
import { CurieSyncEngine } from "./sync/sync-engine";
import { CurieDashboardModal } from "sync/dashboard-model";

export default class CuriePlugin extends Plugin
{
	settings: CurieSettings;
	syncEngine: CurieSyncEngine;

	async onload()
	{
		console.log("Loading Project Curie Sync Plugin");

		await this.loadSettings();

		// UI Settings Tab
		this.addSettingTab(new CurieSettingTab(this.app, this));

		// Initialize sync engine
		this.syncEngine = new CurieSyncEngine(this.app, this);

		// Register file events
		this.registerEvent(this.app.vault.on("modify", (file: TFile) =>
		{
			this.syncEngine.onLocalFileModified(file);
		}));

		// Start heartbeat + periodic sync
		this.syncEngine.start();


		const ribbonIconEl = this.addRibbonIcon(
			"cloud",
			"Project Curie Sync",
			() =>
			{
				new CurieDashboardModal(this.app, this).open();
			}
		);
		ribbonIconEl.addClass("curie-ribbon-icon");
	}

	onunload()
	{
		console.log("Unloading Project Curie Sync Plugin");
		this.syncEngine.stop();
	}

	async loadSettings()
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings()
	{
		await this.saveData(this.settings);
	}
}
