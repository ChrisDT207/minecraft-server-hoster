# MC-ForgeDesk 🎮⛏️

> **A modern, pragmatic desktop Minecraft Server Manager & Zero-Port-Forward Hoster for Windows.**

Built with **Electron**, **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**, MC-ForgeDesk provides a unified utility interface to provision, configure, run, and publicly host Minecraft servers without manual router configuration or Java runtime setup.

---

## ✨ Features

- **🌐 Live Dynamic Provisioning (Zero Hardcoded Lists)**
  - Queries official manifests on-the-fly for **Java Edition (Mojang)**, **PaperMC**, **Fabric**, **Forge**, **NeoForge**, and **Bedrock Dedicated Server (BDS)**.
  - Automatically downloads required server executables and sets up directory structures.

- **☕ Automated Java Runtime Provisioning**
  - Scans system directories (`PATH`, `JAVA_HOME`, Eclipse Adoptium, Microsoft OpenJDK, Android SDK OpenJDK, Zulu, etc.).
  - Accurately resolves bytecode requirements:
    - **Java 25**: Future snapshots (26.x+)
    - **Java 21**: Modern releases (1.20.5 – 1.21.x)
    - **Java 17**: MC 1.18 – 1.20.4
    - **Java 8**: Legacy MC (<= 1.16.5)
  - Automatically downloads and extracts portable **Eclipse Adoptium Temurin JREs** on demand if no compatible runtime is detected.

- **🚀 Public Hosting with Playit.gg (No Router Port Forwarding)**
  - Bundles the official standalone Playit CLI agent (`v0.15.26`) with `--stdout` streaming.
  - Routes traffic through global encrypted Anycast relays, keeping your home IP and network completely shielded.
  - Provides a 1-click **Open Claim URL** banner and resolves public addresses (`*.joinmc.link` / `*.ply.gg`).

- **👕 TLauncher & Offline Client Compatibility**
  - Toggle offline mode (`online-mode=false`) with a single click.
  - Automatically provisions and installs **SkinRestorer** (via Modrinth) so players keep custom skins and capes in offline mode.

- **💻 Interactive xterm.js Terminal & Stdin Console**
  - Hardware-accelerated terminal with custom slate theme.
  - Full translation of Minecraft formatting codes (`§a`, `§c`, etc.) to ANSI colors.
  - Command input with history traversal (<kbd>↑</kbd> / <kbd>↓</kbd>) and quick action buttons (`/list`, `/time set day`, `/save-all`, etc.).

- **🧩 Mod & Plugin Manager (Modrinth Integration)**
  - Search and 1-click install mods or plugins directly from the Modrinth API, filtered automatically by your server loader and game version.
  - Drag-and-drop support for local `.jar` or `.mcpack` files.
  - Enable/disable toggles (via `.disabled` extension renaming) and package deletion.

- **⚙️ Server Configuration Editor**
  - Dual-mode editor: visual form controls for common settings (MOTD, PVP, Difficulty, Max Players, Spawn Protection) or raw text editor for full `server.properties` control.

- **📊 Resource Monitoring & Safe Process Management**
  - Real-time CPU, RAM usage, and active player tracking.
  - Clean `stdin` shutdown (`stop\n`) backed by an automated 30-second fallback watchdog to prevent frozen background processes.

---

## 🏗️ Project Architecture

```
minecraft-server-hoster/
├── electron/                   # Electron Main & Preload Processes
│   ├── main.ts                 # Window creation, IPC dispatch, lifecycle handlers
│   ├── preload.ts              # Context-isolated API bridge (window.electronAPI)
│   ├── types.ts                # Shared TypeScript contracts & interfaces
│   └── services/               # Core backend services
│       ├── javaDetector.ts     # Deep system Java discovery & Adoptium downloader
│       ├── modrinthService.ts  # Modrinth REST API search & file installer
│       ├── playitRunner.ts     # Playit CLI runner, claim parser & log streamer
│       ├── serverManager.ts    # ChildProcess lifecycle, stdio, properties & stats
│       └── versionFetcher.ts   # Manifest fetchers (Mojang, Paper, Fabric, BDS)
├── src/                        # Renderer Process (React + Vite + Tailwind CSS)
│   ├── App.tsx                 # Main layout & state orchestration
│   ├── components/             # Modular UI components
│   │   ├── CreateServerModal.tsx  # Server provisioning wizard
│   │   ├── ModManager.tsx         # Modrinth browser & mod manager
│   │   ├── NetworkTunnel.tsx      # Playit.gg public tunnel controller
│   │   ├── ServerConsole.tsx      # xterm.js ANSI terminal with command history
│   │   ├── ServerHeader.tsx       # Server actions (Start, Stop, Restart, Files)
│   │   ├── ServerOverview.tsx     # Metrics, quick cards & connection details
│   │   ├── ServerProperties.tsx   # Visual & raw property editors
│   │   ├── SettingsModal.tsx      # Detected Java runtimes & hardware specs
│   │   ├── Sidebar.tsx            # Server list with live status indicators
│   │   └── TitleBar.tsx           # Custom frameless window controls
│   └── types/                  # Frontend TypeScript definitions
├── build/                      # Build resources & application icons
│   ├── icon.ico                # Multi-resolution Windows executable icon
│   └── icon.png                # High-res icon source (256x256)
├── scripts/                    # Automation & helper scripts
│   └── create-icon.ps1         # Multi-size ICO generation script
├── dist/                       # Packaged executables & renderer build (gitignored)
└── package.json                # Dependencies, scripts, and electron-builder config
```

