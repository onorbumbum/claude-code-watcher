# Installation Guide

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS (Apple Silicon) | **Tested** | Primary development platform |
| macOS (Intel) | Untested | Should work, may need `--arch x64` flag |
| Linux | Untested | Should work with minor adjustments |
| Windows | Untested | Should work with minor adjustments |

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** - Included with Node.js
- **Claude Code CLI** - Must be installed and configured

Verify installation:
```bash
node --version   # Should be v18.x or higher
npm --version    # Should be v9.x or higher
claude --version # Should show Claude Code version
```

---

## macOS Installation (Tested)

### Option 1: Quick Install (Recommended)

```bash
# Clone or download the project
cd ~
git clone https://github.com/onorbumbum/claude-code-watcher.git .claude-monitor
# Or if you have the files already:
# mkdir -p ~/.claude-monitor && cd ~/.claude-monitor

# Install dependencies
cd ~/.claude-monitor
npm install

# Build the app
npm run build:dir

# Copy to Applications
cp -R dist/mac-arm64/"Claude Code Watcher.app" /Applications/

# IMPORTANT: Remove macOS quarantine (required for unsigned apps)
xattr -cr /Applications/"Claude Code Watcher.app"

# Launch
open /Applications/"Claude Code Watcher.app"
```

### macOS Gatekeeper Warning

Since the app isn't notarized with Apple, macOS will block it by default. You'll see one of these warnings:
- "App is damaged and can't be opened"
- "Can't be opened because it's from an unidentified developer"

**Solution (choose one):**

```bash
# Option 1: Remove quarantine attribute (recommended)
xattr -cr /Applications/"Claude Code Watcher.app"

# Option 2: Remove quarantine from wherever you built it
xattr -cr ~/.claude-monitor/dist/mac-arm64/"Claude Code Watcher.app"
```

Or manually: Right-click the app → **Open** → Click **"Open"** in the security dialog.

This only needs to be done once per installation.

### Option 2: Run in Development Mode

```bash
cd ~/.claude-monitor
npm install
npm start
```

### First Launch

1. The app will show a **Setup Screen** on first launch
2. Click **"Setup Monitoring"** to install hooks automatically
3. The dashboard will appear once setup completes
4. Run any Claude Code command to see sessions appear

---

## Linux Installation (Untested)

> **Note:** This has not been tested. Please report issues.

### Install Dependencies

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm

# Arch
sudo pacman -S nodejs npm
```

### Build and Run

```bash
# Clone or download the project
cd ~
git clone https://github.com/onorbumbum/claude-code-watcher.git .claude-monitor

# Install dependencies
cd ~/.claude-monitor
npm install

# Build for Linux
npm run build:linux

# The built app will be in dist/linux-unpacked/
# Run it directly:
./dist/linux-unpacked/claude-code-watcher

# Or create a desktop shortcut (optional)
```

### Create Desktop Entry (Optional)

```bash
cat > ~/.local/share/applications/claude-code-watcher.desktop << 'EOF'
[Desktop Entry]
Name=Claude Code Watcher
Exec=/home/YOUR_USERNAME/.claude-monitor/dist/linux-unpacked/claude-code-watcher
Icon=/home/YOUR_USERNAME/.claude-monitor/logo.png
Type=Application
Categories=Development;
EOF
```

Replace `YOUR_USERNAME` with your actual username.

---

## Windows Installation (Untested)

> **Note:** This has not been tested. Please report issues.

### Prerequisites

1. Install Node.js from [nodejs.org](https://nodejs.org/) (LTS version)
2. Open **PowerShell** or **Command Prompt**

### Build and Run

```powershell
# Clone or download the project to your user folder
cd %USERPROFILE%
git clone https://github.com/onorbumbum/claude-code-watcher.git .claude-monitor

# Navigate to the project
cd %USERPROFILE%\.claude-monitor

# Install dependencies
npm install

# Build for Windows
npm run build:win

