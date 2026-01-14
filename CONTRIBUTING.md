# Contributing to Claude Code Watcher

Thank you for your interest in contributing! This document provides guidelines for contributing to Claude Code Watcher.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone git@github.com:YOUR_USERNAME/claude-code-watcher.git`
3. Install dependencies: `npm install`
4. Run in development: `npm start`

## Development Workflow

### Running Locally

```bash
npm start
```

### Building

```bash
# macOS
npm run build:dir

# Windows (untested)
npm run build:win

# Linux (untested)
npm run build:linux
```

## Code Style

- Keep it simple (KISS principle)
- No build step for frontend - vanilla HTML/CSS/JS
- Use clear, descriptive variable names
- Add comments for non-obvious logic

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly on your platform
4. Commit with a clear message: `git commit -m "Add feature X"`
5. Push to your fork: `git push origin feature/your-feature`
6. Open a Pull Request

### Pull Request Guidelines

- Describe what your PR does and why
- Reference any related issues
- Include screenshots for UI changes
- Keep PRs focused - one feature/fix per PR

## Reporting Issues

When reporting bugs, please include:

- Operating system and version
- Node.js version (`node --version`)
- Steps to reproduce
- Expected vs actual behavior
- Any error messages from the console (Cmd+Option+I)

## Architecture Notes

Before contributing, please read the architecture section in README.md to understand:

- How the hook system works
- The session registry mechanism
- IPC communication between main and renderer

## Questions?

Open an issue with the "question" label if you need help getting started.
