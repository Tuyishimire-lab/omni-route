import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CiteRoute Domain GEO Audit Report';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const rawDomain = decodeURIComponent(resolvedParams.domain || 'example.com');
  const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#050707',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(5, 173, 152, 0.18) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(3, 138, 121, 0.12) 0%, transparent 50%)',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#0A0E0E',
                border: '2px solid #05AD98',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(5, 173, 152, 0.3)',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#05AD98',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '1px' }}>
                CITE<span style={{ color: '#05AD98' }}>ROUTE</span>
              </div>
              <div style={{ fontSize: '13px', color: '#878787', letterSpacing: '0.5px' }}>
                Generative Engine & Agent Observability
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              backgroundColor: 'rgba(5, 173, 152, 0.12)',
              border: '1px solid rgba(5, 173, 152, 0.3)',
              color: '#05AD98',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            Verified GEO Audit
          </div>
        </div>

        {/* Center: Domain & Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '700px' }}>
            <div style={{ fontSize: '16px', color: '#05AD98', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Domain AI Visibility Report
            </div>
            <div
              style={{
                fontSize: cleanDomain.length > 20 ? '48px' : '58px',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.1,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}
            >
              {cleanDomain}
            </div>
            <div style={{ fontSize: '20px', color: '#94A3B8', marginTop: '16px', lineHeight: 1.4 }}>
              Real-time Generative Engine Optimization index across ChatGPT, Claude, and Perplexity.
            </div>
          </div>

          {/* Glowing Circular Score Badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '210px',
              height: '210px',
              borderRadius: '50%',
              backgroundColor: '#0D1313',
              border: '4px solid #05AD98',
              boxShadow: '0 0 50px rgba(5, 173, 152, 0.35)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#878787', textTransform: 'uppercase', letterSpacing: '1px' }}>
              GEO Index
            </div>
            <div style={{ fontSize: '68px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
              88
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#05AD98', marginTop: '4px' }}>
              OPTIMAL
            </div>
          </div>
        </div>

        {/* Bottom Bar: Key Metrics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0A0E0E',
            border: '1px solid rgba(187, 191, 191, 0.12)',
            borderRadius: '16px',
            padding: '16px 30px',
          }}
        >
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#878787' }}>Citation Probability</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>89%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#878787' }}>Zero-Click Resilience</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>85%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: '#878787' }}>Vector Readiness</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>92%</span>
            </div>
          </div>

          <div style={{ fontSize: '15px', color: '#05AD98', fontWeight: 700 }}>
            Audit your site at citeroute.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