# The built app will be in dist\win-unpacked\
# Run it:
.\dist\win-unpacked\Claude Code Watcher.exe
```

### Windows-Specific Notes

- The `~/.claude/` directory on Windows is typically `C:\Users\YOUR_USERNAME\.claude\`
- Claude Code CLI must be installed and working on Windows first
- You may need to adjust path separators in the monitor script if issues occur

---

## Post-Installation Setup

After installing and launching the app:

### Automatic Setup (Recommended)

1. Launch the app
2. Click **"Setup Monitoring"** on the welcome screen
3. The app will:
   - Create `~/.claude/monitor.js`
   - Configure hooks in `~/.claude/settings.json`
4. Start using Claude Code - sessions will appear automatically

### Manual Setup (If Automatic Fails)

If the automatic setup doesn't work, you can set up manually:

1. **Create the monitor script**

   The monitor script is embedded in `main.js`. Extract it or copy from the app's setup function.

2. **Configure hooks in `~/.claude/settings.json`**

   Add or merge these hooks:
   ```json
   {
     "hooks": {
       "PreToolUse": [{
         "matcher": "*",
         "hooks": [{ "type": "command", "command": "node \"$HOME/.claude/monitor.js\" pre_tool" }]
       }],
       "PostToolUse": [{
         "matcher": "*",
         "hooks": [{ "type": "command", "command": "node \"$HOME/.claude/monitor.js\" post_tool" }]
       }],
       "Stop": [{
         "matcher": "*",
         "hooks": [{ "type": "command", "command": "node \"$HOME/.claude/monitor.js\" stop" }]
       }]
     }
   }
   ```

   On Windows, use:
   ```json
   "command": "node \"%USERPROFILE%\\.claude\\monitor.js\" pre_tool"
   ```

---

## Troubleshooting

### macOS: "App is damaged" or "unidentified developer"

This is expected for unsigned apps. Fix with:
```bash
xattr -cr /Applications/"Claude Code Watcher.app"
```
Then try opening again. See [macOS Gatekeeper Warning](#macos-gatekeeper-warning) above.

### App won't start

```bash
# Check Node.js version
node --version  # Must be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try running in dev mode to see errors
npm start
```

### No sessions appearing

1. Verify Claude Code is working: `claude --version`
2. Check hooks are installed: `cat ~/.claude/settings.json`
3. Check monitor script exists: `ls ~/.claude/monitor.js`
4. Run a Claude Code command and check: `cat ~/.claude/active-sessions.json`

### "Setup Monitoring" button doesn't work

1. Check the app has write permissions to `~/.claude/`
2. Try manual setup (see above)
3. Check the console for errors: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Win/Linux)

### Build fails on Linux/Windows

```bash
# Clear Electron cache
rm -rf ~/.cache/electron

# Reinstall
npm install

# Try building again
npm run build:linux  # or build:win
```

### Hooks not firing

```bash
# Test the monitor script manually
echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl","cwd":"/tmp"}' | node ~/.claude/monitor.js pre_tool

# Check if events are being logged
cat ~/.claude/events.jsonl
```

---

## Uninstalling

### Remove the App

**macOS:**
```bash
rm -rf /Applications/"Claude Code Watcher.app"
rm -rf ~/.claude-monitor
```

**Linux:**
```bash
rm -rf ~/.claude-monitor
rm ~/.local/share/applications/claude-code-watcher.desktop
```

**Windows:**
```powershell
Remove-Item -Recurse -Force %USERPROFILE%\.claude-monitor
```

### Remove Hooks (Optional)

Use the app's Settings menu > "Uninstall Hooks", or manually edit `~/.claude/settings.json` to remove the monitor hooks.

---

## Getting Help

- Check the [README.md](README.md) for detailed documentation
- Open an issue on GitHub for bugs or feature requests
- For Claude Code issues, see [Claude Code documentation](https://docs.anthropic.com/claude-code)
