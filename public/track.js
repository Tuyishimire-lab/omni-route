/**
 * OmniRoute Tracking Tag
 * ──────────────────────
 * Drop this ONE tag into your site — replace yourdomain.com with your domain:
 *
 *   <script async src="https://omni-route-rho.vercel.app/api/v1/track.js?site=yourdomain.com"></script>
 *
 * The ?site= parameter tells OmniRoute which domain to attribute traffic to.
 * Reports pageviews to /api/v1/track, which classifies visitors server-side
 * (human vs AI crawler vs agent vs answer-engine referral) using request headers.
 * No cookies. No PII. No client fingerprinting. GDPR-safe.
 */
(function () {
  'use strict';

  // Locate this <script> element — works even when loaded async.
  var script =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('track.js') !== -1) return scripts[i];
      }
      return null;
    })();

  if (!script || !script.src) return;

  var scriptUrl;
  try { scriptUrl = new URL(script.src); } catch (e) { return; }

  // ?site=yourdomain.com  — the domain OmniRoute will attribute traffic to.
  var siteDomain = scriptUrl.searchParams.get('site') || null;

  // OmniRoute deployment origin — same origin as track.js by default.
  // Backwards-compatible with the old data-omniroute-endpoint attribute.
  var endpoint =
    script.getAttribute('data-omniroute-endpoint') ||
    scriptUrl.origin;

  function report() {
    try {
      var payload = JSON.stringify({
        path: location.pathname + location.search,
        // Anonymous per-browser session id — no cookies, sessionStorage only.
        sessionId: (function () {
          try {
            var k = 'omniroute_sid';
            var sid = sessionStorage.getItem(k);
            if (!sid) {
              sid = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
              sessionStorage.setItem(k, sid);
            }
            return sid;
          } catch (e) { return undefined; }
        })(),
        // Explicit domain — avoids relying on the Host header when the
        // customer site and OmniRoute are on different origins.
        domain: siteDomain,
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          endpoint + '/api/v1/track',
          new Blob([payload], { type: 'application/json' })
        );
      } else {
        fetch(endpoint + '/api/v1/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {
      /* never break the host page */
    }
  }

  if (document.readyState === 'complete') {
    report();
  } else {
    window.addEventListener('load', report, { once: true });
  }
})();
