import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://test_user:test_pass@localhost:5432/fantasy_football_test';

// Mock external services
jest.mock('axios');
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  })),
}));

// Global test setup
beforeAll(async () => {
  // Database setup for tests would go here
});

afterAll(async () => {
  // Database cleanup for tests would go here
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});