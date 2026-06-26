import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// DATABASE_URL must be set at runtime (not build time).
// Next.js evaluates this module during build — don't throw here,
// only fail when an actual DB call is made without the variable.
const connectionString = process.env.DATABASE_URL ?? '';

const client = postgres(connectionString || 'postgresql://localhost/placeholder', {
  prepare: false,
  ssl: connectionString ? 'require' : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // When there's no real connection string, prevent actual connections
  ...(connectionString ? {} : { max: 0 }),
});

export const db = drizzle(client, { schema });
