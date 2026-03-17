import path from 'path';
import { initializeDatabase, closeDatabase } from '../src/database/connection';
import { runSeeds } from '../src/database/seeds';

const workerId = process.env.JEST_WORKER_ID || '1';
const testDbPath = path.resolve(__dirname, `../data/test-monitoring-${workerId}.db`);

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
  process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
  process.env.DATABASE_PATH = testDbPath;

  await initializeDatabase();
  await runSeeds();
});

afterAll(async () => {
  closeDatabase();
});

jest.setTimeout(30000);
