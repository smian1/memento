import { drizzle } from 'drizzle-orm/better-sqlite3';
import { createDatabaseConnection, runMigrations } from './init.js';

const sqlite = createDatabaseConnection();
runMigrations(sqlite);

export const db = drizzle(sqlite);
export { sqlite as rawConnection };
