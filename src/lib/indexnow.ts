/**
 * IndexNow Protocol Client
 * ────────────────────────
 * Enables instant search engine notification (Bing, Yandex, Seznam, Naver)
 * whenever pages are published or updated on CiteRoute.
 *
 * Spec: https://www.indexnow.org/documentation
 */

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

export interface IndexNowResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
  submittedUrls: string[];
}

export const DEFAULT_INDEXNOW_KEY = 'afd4693d327c47b3852cece74c5d52ab';
export const DEFAULT_HOST = 'www.citeroute.com';

export const CORE_CITEROUTE_URLS = [
  'https://www.citeroute.com/',
  'https://www.citeroute.com/docs',
  'https://www.citeroute.com/docs/install',
  'https://www.citeroute.com/manifest',
  'https://www.citeroute.com/audit',
  'https://www.citeroute.com/leaderboard',
  'https://www.citeroute.com/benchmark',
  'https://www.citeroute.com/pricing',
  'https://www.citeroute.com/analytics',
  'https://www.citeroute.com/about',
];

/**
 * Submits an array of URLs to the IndexNow protocol.
 */
export async function submitToIndexNow(
  urls: string[] = CORE_CITEROUTE_URLS,
  apiKey: string = process.env.INDEXNOW_API_KEY || DEFAULT_INDEXNOW_KEY,
  host: string = DEFAULT_HOST
): Promise<IndexNowResponse> {
  const payload: IndexNowPayload = {
    host,
    key: apiKey,
    keyLocation: `https://${host}/${apiKey}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // 200 OK or 202 Accepted means search engines received the index request
    const success = res.status === 200 || res.status === 202;

    return {
      success,
      statusCode: res.status,
      message: success
        ? `Successfully submitted ${urls.length} URLs to IndexNow.`
        : `IndexNow responded with HTTP ${res.status}`,
      submittedUrls: urls,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `IndexNow submission failed: ${errorMsg}`,
      submittedUrls: urls,
    };
  }
}
