# Skyteck ERP Solutions

A modern ERP solution built with React, Node.js, Express, and PostgreSQL.

## 🚀 Quick Start

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

3. Update `.env` files with your configuration (especially `DATABASE_URL` and `JWT_SECRET`)

4. Start the development environment:
```bash
docker-compose up
```

This will start:
- **PostgreSQL** database on port `5432`
- **Backend API** on port `3000`
- **Frontend** on port `5173`

Access the application at: http://localhost:5173

## 📁 Project Structure

```
ZentERPSolutions/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── app.js           # Express app configuration
│   │   └── server.js        # Server entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── Dockerfile.dev       # Development Dockerfile
├── frontend/                # React/Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── services/        # API services
│   │   └── App.jsx          # Main app component
│   └── Dockerfile.dev       # Development Dockerfile
├── docker-compose.yml       # Docker Compose configuration
└── CONTRIBUTING.md          # Contribution guidelines
```

## 🛠️ Development

### Backend

```bash
cd backend
npm install
npm run dev          # Start development server
npm test             # Run tests
npm run lint         # Run linter
npm run prisma:studio # Open Prisma Studio
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
```

## 🗄️ Database

The project uses PostgreSQL with Prisma ORM.

### Prisma Commands

```bash
cd backend
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

## 🐳 Docker

### Start all services:
```bash
docker-compose up
```

### Start in detached mode:
```bash
docker-compose up -d
```

### Stop services:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs -f
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `API_URL` - API base URL

### Frontend (.env)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.
