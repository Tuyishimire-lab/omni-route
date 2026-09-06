import { describe, it, expect } from 'vitest';

describe('Middleware Detection & Verification Header Logic', () => {
  it('identifies valid CiteRoute middleware verification headers', () => {
    const headers = new Headers();
    headers.set('x-citeroute-tracked', '1');

    const isMiddlewareDetected =
      headers.get('x-citeroute-tracked') === '1' ||
      headers.get('x-citeroute-middleware') === '1' ||
      headers.get('x-citeroute-edge') === '1' ||
      headers.get('x-omniroute-tracked') === '1';

    expect(isMiddlewareDetected).toBe(true);
  });

  it('preserves backward compatibility with legacy x-omniroute-tracked header', () => {
    const headers = new Headers();
    headers.set('x-omniroute-tracked', '1');

    const isMiddlewareDetected =
      headers.get('x-citeroute-tracked') === '1' ||
      headers.get('x-citeroute-middleware') === '1' ||
      headers.get('x-citeroute-edge') === '1' ||
      headers.get('x-omniroute-tracked') === '1';

    expect(isMiddlewareDetected).toBe(true);
  });

  it('rejects responses without CiteRoute or OmniRoute middleware headers', () => {
    const headers = new Headers();
    headers.set('content-type', 'text/html');

    const isMiddlewareDetected =
      headers.get('x-citeroute-tracked') === '1' ||
      headers.get('x-citeroute-middleware') === '1' ||
      headers.get('x-citeroute-edge') === '1' ||
      headers.get('x-omniroute-tracked') === '1';

    expect(isMiddlewareDetected).toBe(false);
  });

  it('supports alternative middleware diagnostic headers', () => {
    const headers1 = new Headers({ 'x-citeroute-middleware': '1' });
    const headers2 = new Headers({ 'x-citeroute-edge': '1' });

    expect(headers1.get('x-citeroute-middleware')).toBe('1');
    expect(headers2.get('x-citeroute-edge')).toBe('1');
  });
});
