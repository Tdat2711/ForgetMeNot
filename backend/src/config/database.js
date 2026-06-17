// backend/src/config/database.js
const { PrismaClient } = require('@prisma/client');

class Database {
  constructor() {
    if (!Database.instance) {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
        errorFormat: 'pretty',
      });
      Database.instance = this;
    }
    return Database.instance;
  }

  get client() {
    return this.prisma;
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      return this.prisma;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('Database disconnected');
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new Database();