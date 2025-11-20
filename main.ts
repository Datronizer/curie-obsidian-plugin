import { Plugin, TFile } from "obsidian";
import { CurieSettings, DEFAULT_SETTINGS } from "./settings/settings";
import { CurieSettingTab } from "./settings/settings-tab";
import { CurieSyncEngine } from "./sync/sync-engine";
import { CurieDashboardModal } from "sync/dashboard-model";

export default class CuriePlugin extends Plugin
{
	settings: CurieSettings;
	syncEngine: CurieSyncEngine;
	statusBarItem: HTMLElement;


	async onload()
	{
		console.log("Loading Curie Plugin");

		await this.loadSettings();

		// UI Settings Tab
		this.addSettingTab(new CurieSettingTab(this.app, this));

		// Initialize sync engine
		this.syncEngine = new CurieSyncEngine(this.app, this);

		// Status Bar Item
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText("Curie: Idle");

		// Register file events
		this.registerEvent(this.app.vault.on("modify", (file: TFile) =>
		{
			this.syncEngine.onLocalFileModified(file);
		}));

		// Hovers
		this.registerHoverLinkSource("curie-hover", {
			display: "Curie File Hover",
			defaultMod: true,
		});
		this.registerEvent(
			(this.app.workspace as any).on("hover-link", async (event: any) =>
			{
				const { source, hoverParent, targetEl, linktext } = event;

				// We only care about file explorer hovers
				if (source !== "file-explorer") return;

				// Fetch file metadata
				const file = this.app.vault.getAbstractFileByPath(linktext);
				if (!file || !(file instanceof TFile)) return;

				// Override hover contents
				const hoverPopover = event.hoverPopover;
				const container = hoverPopover.hoverEl;

				container.empty();

				container.createEl("h4", { text: `Curie File Info` });
				container.createEl("p", { text: `Path: ${file.path}` });
				container.createEl("p", { text: `Last Modified: ${new Date(file.stat.mtime).toLocaleString()}` });

				// You can add anything here:
				// - Custom icons
				// - File preview
				// - Sync status
				// - Vault metadata
				// - Buttons (Open, Sync Now, Compare, etc.)
			})
		);



		// Start heartbeat + periodic sync
		this.syncEngine.start();


		const ribbonIconEl = this.addRibbonIcon(
			"cloud",
			"Curie",
			() =>
			{
				new CurieDashboardModal(this.app, this).open();
			}
		);
		ribbonIconEl.addClass("curie-ribbon-icon");
	}

	onunload()
	{
		console.log("Unloading Curie Plugin");
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


	// Status Bar Updates
	setStatusIdle()
	{
		this.statusBarItem.setText("Curie: Idle ⚪");
	}

	setStatusSyncing()
	{
		this.statusBarItem.setText("Curie: Syncing 🟡");
	}

	setStatusConnected()
	{
		this.statusBarItem.setText("Curie: Connected 🟢");
	}

	setStatusError()
	{
		this.statusBarItem.setText("Curie: Error 🔴");
	}
}
