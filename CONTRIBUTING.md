# Contributing to Memento

Thank you for your interest in contributing! This guide will help you get started with contributing to the project.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommend the latest 20.x LTS)
- npm
- Git
- A Limitless AI account with API access

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/memento2.git
   cd memento
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the unified dev server**
   ```bash
   npm run dev
   ```

4. **Verify everything works**
   - App + API: http://localhost:3000
   - Complete the onboarding flow (admin user, timezone, Limitless API key)

## 🛠️ Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style and patterns
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Type-check and build the server + client bundles
   npm run build

   # Optional: run the dev server for a manual smoke test
   npm run dev
   ```

4. **Commit with clear messages**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

#### TypeScript/React
- Use TypeScript for all new code
- Follow React best practices (hooks, functional components)
- Use meaningful component and variable names
- Add comments for complex UI logic
- Keep components focused and reusable

Example:
```typescript
interface ActionItemProps {
  item: ActionItem;
  onComplete: (id: string) => void;
}

/**
 * ActionItem component for displaying and managing action items
 */
const ActionItemComponent: React.FC<ActionItemProps> = ({ item, onComplete }) => {
  // Implementation here
};
```

## 📝 Contribution Guidelines

### What to Contribute

**🎉 Welcome contributions:**
- Bug fixes
- Performance improvements
- New features (discuss first in issues)
- Documentation improvements
- Test coverage improvements
- UI/UX enhancements
- Accessibility improvements

**💬 Discuss first:**
- Major architectural changes
- Breaking changes
- New dependencies
- Significant UI redesigns

### Pull Request Process

1. **Check existing issues** - Make sure you're not duplicating work
2. **Create an issue** for new features to discuss the approach
3. **Keep PRs focused** - One feature or fix per PR
4. **Write clear descriptions** - Explain what and why, not just how
5. **Add tests** if applicable
6. **Update documentation** if needed

### PR Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Other (please describe)

## Testing
- [ ] Tested locally with `npm run dev`
- [ ] `npm run build` succeeds
- [ ] Sync functionality verified (if applicable)

## Screenshots (if applicable)
Add screenshots for UI changes
```

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment details**
   - OS and version
   - Node.js version
   - Browser (for frontend issues)

2. **Steps to reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if helpful

3. **Logs and errors**
   - Console errors
   - Server logs
   - Network errors

### Feature Requests

For new features:

1. **Describe the problem** you're trying to solve
2. **Proposed solution** with implementation ideas
3. **Alternatives considered**
4. **Additional context** about use cases

## 🏗️ Project Structure

Understanding the codebase:

```
memento/
├── server/
│   ├── src/
│   │   ├── app.ts         # Express app + middleware
│   │   ├── index.ts       # Vite integration + cron scheduler
│   │   ├── routes/        # REST endpoints
│   │   ├── services/      # Sync/auth/data helpers
│   │   └── db/            # Drizzle schema + bootstrap
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Onboarding gate + auth provider
│   │   ├── DashboardApp.tsx
│   │   ├── components/    # React UI components
│   │   ├── contexts/      # Shared state
│   │   └── utils/         # Formatting helpers
│   ├── onboarding.css     # First-run styling
│   └── vite.config.ts
├── data/                  # Local SQLite database (gitignored)
├── package.json
└── README.md
```

### Key Components

- **Server**: Express + TypeScript, Drizzle ORM, better-sqlite3
- **Sync**: `syncService.ts` handles insights and lifelog imports from Limitless
- **Client**: React + Vite with onboarding, calendar, consolidated views
- **Styling**: Custom CSS with dark-theme glassmorphism

## 🧪 Testing

- We don't ship automated tests yet. Before opening a PR, run `npm run build` to ensure TypeScript compilation succeeds and launch `npm run dev` for a quick smoke test.
- If you add tests, colocate server suites under `server/src/__tests__/` (Vitest/Jest) and client suites under `frontend/src/__tests__/` (Vitest + Testing Library). Add npm scripts so the team can execute them easily.

## 📚 Documentation

### Code Documentation
- Add inline comments or docblocks for complex TypeScript logic
- Update README/AGENTS when workflows or architecture shift

### README Updates
- Update feature lists when adding new capabilities
- Add troubleshooting steps for new issues
- Update setup instructions if requirements change

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Be Helpful
- Help newcomers get started
- Share knowledge and experience
- Provide context in your contributions
- Ask questions when something is unclear

## ❓ Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Create a GitHub Issue
- **Feature requests**: Create a GitHub Issue with the "enhancement" label
- **Security issues**: Email maintainers privately

## 🎉 Recognition

Contributors are recognized in:
- README.md acknowledgments
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for contributing to making personal knowledge management better for everyone! 🚀
