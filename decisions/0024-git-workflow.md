# Decision Record: Git Workflow

## Git Workflow Strategy

### Branching Model: Git Flow
- **Main Branch**: `main` - Production-ready code
- **Development Branch**: `develop` - Integration branch for features
- **Feature Branches**: `✨/*` - New features and enhancements
- **Hotfix Branches**: `🐛/*` - Critical bug fixes for production
- **Release Branches**: `🚀/*` - Release preparation and stabilization

### Branch Naming Conventions
```
✨/chat-panel-ui
✨/agent-orchestrator
✨/n8n-api-integration
🐛/chat-message-persistence
🚀/v1.0.0
```

## Commit Message Standards

### Conventional Commits
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **build**: Build system changes

### Commit Emojis
- **🤖**: AI instructions, Cursor rules, automation
- **💭**: Decisions, brainstorms, planning documentation
- **✨**: New features
- **🐛**: Bug fixes
- **📚**: Documentation
- **🎨**: Code style/formatting
- **♻️**: Refactoring
- **⚡**: Performance improvements
- **🔧**: Configuration changes
- **🧪**: Tests
- **🐳**: Docker, DevContainer, container related

### Commit Examples
```bash
# Feature commits
feat(chat): add message streaming support
✨ feat(chat): add message streaming support

# Bug fix commits
fix(api): handle n8n connection timeout
🐛 fix(api): handle n8n connection timeout

# Documentation commits
docs(api): add n8n client usage examples
📚 docs(api): add n8n client usage examples

# Decision commits
docs(decisions): define state management strategy
💭 docs(decisions): define state management strategy

# AI/Rules commits
feat(rules): add ambiguity handling guidelines
🤖 feat(rules): add ambiguity handling guidelines
```

## Pull Request Process

### PR Requirements
- **Descriptive Title**: Clear, concise title describing the change
- **Detailed Description**: Explain what, why, and how
- **Linked Issues**: Reference related issues with `Fixes #123`
- **Screenshots**: For UI changes, include before/after screenshots
- **Testing**: Describe how the change was tested
- **Breaking Changes**: Document any breaking changes

### PR Template
```markdown
## Description
Brief description of the changes in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Related Issues
Fixes #123
Closes #456

## Changes Made
- List specific changes made
- Include any new files or major modifications
- Note any dependencies added or removed

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Extension loads correctly in Chrome/Edge
- [ ] n8n integration works as expected

## Screenshots (if applicable)
Before:
[Add screenshot]

After:
[Add screenshot]

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
- [ ] Performance impact considered
```

### PR Review Process
1. **Self Review**: Author reviews their own PR first
2. **Automated Checks**: CI/CD runs tests and linting
3. **Peer Review**: At least one team member reviews
4. **Approval**: PR requires approval before merging
5. **Merge**: Use "Squash and merge" for feature branches

## Release Process

### Version Numbering
Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow
1. **Create Release Branch**: `git checkout -b release/v1.0.0`
2. **Update Version**: Update version in `package.json` and `manifest.json`
3. **Update Changelog**: Add release notes to `CHANGELOG.md`
4. **Final Testing**: Comprehensive testing on release branch
5. **Merge to Main**: Merge release branch to `main`
6. **Tag Release**: Create git tag `v1.0.0`
7. **Merge to Develop**: Merge release branch to `develop`
8. **Build Package**: Create extension package for distribution

### Changelog Format
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-01-15

### Added
- Initial release of n8n AI Assistant Extension
- Chat panel with AI-powered workflow creation
- n8n API integration for workflow management
- Support for Chrome and Edge browsers

### Changed
- Updated to use OpenAI GPT-5 model
- Improved error handling for API failures

### Fixed
- Fixed chat message persistence issue
- Resolved n8n connection timeout problems

## [0.9.0] - 2024-01-01

### Added
- Beta release with core functionality
- Basic workflow creation capabilities
```

## Git Hooks

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting
yarn lint

# Run type checking
yarn type-check

# Run tests
yarn test

# Check commit message format
yarn commitlint --edit $1
```

### Commit Message Hook
```bash
#!/bin/sh
# .git/hooks/commit-msg

# Validate commit message format
yarn commitlint --edit $1
```

## Branch Protection Rules

### Main Branch Protection
- **Require PR Reviews**: At least 1 approval required
- **Dismiss Stale Reviews**: Dismiss reviews when new commits are pushed
- **Require Status Checks**: All CI checks must pass
- **Require Up-to-date Branches**: Branch must be up-to-date before merging
- **Restrict Pushes**: No direct pushes to main branch

### Develop Branch Protection
- **Require PR Reviews**: At least 1 approval required
- **Require Status Checks**: All CI checks must pass
- **Allow Force Pushes**: Allow force pushes for rebasing

## Development Workflow

### Feature Development
1. **Create Feature Branch**: `git checkout -b ✨/new-feature`
2. **Develop Feature**: Make commits following conventions
3. **Push Branch**: `git push origin ✨/new-feature`
4. **Create PR**: Open pull request to `develop`
5. **Review & Merge**: After review and approval, merge to `develop`

### Hotfix Process
1. **Create Hotfix Branch**: `git checkout -b 🐛/critical-bug`
2. **Fix Bug**: Make minimal changes to fix the issue
3. **Test Fix**: Ensure fix works and doesn't break anything
4. **Create PR**: Open pull request to `main`
5. **Merge & Tag**: Merge to main and create patch release
6. **Backport**: Merge fix to `develop` branch

### Release Preparation
1. **Create Release Branch**: `git checkout -b 🚀/v1.0.0`
2. **Final Testing**: Comprehensive testing and bug fixes
3. **Update Documentation**: Ensure all docs are up-to-date
4. **Version Bump**: Update version numbers
5. **Create PR**: Open PR to `main` for final review
6. **Release**: Merge and create release tag

## Git Configuration

### Recommended Git Config
```bash
# Set up user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up default branch name
git config --global init.defaultBranch main

# Set up pull strategy
git config --global pull.rebase false

# Set up push strategy
git config --global push.default simple

# Set up aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

## Open Items
- **Automated Release**: Set up automated release process
- **Branch Cleanup**: Automated cleanup of merged branches
- **Commit Signing**: Implement commit signing for security
- **Git LFS**: Consider Git LFS for large files
