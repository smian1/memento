# Contributing to Memento

Thank you for your interest in contributing! This guide will help you get started with contributing to the project.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git
- A Limitless AI account with API access

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/memento.git
   cd memento
   ```

2. **Set up your environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Add your Limitless API key to .env
   # Get your key from: https://www.limitless.ai/developers
   ```

3. **Install dependencies and run**
   ```bash
   ./run.sh
   ```

4. **Verify everything works**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/docs
   - Sync test: `cd backend && python3 sync.py --dry-run`

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
   # Test backend
   cd backend && python3 -m pytest  # If you add tests

   # Test frontend
   cd frontend && npm run build

   # Test full integration
   ./run.sh
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

#### Python (Backend)
- Follow PEP 8 style guide
- Use type hints for function parameters and return types
- Add docstrings for all functions and classes
- Keep functions focused and small
- Use meaningful variable names

Example:
```python
def extract_action_items(content: str, date: str) -> List[str]:
    """Extract action items from daily insight content.

    Args:
        content: The markdown content to parse
        date: The date string (YYYY-MM-DD format)

    Returns:
        List of extracted action item strings
    """
    # Implementation here
```

#### TypeScript/React (Frontend)
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
- [ ] Tested locally with ./run.sh
- [ ] Frontend builds without errors
- [ ] Backend API endpoints work
- [ ] Sync functionality tested

## Screenshots (if applicable)
Add screenshots for UI changes
```

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment details**
   - OS and version
   - Python version
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
├── backend/
│   ├── app.py              # FastAPI main application & routes
│   ├── database.py         # SQLAlchemy models & database setup
│   ├── schemas.py          # Pydantic models for validation
│   ├── crud.py             # Database operations (Create, Read, Update, Delete)
│   ├── sync.py             # Limitless AI API integration
│   ├── sync_manager.py     # Sync logic & data extraction
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Main React application
│   │   ├── api/client.ts   # API client & TypeScript types
│   │   └── components/     # React components
│   └── package.json        # Node.js dependencies
└── docs/                   # Documentation files
```

### Key Components

- **Database Models**: Defined in `database.py` using SQLAlchemy
- **API Endpoints**: Defined in `app.py` using FastAPI
- **Data Sync**: Logic in `sync_manager.py` for Limitless AI integration
- **Frontend State**: Managed in React components with useState/useEffect
- **Styling**: CSS-in-JS approach with glass-morphism design

## 🧪 Testing

### Running Tests

```bash
# Backend tests (if available)
cd backend && python3 -m pytest

# Frontend tests
cd frontend && npm test

# Integration tests
./run.sh  # Verify everything starts correctly
```

### Adding Tests

When adding new features:

1. **Backend**: Add tests for new API endpoints and functions
2. **Frontend**: Add tests for new components and utilities
3. **Integration**: Verify the feature works end-to-end

## 📚 Documentation

### Code Documentation
- Add docstrings to all Python functions
- Add JSDoc comments to complex TypeScript functions
- Include examples in documentation

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