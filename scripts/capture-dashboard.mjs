import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const dashboardUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const apiBaseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3000/api';
const artifactsDir = process.env.PLAYWRIGHT_ARTIFACTS ?? path.join('artifacts');

async function authenticate() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'director@demo', senha: 'Senha123!' }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao autenticar para screenshots: ${response.status} ${text}`);
  }

  const payload = await response.json();
  if (!payload?.data?.accessToken) {
    throw new Error('Resposta inesperada ao autenticar para screenshots.');
  }

  return payload.data.accessToken;
}

async function main() {
  const token = await authenticate();

  await fs.mkdir(artifactsDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript((storedToken) => {
    window.localStorage.setItem('accessToken', storedToken);
  }, token);

  const page = await context.newPage();
  await page.goto(dashboardUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="dashboard-kpis"]', { timeout: 30_000 });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(artifactsDir, 'dashboard-home.png'),
    fullPage: true,
  });

  const detailButton = await page.$('[data-testid="project-detail-button"]');
  if (detailButton) {
    await detailButton.click();
    await page.waitForSelector('[data-testid="project-detail-dialog"]', {
      timeout: 15_000,
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(artifactsDir, 'dashboard-projeto.png'),
      fullPage: true,
    });
  } else {
    console.warn('Nenhum projecto disponível para capturar detalhe.');
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
