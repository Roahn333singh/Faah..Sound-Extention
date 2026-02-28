import * as vscode from 'vscode';
import { exec, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const LOG_PREFIX = '[Terminal Error Sound]';
let lastPlayedTime = 0;
let currentSoundProcess: ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

const DEBOUNCE_MS = 1500;

function log(msg: string): void {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`${timestamp} ${msg}`);
}

/**
 * Cross-platform sound playback.
 */
function playSound(soundPath: string, volume: number): void {
    const now = Date.now();
    if (now - lastPlayedTime < DEBOUNCE_MS) {
        log(`Debounced sound (${now - lastPlayedTime}ms since last)`);
        return;
    }
    lastPlayedTime = now;

    // Verify the sound file exists
    if (!fs.existsSync(soundPath)) {
        log(`ERROR: Sound file not found at: ${soundPath}`);
        vscode.window.showErrorMessage(`${LOG_PREFIX} Sound file not found: ${soundPath}`);
        return;
    }

    // Kill any currently playing sound to avoid overlap
    if (currentSoundProcess) {
        currentSoundProcess.kill();
        currentSoundProcess = null;
    }

    const platform = os.platform();
    let command: string;

    if (platform === 'darwin') {
        const vol = Math.max(0, Math.min(volume / 50, 2.0));
        command = `afplay -v ${vol} "${soundPath}"`;
    } else if (platform === 'win32') {
        command = `powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`;
    } else {
        command = `paplay "${soundPath}" 2>/dev/null || aplay "${soundPath}" 2>/dev/null || ffplay -nodisp -autoexit -loglevel quiet "${soundPath}"`;
    }

    log(`Playing sound: ${command}`);

    currentSoundProcess = exec(command, (error) => {
        currentSoundProcess = null;
        if (error && error.killed) {
            return; // intentionally killed
        }
        if (error) {
            log(`ERROR playing sound: ${error.message}`);
        }
    });
}

function getConfig() {
    const config = vscode.workspace.getConfiguration('terminalErrorSound');
    return {
        enabled: config.get<boolean>('enabled', true),
        volume: config.get<number>('volume', 75),
        customSoundPath: config.get<string>('soundFile', ''),
    };
}

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('Terminal Error Sound');
    context.subscriptions.push(outputChannel);

    try {

        log('Extension activating...');
        log(`Extension path: ${context.extensionPath}`);

        const defaultSoundPath = path.join(context.extensionPath, 'fahhhhh.mp3');
        log(`Default sound path: ${defaultSoundPath}`);
        log(`Sound file exists: ${fs.existsSync(defaultSoundPath)}`);

        // ── Status Bar ──
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'terminalErrorSound.toggle';
        updateStatusBar(getConfig().enabled);
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);

        // ── Toggle Command ──
        const toggleCmd = vscode.commands.registerCommand('terminalErrorSound.toggle', () => {
            const config = vscode.workspace.getConfiguration('terminalErrorSound');
            const current = config.get<boolean>('enabled', true);
            config.update('enabled', !current, vscode.ConfigurationTarget.Global);
            log(`Toggled to: ${!current}`);
        });
        context.subscriptions.push(toggleCmd);

        // ── Test Sound Command ──
        const testCmd = vscode.commands.registerCommand('terminalErrorSound.test', () => {
            const { volume, customSoundPath } = getConfig();
            const soundFile = customSoundPath || defaultSoundPath;
            log('Test sound command triggered');
            lastPlayedTime = 0; // Reset debounce for test
            playSound(soundFile, volume);
        });
        context.subscriptions.push(testCmd);

        // ── React to config changes ──
        const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('terminalErrorSound.enabled')) {
                updateStatusBar(getConfig().enabled);
            }
        });
        context.subscriptions.push(configWatcher);

        // ── Primary: Shell Integration event (stable API since VS Code 1.93) ──
        if (typeof vscode.window.onDidEndTerminalShellExecution === 'function') {
            log('✅ onDidEndTerminalShellExecution API is available — using exit code detection');

            const shellExecListener = vscode.window.onDidEndTerminalShellExecution(event => {
                const { enabled, volume, customSoundPath } = getConfig();
                if (!enabled) {
                    return;
                }

                log(`Command ended — exit code: ${event.exitCode}`);

                if (event.exitCode !== undefined && event.exitCode !== 0) {
                    const soundFile = customSoundPath || defaultSoundPath;
                    log(`🔊 Error detected (exit code ${event.exitCode}), playing sound`);
                    playSound(soundFile, volume);
                }
            });
            context.subscriptions.push(shellExecListener);
        } else {
            log('⚠️ onDidEndTerminalShellExecution API not available');

            // ── Fallback: text-based detection via onDidWriteTerminalData ──
            const w = vscode.window as any;
            if (typeof w.onDidWriteTerminalData === 'function') {
                log('✅ Falling back to onDidWriteTerminalData (text-matching mode)');

                const ERROR_PATTERNS = [
                    /\berror\b[:\s]/i,
                    /\bfatal\b[:\s]/i,
                    /\bexception\b[:\s]/i,
                    /\bfailed\b/i,
                    /\bcommand not found\b/i,
                    /\bno such file or directory\b/i,
                    /\bpermission denied\b/i,
                    /\bsegmentation fault\b/i,
                    /\bsyntax error\b/i,
                    /traceback \(most recent call last\)/i,
                ];

                const fallbackListener = w.onDidWriteTerminalData((e: any) => {
                    const { enabled, volume, customSoundPath } = getConfig();
                    if (!enabled) { return; }

                    const text: string = e.data;
                    for (const pattern of ERROR_PATTERNS) {
                        if (pattern.test(text)) {
                            const soundFile = customSoundPath || defaultSoundPath;
                            log(`🔊 Error pattern matched: ${pattern.source}`);
                            playSound(soundFile, volume);
                            break;
                        }
                    }
                });
                context.subscriptions.push(fallbackListener);
            } else {
                log('❌ No terminal error detection API available. Extension cannot function.');
                vscode.window.showWarningMessage(
                    `${LOG_PREFIX} Your VS Code version doesn't support terminal error detection. Please update to VS Code 1.93+.`
                );
            }
        }

        log('Extension activated successfully! ✅');

    } catch (err: any) {
        const msg = err?.message || String(err);
        log(`ACTIVATION ERROR: ${msg}`);
        vscode.window.showErrorMessage(`[Terminal Error Sound] Activation failed: ${msg}`);
    }
}

function updateStatusBar(enabled: boolean): void {
    if (enabled) {
        statusBarItem.text = '$(unmute) Error Sound';
        statusBarItem.tooltip = 'Terminal Error Sound: ON (click to toggle)';
    } else {
        statusBarItem.text = '$(mute) Error Sound';
        statusBarItem.tooltip = 'Terminal Error Sound: OFF (click to toggle)';
    }
}

export function deactivate() {
    if (currentSoundProcess) {
        currentSoundProcess.kill();
        currentSoundProcess = null;
    }
}
