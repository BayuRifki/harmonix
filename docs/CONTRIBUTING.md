# Contributing to Harmonix

> **First time contributing?** Welcome! Start by reading [`PLANNING.md`](PLANNING.md) to understand the project goals, and [`ARCHITECTURE.md`](ARCHITECTURE.md) to understand the system design.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Commit Convention](#commit-convention)
7. [Branch Strategy](#branch-strategy)
8. [Pull Request Process](#pull-request-process)
9. [Issue Guidelines](#issue-guidelines)
10. [Adding a New Source](#adding-a-new-source)

---

## Code of Conduct

This project follows the [Contributor Covenant](../CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## How Can I Contribute?

There are many ways to contribute, and not all of them require writing code:

- 🐛 **Report bugs** via [GitHub Issues](../../issues)
- 💡 **Suggest features** via [GitHub Issues](../../issues)
- 📝 **Improve documentation** (typos, clarity, examples)
- 🌍 **Translate** the UI (post-MVP)
- 💻 **Submit code** (fixes, features, refactors)
- 🎨 **Design** icons, splash screens, or UI mockups
- 🧪 **Test** pre-release builds and report issues
- 💬 **Help others** in [GitHub Discussions](../../discussions)

---

## Development Setup

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Git**
- A code editor (VS Code recommended)

### Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/BayuRifki/harmonix.git
cd harmonix

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env if you need Spotify credentials (Phase 3+)

# 4. Run in development mode
npm run dev
```

### Useful Commands

```bash
npm run dev          # Start Electron in dev mode with HMR
npm run build        # Build renderer + main process
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler
npm run test         # Run unit tests
npm run test:e2e     # Run e2e tests (Playwright)
npm run format       # Format code with Prettier
npm run dist:win     # Build Windows installer
npm run dist:mac     # Build macOS installer
npm run dist:linux   # Build Linux installer
```

---

## Project Structure

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full breakdown. Key directories:

- `electron/main/sources/` — Music source adapters
- `src/features/` — React feature modules
- `src/stores/` — Zustand state stores
- `docs/ADR/` — Architecture Decision Records

---

## Coding Standards

### TypeScript

- **Strict mode is required.** No `any` unless absolutely necessary (and commented).
- Use **explicit return types** for public functions.
- Prefer **interfaces** over type aliases for object shapes.
- Use **enums** sparingly; prefer string literal unions.

### React

- **Functional components** with hooks only. No class components.
- **Custom hooks** for reusable logic.
- **Co-locate** component files (component, styles, tests in one folder when possible).
- Use **Zustand** for state, not Redux or Context (unless you have a good reason).

### Styling

- **Tailwind CSS** for styling. Avoid inline styles.
- **CSS modules** or Tailwind for component-specific styles.
- **No global CSS** except in `src/index.css`.

### File Naming

- React components: `PascalCase.tsx` (e.g., `PlayerBar.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `usePlayer.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDuration.ts`)
- Types: `PascalCase.ts` (e.g., `Track.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

### Comments

> **Note**: The project follows a no-comments policy by default. Code should be self-documenting through clear naming. Only add comments when the code is genuinely complex or non-obvious.

If you must add a comment:

- Use **JSDoc** for public APIs.
- Use `// TODO:` for incomplete work.
- Use `// FIXME:` for known bugs.

### Imports

- **Absolute imports** for cross-module references (configured in `tsconfig.json`).
- **Relative imports** only within the same module.

Example:

```typescript
// ✅ Good
import { Track } from '@/types';
import { usePlayer } from '@/hooks/usePlayer';

// ❌ Avoid
import { Track } from '../../../types';
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). This enables automatic changelog generation and clear history.

### Format

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types

| Type       | Description                                             | Example                                           |
| ---------- | ------------------------------------------------------- | ------------------------------------------------- |
| `feat`     | New feature                                             | `feat(player): add shuffle mode`                  |
| `fix`      | Bug fix                                                 | `fix(search): handle empty query gracefully`      |
| `docs`     | Documentation only                                      | `docs(readme): update install instructions`       |
| `style`    | Code style (formatting, missing semicolons)             | `style(player): fix indentation`                  |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(sources): extract common adapter logic` |
| `test`     | Add or update tests                                     | `test(player): add unit tests for queue`          |
| `chore`    | Build process, dependencies, or auxiliary tools         | `chore(deps): bump electron to 30.1`              |
| `perf`     | Performance improvement                                 | `perf(audio): cache EQ filter coefficients`       |

### Scope

The scope should be the module or feature affected:

- `player`, `library`, `search`, `playlist`, `eq`, `sources`, `spotify`, `ytmusic`, `local`, `ui`, `docs`, `ci`, `deps`

### Examples

```bash
git commit -m "feat(player): add repeat mode (one/all/off)"
git commit -m "fix(search): prevent crash on empty results"
git commit -m "docs(sources): add Jamendo adapter guide"
git commit -m "chore(deps): update zustand to 4.5.0"
```

---

## Branch Strategy

We use a simplified Git Flow:

- **`main`** — Production-ready code. Protected.
- **`develop`** — Integration branch for the next release.
- **`feature/<name>`** — New features (branch from `develop`)
- **`fix/<name>`** — Bug fixes (branch from `develop`)
- **`docs/<name>`** — Documentation changes (branch from `develop`)
- **`chore/<name>`** — Maintenance tasks (branch from `develop`)

### Example Workflow

```bash
# Start a new feature
git checkout develop
git pull
git checkout -b feature/source-jamendo

# Make changes, commit
git add .
git commit -m "feat(sources): add Jamendo adapter"

# Push and open PR
git push origin feature/source-jamendo
gh pr create --base develop
```

---

## Pull Request Process

1. **Create a feature branch** from `develop` (see above).
2. **Make your changes** following the coding standards.
3. **Write or update tests** for your changes.
4. **Run the full check suite locally**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
5. **Update documentation** if you changed public APIs or behavior.
6. **Update [`CHANGELOG.md`](../CHANGELOG.md)** in the `[Unreleased]` section.
7. **Open a PR** against `develop` using the [PR template](../../.github/PULL_REQUEST_TEMPLATE.md).
8. **Wait for CI** to pass and request a review.
9. **Address review feedback** promptly.
10. **Squash and merge** once approved.

### PR Title

PR titles should follow the same convention as commit messages:

```
feat(player): add shuffle mode
```

---

## Issue Guidelines

### Bug Reports

Use the [Bug Report template](../../.github/ISSUE_TEMPLATE/bug_report.md). Include:

- **Clear title** describing the bug
- **Steps to reproduce**
- **Expected vs. actual behavior**
- **Screenshots** (if applicable)
- **Environment**: OS, Node version, app version
- **Logs** (if relevant)

### Feature Requests

Use the [Feature Request template](../../.github/ISSUE_TEMPLATE/feature_request.md). Include:

- **Problem statement** — What are you trying to accomplish?
- **Proposed solution** — How should it work?
- **Alternatives considered**
- **Use cases** — Who benefits and how?

### New Source Proposals

Use the [New Source template](../../.github/ISSUE_TEMPLATE/new_source.md). Include:

- **Source name and website**
- **Official API availability** (Yes/No, link to docs)
- **Authentication requirements**
- **Legal considerations** (ToS allows third-party apps?)
- **Your willingness to implement** (Yes/No)

---

## Adding a New Source

See [`SOURCES.md`](SOURCES.md) for a complete guide. Quick checklist:

- [ ] Implement `MusicSource` interface
- [ ] Add to `sources/registry.ts`
- [ ] Add tests
- [ ] Update `.env.example` if config is needed
- [ ] Add documentation in `SOURCES.md`
- [ ] Update `LEGAL.md` if there are compliance considerations

---

## Questions?

- 💬 [GitHub Discussions](../../discussions) — General questions
- 🐛 [GitHub Issues](../../issues) — Bug reports and feature requests
- 📖 [Documentation](.) — Read the docs first

---

**Thank you for contributing to Harmonix!** 🎵
