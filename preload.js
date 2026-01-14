/**
 * Preload script for Claude Code Watcher
 * Exposes a safe API to the renderer process via contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed IPC channels
const validChannels = [
  'check-setup',
  'run-setup',
  'run-uninstall',
  'read-sessions',
  'read-transcript'
];

contextBridge.exposeInMainWorld('api', {
  /**
   * Check if monitoring hooks are set up
   * @returns {Promise<{claudeDirExists: boolean, scriptExists: boolean, hooksConfigured: boolean, details: object}>}
   */
  checkSetup: () => ipcRenderer.invoke('check-setup'),

  /**
   * Install monitoring hooks and script
   * @returns {Promise<{success: boolean, steps: string[], error?: string}>}
   */
  runSetup: () => ipcRenderer.invoke('run-setup'),

  /**
   * Uninstall monitoring hooks and clean up
   * @returns {Promise<{success: boolean, steps: string[], error?: string}>}
   */
  runUninstall: () => ipcRenderer.invoke('run-uninstall'),

  /**
   * Read the active sessions registry
   * @returns {Promise<string>} JSON string of active sessions array
   */
  readSessions: () => ipcRenderer.invoke('read-sessions'),

  /**
   * Read a transcript file by relative path
   * @param {string} relativePath - Path relative to ~/.claude/
   * @returns {Promise<string>} Transcript file contents
   */
  readTranscript: (relativePath) => ipcRenderer.invoke('read-transcript', relativePath)
});
