const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const MONITOR_SCRIPT_JS = path.join(CLAUDE_DIR, 'monitor.js');
const MONITOR_SCRIPT_SH = path.join(CLAUDE_DIR, 'monitor.sh');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    icon: path.join(__dirname, 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      app.dock.setIcon(icon);
    }
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================
// Monitor script content (embedded Node.js version)
// ============================================
const MONITOR_SCRIPT_CONTENT = `#!/usr/bin/env node
// Claude Code monitoring hook - cross-platform Node.js version
// Manages active sessions for Claude Code Watcher

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const LOG_FILE = path.join(CLAUDE_DIR, 'events.jsonl');
const SESSIONS_FILE = path.join(CLAUDE_DIR, 'active-sessions.json');
const CURRENT_TRANSCRIPT_FILE = path.join(CLAUDE_DIR, 'current-transcript.txt');
const LOCK_FILE = path.join(CLAUDE_DIR, 'active-sessions.lock');

// Read stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => inputData += chunk);
process.stdin.on('end', () => {
  try {
    processHook(inputData);
  } catch (e) {
    // Silently fail - don't break Claude Code
    process.exit(0);
  }
});

function processHook(rawInput) {
  const input = JSON.parse(rawInput);
  const eventType = process.argv[2] || 'unknown';
  const sessionId = input.session_id || 'unknown';
  const toolName = input.tool_name || input.tool || 'unknown';
  const timestamp = Date.now();

  // Log event
  const logEntry = JSON.stringify({
    ts: timestamp,
    event: eventType,
    session: sessionId,
    tool: toolName,
    data: input
  });
  fs.appendFileSync(LOG_FILE, logEntry + '\\n');

  // Track active sessions
  const transcriptPath = input.transcript_path;
  if (transcriptPath && sessionId && sessionId !== 'unknown') {
    fs.writeFileSync(CURRENT_TRANSCRIPT_FILE, transcriptPath);
    updateActiveSessions(sessionId, transcriptPath, input.cwd || 'unknown');
  }
}

function updateActiveSessions(sessionId, transcriptPath, cwd) {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - 300; // 5 min expiry
  const projectName = path.basename(cwd);

  // Simple file-based locking for cross-platform support
  let lockFd;
  try {
    lockFd = fs.openSync(LOCK_FILE, 'w');
  } catch (e) {
    return; // Can't acquire lock, skip update
  }

  try {
    let sessions = [];
    try {
      const existing = fs.readFileSync(SESSIONS_FILE, 'utf8');
      sessions = JSON.parse(existing);
    } catch (e) {
      sessions = [];
    }

    // Filter expired sessions and remove current session (will re-add)
    sessions = sessions.filter(s => s.lastSeen > cutoff && s.id !== sessionId);

    // Add current session
    sessions.push({
      id: sessionId,
      path: transcriptPath,
      name: projectName,
      lastSeen: now
    });

    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  } finally {
    fs.closeSync(lockFd);
  }
}
`;

// ============================================
// Setup check and installation
// ============================================
function checkSetupStatus() {
  const result = {
    claudeDirExists: false,
    scriptExists: false,
    hooksConfigured: false,
    details: {}
  };

  // Check if .claude directory exists
  result.claudeDirExists = fs.existsSync(CLAUDE_DIR);
  if (!result.claudeDirExists) {
    return result;
  }

  // Check if monitor script exists (either .js or .sh)
  result.scriptExists = fs.existsSync(MONITOR_SCRIPT_JS) || fs.existsSync(MONITOR_SCRIPT_SH);
  result.details.hasJsScript = fs.existsSync(MONITOR_SCRIPT_JS);
  result.details.hasShScript = fs.existsSync(MONITOR_SCRIPT_SH);

  // Check if hooks are configured in settings.json
  // Accept either monitor.js or monitor.sh in hook commands
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      const hooks = settings.hooks || {};

      const hasMonitorHook = (cmd) => cmd?.includes('monitor.js') || cmd?.includes('monitor.sh');

      // Check if our monitor hooks are present
      const hasPreToolHook = (hooks.PreToolUse || []).some(h =>
        h.hooks?.some(hk => hasMonitorHook(hk.command))
      );
      const hasPostToolHook = (hooks.PostToolUse || []).some(h =>
        h.hooks?.some(hk => hasMonitorHook(hk.command))
      );
      const hasStopHook = (hooks.Stop || []).some(h =>
        h.hooks?.some(hk => hasMonitorHook(hk.command))
      );

      result.hooksConfigured = hasPreToolHook && hasPostToolHook && hasStopHook;
      result.details.hooks = { hasPreToolHook, hasPostToolHook, hasStopHook };
    }
  } catch (e) {
    result.details.error = e.message;
  }

  return result;
}

