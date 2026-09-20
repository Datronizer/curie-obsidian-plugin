# Curie

Curie is a private, lightweight synchronization plugin designed to connect your vaults to your self-hosted **[Project Curie](https://github.com/Datronizer/project-curie)** backend.

> [!IMPORTANT]
> **Prerequisite: Self-Hosted Server**  
> This plugin is not a standalone sync service. It is designed specifically to synchronize notes and attachments with a self-hosted instance of [Project Curie](https://github.com/Datronizer/project-curie), an open-source, filesystem-based hybrid datalake and metadata server. You will need a running Curie server instance to use this plugin.

---

## Key Features

- **Self-Hosted & Private**: Your notes stay under your complete control on your own infrastructure.
- **Transparent Filesystem Storage**: Notes on the server live as standard Markdown files and attachments in the filesystem—no database locks or proprietary formats.
- **Bidirectional Background Sync**: Automatically tracks local modifications and synchronizes changes with the Curie server.
- **Side-by-Side Conflict Preservation**: If concurrent edits collide across devices, Curie preserves both versions side-by-side (`Note (Conflict from <Device> <Time>).md`), preventing any data loss.
- **Full Desktop & Mobile Support**: Runs natively on macOS, Windows, Linux, iOS, and Android.
- **Touch-Friendly Controls**: Includes Mobile Quick Action and Mobile Toolbar commands (`Curie: Sync Vault Now`, `Curie: Open Curie Dashboard`).
- **Connection Dashboard**: Inspect live connection status, account details, active vault association, and trigger manual syncs at any time.

---

## Quick Start

### 1. Deploy Your Curie Server
Follow the setup instructions in the [Project Curie repository](https://github.com/Datronizer/project-curie) to launch your Fastify and SQLite backend:
```bash
git clone https://github.com/Datronizer/project-curie.git
cd project-curie/server
npm install
npm run migrate
npm run start
```

### 2. Install the Plugin
- **From Community Plugins**: Search for **Curie** and click **Install**, then **Enable**.
- **Manual Installation**: Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub Release](https://github.com/Datronizer/curie-obsidian-plugin/releases) and place them in your vault at `.obsidian/plugins/project-curie-sync/`.

### 3. Connect to Your Server
On first launch, the **Curie Onboarding** screen will automatically open:
1. Enter your **Server URL** (e.g. `https://curie.yourdomain.com` or `http://localhost:3000`).
2. Enter your Curie account **Email** and **Password**.
3. Curie will automatically discover your remote vaults and match your current local vault, or offer to create a new remote vault with a single click.
4. An initial bidirectional sync will run and your notes will stay seamlessly synchronized!

---

## Mobile Usage

On iOS and Android:
- Open the left sidebar or pull down for **Mobile Quick Actions** to open the **Curie Cloud Dashboard**.
- You can add the command `Curie: Sync Vault Now` directly to your **Mobile Toolbar** in Obsidian settings for one-tap synchronization.

---

## Support & Issues

For issues, questions, or contributions regarding the client plugin, please visit the [Curie Obsidian Plugin Issues](https://github.com/Datronizer/curie-obsidian-plugin/issues) page.

For server-side questions and architecture details, see [Project Curie Server](https://github.com/Datronizer/project-curie).
