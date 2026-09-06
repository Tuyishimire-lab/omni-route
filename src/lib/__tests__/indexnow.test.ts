import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_INDEXNOW_KEY,
  DEFAULT_HOST,
  CORE_CITEROUTE_URLS,
  submitToIndexNow,
} from '../indexnow';

describe('IndexNow Protocol Client', () => {
  it('has the correct configured key and host', () => {
    expect(DEFAULT_INDEXNOW_KEY).toBe('afd4693d327c47b3852cece74c5d52ab');
    expect(DEFAULT_HOST).toBe('www.citeroute.com');
    expect(CORE_CITEROUTE_URLS.length).toBeGreaterThanOrEqual(8);
  });

  it('submits URLs to IndexNow API endpoint with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });
    vi.stubGlobal('fetch', mockFetch);

    const testUrls = ['https://www.citeroute.com/', 'https://www.citeroute.com/docs'];
    const result = await submitToIndexNow(testUrls);

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.submittedUrls).toEqual(testUrls);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: 'www.citeroute.com',
          key: 'afd4693d327c47b3852cece74c5d52ab',
          keyLocation: 'https://www.citeroute.com/afd4693d327c47b3852cece74c5d52ab.txt',
          urlList: testUrls,
        }),
      })
    );

    vi.unstubAllGlobals();
  });
});
