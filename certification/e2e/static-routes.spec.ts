import { test, expect } from '@playwright/test';

test.describe('Static Routes Integrity (SSR)', () => {
  test('manifest.json should return 200 and valid JSON', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Ferragano One');
  });

  test('robots.txt should return 200 and plain text', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('User-agent: *');
  });

  test('healthcheck should return 200', async ({ request }) => {
    const response = await request.get('/api/public/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
