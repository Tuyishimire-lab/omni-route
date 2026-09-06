import { describe, it, expect } from 'vitest';

describe('Middleware Detection & Verification Header Logic', () => {
  it('identifies valid OmniRoute middleware verification headers', () => {
    const headers = new Headers();
    headers.set('x-omniroute-tracked', '1');

    const isMiddlewareDetected =
      headers.get('x-omniroute-tracked') === '1' ||
      headers.get('x-omniroute-middleware') === '1' ||
      headers.get('x-omniroute-edge') === '1';

    expect(isMiddlewareDetected).toBe(true);
  });

  it('rejects responses without OmniRoute middleware headers', () => {
    const headers = new Headers();
    headers.set('content-type', 'text/html');

    const isMiddlewareDetected =
      headers.get('x-omniroute-tracked') === '1' ||
      headers.get('x-omniroute-middleware') === '1' ||
      headers.get('x-omniroute-edge') === '1';

    expect(isMiddlewareDetected).toBe(false);
  });

  it('supports alternative middleware diagnostic headers', () => {
    const headers1 = new Headers({ 'x-omniroute-middleware': '1' });
    const headers2 = new Headers({ 'x-omniroute-edge': '1' });

    expect(headers1.get('x-omniroute-middleware')).toBe('1');
    expect(headers2.get('x-omniroute-edge')).toBe('1');
  });
});
