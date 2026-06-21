import { defineConfig } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT || 3456);
const baseURL = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: `npm run dev -- -p ${e2ePort}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      APP_NAME: 'JasMail',
      JMAP_SERVER_URL: 'https://mail.example.test',
    },
  },
});