---

## 🚀 Getting Started

### Prerequisites

- **Windows 10 / 11 (64-bit)**
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher

> [!NOTE]
> On Windows PowerShell, if running scripts is restricted by execution policy, always use `npm.cmd` or `npx.cmd`.

### 1. Installation

Open the project folder in terminal and install dependencies:

```powershell
cd minecraft-server-hoster
npm install
```

### 2. Development Mode

Run the Vite development server and the Electron application concurrently:

```powershell
# Terminal 1: Launch Vite renderer dev server
npm run dev

# Terminal 2: Compile Electron main & preload, then start the application
npm run dev:electron
```

### 3. Building & Packaging for Production

To produce standalone, portable `.exe` and NSIS installer packages:

```powershell
npm run build:win
```

This generates:
- **Portable Standalone Executable**: `dist/MC-ForgeDesk 1.0.0.exe` (run without installing)
- **NSIS Windows Installer**: `dist/MC-ForgeDesk Setup 1.0.0.exe` (installs with Desktop & Start Menu shortcuts)
- **Unpacked Folder**: `dist/win-unpacked/`

---

## 🔍 How It Works Under the Hood

### 1. Server Storage & Workspace Layout
All server files, configurations, and downloaded runtimes are stored in the user profile directory to keep the application portable and isolated:
- Servers: `C:\Users\<User>\MC-ForgeDesk\servers\<server-id>\`
- Java Runtimes: `C:\Users\<User>\MC-ForgeDesk\runtimes\java-<version>\`
- Network Tools: `C:\Users\<User>\MC-ForgeDesk\tools\playit.exe`

Each server directory contains:
- `mcfg-server.json`: MC-ForgeDesk metadata (port, RAM allocation, loader, offline flag).
- `server.properties`: Standard Minecraft configuration.
- `eula.txt`: Auto-managed EULA agreement.
- `server.jar` / `run.bat` / `bedrock_server.exe`: Loader-specific binaries.

### 2. Java Detection & On-Demand Fallback
When launching a server:
1. `javaDetector.ts` calculates the required Java bytecode version from the Minecraft release string.
2. It tests all discovered runtimes on the system.
3. If no matching runtime is found, it queries the Adoptium API (`api.adoptium.net`), downloads the matching portable JRE zip archive, and unpacks it to `~/MC-ForgeDesk/runtimes/java-${major}`.
4. The server process spawns directly against the verified runtime using high-throughput G1GC garbage collection flags (`-XX:+UseG1GC -XX:+ParallelRefProcEnabled`).

### 3. Public Tunneling (Playit.gg)
1. Clicking **"Start Public Tunnel"** launches `~/MC-ForgeDesk/tools/playit.exe --stdout`.
2. The stdout stream emits a setup link (`https://playit.gg/claim/<code-here>`).
3. The UI presents an **"Account Claim Required to Activate Tunnel"** card. Clicking **Open Claim URL in Browser** takes you to Playit to link the agent to your free account.
4. Once linked, the agent outputs your persistent address (`*.joinmc.link` or `*.ply.gg`). MC-ForgeDesk parses this address and displays it with 1-click copy for your friends.

---

## 🛠️ Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite React frontend on `http://localhost:5173`. |
| `npm run dev:electron` | Compiles Electron TypeScript and opens the desktop window. |
| `npm run build` | Builds both the Vite frontend (`dist/`) and Electron main scripts (`dist-electron/`). |
| `npm run build:win` | Full production build: compiles code and packages `.exe` binaries with `electron-builder`. |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
