/**
 * OmniRoute Tracking Snippet
 * ─────────────────────────
 * Minimal script customers embed in their site:
 *
 *   <script async src="https://your-omniroute-deployment/api/v1/track.js"
 *           data-omniroute-endpoint="https://your-omniroute-deployment"></script>
 *
 * It reports every pageview to the /api/v1/track endpoint, which classifies
 * the visitor server-side (human vs AI crawler vs agent vs answer-engine
 * referral) using request headers. No cookies, no PII, no client fingerprinting.
 */
(function () {
  'use strict';

  var script =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('track.js') !== -1) return scripts[i];
      }
      return null;
    })();

  var endpoint =
    (script && script.getAttribute('data-omniroute-endpoint')) ||
    (script ? new URL(script.src).origin : '');
  if (!endpoint) return;

  function report() {
    try {
      var payload = JSON.stringify({
        path: location.pathname + location.search,
        sessionId: (function () {
          // Anonymous per-browser session id — no cookies, sessionStorage only
          try {
            var k = 'omniroute_sid';
            var sid = sessionStorage.getItem(k);
            if (!sid) {
              sid = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
              sessionStorage.setItem(k, sid);
            }
            return sid;
          } catch (e) {
            return undefined;
          }
        })(),
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
