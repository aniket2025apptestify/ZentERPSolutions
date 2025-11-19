const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Prisma 7 reads DATABASE_URL from environment automatically
// The connection URL is configured in prisma.config.ts for migrations
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;

