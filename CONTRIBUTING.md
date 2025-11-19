# Contributing to Skyteck ERP Solutions

Thank you for your interest in contributing to Skyteck ERP Solutions! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- Docker and Docker Compose
- Git

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ZentERPSolutions
```

2. Copy environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start the development environment:
```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 3000
- Frontend on port 5173

### Local Development (without Docker)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Development Workflow

1. Create a feature branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Run tests and linting:
```bash
# Backend
cd backend
npm run lint
npm test

# Frontend
cd frontend
npm run lint
```

4. Commit your changes (follow conventional commits):
```bash
git commit -m "feat: add new feature"
```

5. Push and create a Pull Request

## Code Style

- Backend: ESLint and Prettier are configured
- Frontend: ESLint is configured
- Run `npm run format` (backend) or `npm run lint:fix` to auto-format code

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

## Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Request review from maintainers
4. Address review comments
5. Once approved, maintainers will merge

## Questions?

Feel free to open an issue for any questions or concerns.

