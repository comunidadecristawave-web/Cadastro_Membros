// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORTA = Number(process.env.PORT || 4173);

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }
  ],
  webServer: {
    command: 'node servidor-estatico.js',
    url: `http://127.0.0.1:${PORTA}/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORTA) },
    timeout: 15_000
  }
});
