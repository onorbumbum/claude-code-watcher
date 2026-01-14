# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-14

### Fixed

- Fix black screen on app launch caused by variable naming conflict with contextBridge

## [1.0.0] - 2026-01-14

### Added

- Initial release
- Real-time monitoring of Claude Code sessions
- Multi-session tab support
- Automatic hook installation on first run
- Dark and light theme support
- Settings menu for hook management
- Support for viewing:
  - Assistant messages
  - Extended thinking
  - Tool calls (Bash, Read, Edit, Write, Grep, Glob, Task)
  - Tool results
  - User messages

### Security

- Secure Electron configuration with context isolation
- Path validation for transcript reading
- IPC communication via preload script
