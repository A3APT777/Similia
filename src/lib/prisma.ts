import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  // Pool: 20 соединений, timeout 10 сек (дефолт 5 connections слишком мало)
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=20&pool_timeout=10',
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
