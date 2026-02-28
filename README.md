# 🔊 Terminal Error Sound

**Never miss a failed command again!** This VS Code extension plays a sound whenever a terminal command exits with an error.

[![VS Code](https://img.shields.io/badge/VS%20Code-1.93%2B-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **Accurate** | Detects failed commands via exit codes — zero false positives |
| 🌍 **Cross-platform** | Works on macOS, Windows, and Linux |
| ⚡ **Zero config** | Install and forget — it just works |
| 🎛️ **Customizable** | Bring your own sound file, adjust volume, toggle from status bar |
| 🔇 **Smart debounce** | Won't spam you with sounds for cascading errors |

## 🚀 Quick Start

1. Install the extension
2. Open the integrated terminal
3. Run any command that fails — you'll hear the sound! 🔊
4. Click **"🔊 Error Sound"** in the status bar to toggle on/off

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `terminalErrorSound.enabled` | `true` | Enable or disable |
| `terminalErrorSound.volume` | `75` | Volume (0–100, macOS) |
| `terminalErrorSound.soundFile` | `""` | Custom sound file path |

## 📋 Commands

Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **Terminal Error Sound: Toggle On/Off** — Enable/disable the extension
- **Terminal Error Sound: Test Sound** — Preview the error sound

## 🛠️ How It Works

This extension uses VS Code's **Shell Integration API** (`onDidEndTerminalShellExecution`) to detect when a terminal command finishes with a non-zero exit code. When that happens, it plays a sound using the OS's native audio player.

> **Note:** Shell Integration must be enabled in VS Code (it's on by default). If commands aren't being detected, check `terminal.integrated.shellIntegration.enabled` in Settings.

## 🤝 Contributing

Found a bug or have a feature idea? [Open an issue](https://github.com/rohansingh/terminal-error-sound/issues)!

## 📄 License

MIT