function runSetup() {
  const result = { success: false, steps: [] };

  try {
    // Step 1: Ensure .claude directory exists
    if (!fs.existsSync(CLAUDE_DIR)) {
      fs.mkdirSync(CLAUDE_DIR, { recursive: true });
      result.steps.push('Created ~/.claude directory');
    }

    // Step 2: Write monitor.js script
    fs.writeFileSync(MONITOR_SCRIPT_JS, MONITOR_SCRIPT_CONTENT, { mode: 0o755 });
    result.steps.push('Created monitor.js script');

    // Step 3: Update settings.json with hooks (merge with existing)
    let settings = {};
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      }
    } catch (e) {
      settings = {};
    }

    // Initialize hooks structure if needed
    if (!settings.hooks) settings.hooks = {};

    // Define our monitoring hooks
    const monitorHook = (eventType) => ({
      type: 'command',
      command: `node "$HOME/.claude/monitor.js" ${eventType}`
    });

    // Merge hooks for each event type
    const hookTypes = {
      PreToolUse: 'pre_tool',
      PostToolUse: 'post_tool',
      Stop: 'stop'
    };

    for (const [hookType, eventArg] of Object.entries(hookTypes)) {
      if (!settings.hooks[hookType]) {
        settings.hooks[hookType] = [];
      }

      // Find or create the wildcard matcher entry
      let wildcardEntry = settings.hooks[hookType].find(h => h.matcher === '*');
      if (!wildcardEntry) {
        wildcardEntry = { matcher: '*', hooks: [] };
        settings.hooks[hookType].push(wildcardEntry);
      }

      // Remove any existing monitor.js hooks (to avoid duplicates)
      wildcardEntry.hooks = (wildcardEntry.hooks || []).filter(h =>
        !h.command?.includes('monitor.js')
      );

      // Add our monitor hook
      wildcardEntry.hooks.push(monitorHook(eventArg));
    }

    // Write updated settings
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    result.steps.push('Configured hooks in settings.json');

    result.success = true;
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

function runUninstall() {
  const result = { success: false, steps: [] };

  try {
    // Step 1: Remove monitor hooks from settings.json
    if (fs.existsSync(SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));

      if (settings.hooks) {
        const hookTypes = ['PreToolUse', 'PostToolUse', 'Stop'];

        for (const hookType of hookTypes) {
          if (settings.hooks[hookType]) {
            for (const entry of settings.hooks[hookType]) {
              if (entry.hooks) {
                // Remove any monitor.js or monitor.sh hooks
                entry.hooks = entry.hooks.filter(h =>
                  !h.command?.includes('monitor.js') && !h.command?.includes('monitor.sh')
                );
              }
            }
            // Remove empty matcher entries
            settings.hooks[hookType] = settings.hooks[hookType].filter(entry =>
              entry.hooks && entry.hooks.length > 0
            );
            // Remove empty hook type arrays
            if (settings.hooks[hookType].length === 0) {
              delete settings.hooks[hookType];
            }
          }
        }

        // Remove empty hooks object
        if (Object.keys(settings.hooks).length === 0) {
          delete settings.hooks;
        }
      }

      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
      result.steps.push('Removed hooks from settings.json');
    }

    // Step 2: Delete monitor scripts (both .js and .sh)
    if (fs.existsSync(MONITOR_SCRIPT_JS)) {
      fs.unlinkSync(MONITOR_SCRIPT_JS);
      result.steps.push('Deleted monitor.js');
    }
    if (fs.existsSync(MONITOR_SCRIPT_SH)) {
      fs.unlinkSync(MONITOR_SCRIPT_SH);
      result.steps.push('Deleted monitor.sh');
    }

    // Step 3: Clean up session files
    const sessionsFile = path.join(CLAUDE_DIR, 'active-sessions.json');
    if (fs.existsSync(sessionsFile)) {
      fs.unlinkSync(sessionsFile);
      result.steps.push('Deleted active-sessions.json');
    }

    result.success = true;
  } catch (e) {
    result.error = e.message;
  }

  return result;
}

// ============================================
// IPC Handlers
// ============================================

// Setup handlers
ipcMain.handle('check-setup', async () => {
  return checkSetupStatus();
});

ipcMain.handle('run-setup', async () => {
  return runSetup();
});

ipcMain.handle('run-uninstall', async () => {
  return runUninstall();
});

// File reading handlers
ipcMain.handle('read-sessions', async () => {
  const filePath = path.join(CLAUDE_DIR, 'active-sessions.json');
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '[]';
  }
});

ipcMain.handle('read-transcript', async (event, relativePath) => {
  // Validate path to prevent directory traversal attacks
  if (!relativePath || typeof relativePath !== 'string') {
    return '';
  }

  // Normalize and resolve the path
  const normalizedPath = path.normalize(relativePath);

  // Block any path traversal attempts
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    console.warn('Blocked path traversal attempt:', relativePath);
    return '';
  }

  // Only allow paths within projects/ directory
  if (!normalizedPath.startsWith('projects' + path.sep) && !normalizedPath.startsWith('projects/')) {
    console.warn('Blocked access outside projects directory:', relativePath);
    return '';
  }

  const filePath = path.join(CLAUDE_DIR, normalizedPath);

  // Double-check the resolved path is still within CLAUDE_DIR
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(CLAUDE_DIR + path.sep)) {
    console.warn('Blocked path escape attempt:', relativePath);
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return '';
  }
});
