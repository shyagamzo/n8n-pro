# Workspace Scripts & IDE Configuration

## Available Scripts

The workspace is configured with exactly 5 essential tasks:

### 1. **Build** (`yarn build`)
- **Purpose**: Compile TypeScript and build the extension for production
- **Command**: `tsc && vite build`
- **Output**: Creates `dist/` directory with all extension files
- **Usage**: Run before loading extension in browser

### 2. **Watch** (`yarn watch`)
- **Purpose**: Build in watch mode for development
- **Command**: `vite build --watch`
- **Output**: Automatically rebuilds when files change
- **Usage**: Run during development for continuous building

### 3. **Test** (`yarn test`)
- **Purpose**: Run tests (placeholder for future test implementation)
- **Command**: `echo "No tests specified yet" && exit 0`
- **Output**: Placeholder message
- **Usage**: Ready for test framework integration

### 4. **Lint** (`yarn lint`)
- **Purpose**: Check code quality with ESLint
- **Command**: `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 100`
- **Output**: Code quality warnings and errors
- **Usage**: Run to check code standards compliance

### 5. **Clean** (`yarn clean`)
- **Purpose**: Remove build artifacts
- **Command**: `rm -rf dist || echo 'Clean completed (some files may be in use)'`
- **Output**: Removes `dist/` directory
- **Usage**: Clean workspace before fresh build

## IDE Integration

### VSCode Tasks (`.vscode/tasks.json`)
All 5 scripts are available as VSCode tasks:
- **Build**: Default build task (Ctrl+Shift+P → "Tasks: Run Build Task")
- **Watch**: Background build task for development
- **Test**: Test runner task
- **Lint**: Code quality checker with ESLint problem matcher
- **Clean**: Clean workspace task

### VSCode Launch Configurations (`.vscode/launch.json`)
Debug configurations for:
- **Debug Extension (Chrome)**: Debug the extension in Chrome
- **Debug Panel (Chrome)**: Debug the React panel
- **Debug Background Worker**: Attach to service worker
- **Debug n8n Integration**: Debug n8n integration features

### VSCode Settings (`.vscode/settings.json`)
- TypeScript preferences and auto-imports
- ESLint integration with auto-fix on save
- Proper indentation (4 spaces for code, 2 for JSON)
- File associations and search exclusions

## Development Workflow

### Typical Development Session:
1. **Start**: `yarn watch` (for continuous building)
2. **Code**: Make changes to source files
3. **Check**: `yarn lint` (verify code quality)
4. **Test**: `yarn test` (when tests are implemented)
5. **Build**: `yarn build` (for production)
6. **Clean**: `yarn clean` (when needed)

### Extension Development:
1. **Build**: `yarn build`
2. **Load**: Load `dist/` directory as unpacked extension in Chrome
3. **Debug**: Use VSCode debug configurations
4. **Iterate**: Use `yarn watch` for continuous development

## Build Tool Configuration

### Vite (`vite.config.ts`)
- **Entry Points**: background, content, panel, options, popup
- **Output**: Browser extension optimized bundles
- **Target**: ES2020 for modern browsers
- **Minification**: Terser for production builds
- **Source Maps**: Enabled for debugging

### TypeScript (`tsconfig.json`)
- **Target**: ES2020 with modern features
- **Strict Mode**: Enabled for type safety
- **Path Mapping**: Configured for clean imports
- **Browser Types**: Chrome extension and DOM types

### ESLint (`eslint.config.js`)
- **Modern Config**: ESLint v9 flat config format
- **TypeScript**: Full TypeScript support
- **React**: React and React Hooks rules
- **Browser Globals**: Chrome extension APIs
- **Code Quality**: Strict rules with development warnings

## File Structure

```
/workspaces/n8n-pro/
├── package.json          # Scripts and dependencies
├── vite.config.ts        # Build configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.js      # Code quality rules
├── .vscode/              # IDE configuration
│   ├── tasks.json        # VSCode tasks
│   ├── launch.json       # Debug configurations
│   └── settings.json     # Workspace settings
├── src/                  # Source code
├── dist/                 # Build output (generated)
└── public/               # Static assets
```

## Quick Reference

| Task | Command | Purpose |
|------|---------|---------|
| Build | `yarn build` | Production build (minified) |
| Build Dev | `yarn build:dev` | Development build (readable) |
| Watch | `yarn watch` | Development build with file watching |
| Test | `yarn test` | Run tests |
| Lint | `yarn lint` | Check code quality |
| Clean | `yarn clean` | Remove build files |

## Development vs Production Builds

### Development Build (`yarn build:dev` / `yarn watch`)
- **No minification** - Code remains readable and debuggable
- **Preserved function names** - Better stack traces and debugging
- **Larger file sizes** - Easier to read and debug
- **Source maps** - Full debugging support
- **Perfect for development** - Use during coding and testing

### Production Build (`yarn build`)
- **Minified with Terser** - Optimized for size and performance
- **Obfuscated code** - Smaller file sizes, harder to read
- **Source maps** - Still available for debugging if needed
- **Optimized for deployment** - Use for final releases

### When to Use Which
- **Development**: Use `yarn watch` for active development
- **Testing**: Use `yarn build:dev` for testing readable code
- **Release**: Use `yarn build` for production deployment

All tasks are aligned across package.json scripts, VSCode tasks, and build tools for consistent development experience.
