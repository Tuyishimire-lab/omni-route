import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface SendResetEmailParams {
  to: string;
  resetUrl: string;
  userName?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: SendResetEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute Security <onboarding@resend.dev>';
  const recipientName = userName ? userName : 'there';

  // Development / test fallback when RESEND_API_KEY is not configured
  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Security] Password Reset Link Generated');
    console.log(` To: ${to}`);
    console.log(` Reset URL: ${resetUrl}`);
    console.log(' (Set RESEND_API_KEY in .env.local to deliver live emails)');
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'RESEND_API_KEY is not set in production environment.',
      };
    }

    return { success: true, id: 'dev-mock-id' };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your CiteRoute Password</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.2);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine & Agent Observability
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Reset Your Password
              </h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                Hello ${recipientName},
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                We received a request to reset the password for your CiteRoute account. Click the button below to choose a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#05AD98,#038a79);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:12px;line-height:1.5;color:#64748B;">
                This link will expire in <strong>30 minutes</strong> for your security. If you did not request this password reset, no action is needed and your account remains safe.
              </p>

              <hr style="border:none;border-top:1px solid rgba(187,191,191,0.1);margin:24px 0;" />

              <p style="margin:0;font-size:11px;line-height:1.5;color:#64748B;">
                If the button above does not work, copy and paste this URL into your browser:
              </p>
              <p style="margin:6px 0 0 0;font-size:11px;line-height:1.4;word-break:break-all;">
                <a href="${resetUrl}" style="color:#05AD98;text-decoration:none;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;background-color:#0A0E0E;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#64748B;">
                CiteRoute Platform | Questions? Reach us at <a href="mailto:tuyishime1angel@gmail.com" style="color:#05AD98;text-decoration:none;">tuyishime1angel@gmail.com</a>
              </p>
              <p style="margin:0;font-size:10px;color:#475569;">
                &copy; ${new Date().getFullYear()} CiteRoute. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Reset Your CiteRoute Password\n\nHello ${recipientName},\n\nWe received a request to reset the password for your CiteRoute account. Visit the link below to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes. If you did not request this, please ignore this email.\n\nSupport: tuyishime1angel@gmail.com`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'tuyishime1angel@gmail.com',
      subject: 'Reset your CiteRoute password',
      html,
      text,
    });

    if (error) {
      console.error('[email] Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[email] Exception while sending reset email:', err);
    return { success: false, error: message };
  }
}

export interface SendWelcomeEmailParams {
  to: string;
  userName?: string;
}

export async function sendWelcomeEmail({
  to,
  userName,
}: SendWelcomeEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute <onboarding@resend.dev>';
  const recipientName = userName ? userName : 'there';
  const dashboardUrl = 'https://www.citeroute.com/dashboard';

  // Development / test fallback when RESEND_API_KEY is not configured
  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Onboarding] Welcome Email Triggered');
    console.log(` To: ${to}`);
    console.log(` Recipient: ${recipientName}`);
    console.log(` Dashboard URL: ${dashboardUrl}`);
    console.log(' (Set RESEND_API_KEY in .env.local to deliver live emails)');
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'RESEND_API_KEY is not set in production environment.',
      };
    }

    return { success: true, id: 'dev-welcome-id' };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CiteRoute</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.2);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine & Agent Observability
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Welcome to CiteRoute, ${recipientName}!
              </h1>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                Search is moving from blue links to direct AI answers. CiteRoute gives you the real-time telemetry, Generative Engine Optimization (GEO) scoring, and citation analytics needed to win visibility across ChatGPT, Claude, and Perplexity.
              </p>

              <!-- 3-Step Guide -->
              <div style="background-color:#0A0E0E;border:1px solid rgba(187,191,191,0.12);border-radius:12px;padding:20px;margin:24px 0;">
                <div style="font-size:12px;font-weight:700;color:#05AD98;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">
                  Quick Start Guide
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="top" style="width:24px;padding-right:12px;font-size:13px;font-weight:700;color:#05AD98;">1.</td>
                    <td style="padding-bottom:12px;font-size:13px;line-height:1.5;color:#E2E8F0;">
                      <strong>Run a GEO Scan:</strong> Audit your domain to uncover your baseline citation rate, zero-click resilience, and vector readiness.
                    </td>
                  </tr>
                  <tr>
                    <td valign="top" style="width:24px;padding-right:12px;font-size:13px;font-weight:700;color:#05AD98;">2.</td>
                    <td style="padding-bottom:12px;font-size:13px;line-height:1.5;color:#E2E8F0;">
                      <strong>Install the Snippet:</strong> Add the one-line CiteRoute telemetry tag to monitor autonomous AI agent crawlers in real-time.
                    </td>
                  </tr>
                  <tr>
                    <td valign="top" style="width:24px;padding-right:12px;font-size:13px;font-weight:700;color:#05AD98;">3.</td>
                    <td style="font-size:13px;line-height:1.5;color:#E2E8F0;">
                      <strong>Track Citations:</strong> Watch crawler visits transform into citations, brand mentions, and referral traffic.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#05AD98,#038a79);">
                    <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      Open Your Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748B;">
                Need assistance setting up your domain or configuring crawler rules? Reply directly to this email or reach us anytime at <a href="mailto:tuyishime1angel@gmail.com" style="color:#05AD98;text-decoration:none;">tuyishime1angel@gmail.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;background-color:#0A0E0E;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#64748B;">
                CiteRoute Platform | Generative Engine & Agent Observability
              </p>
              <p style="margin:0;font-size:10px;color:#475569;">
                &copy; ${new Date().getFullYear()} CiteRoute. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Welcome to CiteRoute, ${recipientName}!\n\nSearch is moving from blue links to direct AI answers. CiteRoute gives you the real-time telemetry, Generative Engine Optimization (GEO) scoring, and citation analytics needed to win visibility across ChatGPT, Claude, and Perplexity.\n\nQuick Start Guide:\n1. Run a GEO Scan: Audit your domain to uncover your baseline citation rate and vector readiness.\n2. Install the Snippet: Add the one-line CiteRoute telemetry tag to monitor autonomous AI agent crawlers in real-time.\n3. Track Citations: Watch crawler visits transform into citations, brand mentions, and referral traffic.\n\nOpen your dashboard: ${dashboardUrl}\n\nQuestions? Reach us at tuyishime1angel@gmail.com`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'tuyishime1angel@gmail.com',
      subject: 'Welcome to CiteRoute | Generative Engine Observability',
      html,
      text,
    });

    if (error) {
      console.error('[email] Welcome email Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[email] Exception while sending welcome email:', err);
    return { success: false, error: message };
  }
}

export interface MonitoredDomainDigest {
  domain: string;
  geoScore: number;
  trendDelta: number;
  citationRate: number;
  crawlerVisits?: number;
}

export interface SendWeeklyDigestParams {
  to: string;
  userName?: string;
  domains: MonitoredDomainDigest[];
}

export async function sendWeeklyDigestEmail({
  to,
  userName,
  domains,
}: SendWeeklyDigestParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute <alerts@resend.dev>';
  const recipientName = userName ? userName : 'there';
  const dashboardUrl = 'https://www.citeroute.com/dashboard';

  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Digest] Weekly GEO Digest Triggered');
    console.log(` To: ${to}`);
    console.log(` Domains Monitored: ${domains.map((d) => d.domain).join(', ')}`);
    console.log(' (Set RESEND_API_KEY in .env.local to deliver live emails)');
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'RESEND_API_KEY is not set in production environment.',
      };
    }

    return { success: true, id: 'dev-digest-id' };
  }

  const domainRowsHtml = domains
    .map((d) => {
      const deltaText =
        d.trendDelta > 0
          ? `<span style="color:#05AD98;font-weight:bold;">▲ +${d.trendDelta} pts</span>`
          : d.trendDelta < 0
          ? `<span style="color:#F59E0B;font-weight:bold;">▼ ${d.trendDelta} pts</span>`
          : `<span style="color:#94A3B8;">— Flat</span>`;

      return `
      <tr style="border-bottom:1px solid rgba(187,191,191,0.08);">
        <td style="padding:14px 10px;font-family:monospace;font-size:13px;color:#FFFFFF;font-weight:600;">
          ${d.domain}
        </td>
        <td style="padding:14px 10px;text-align:center;font-size:14px;font-weight:800;color:#05AD98;">
          ${d.geoScore}<span style="font-size:10px;color:#878787;">/100</span>
        </td>
        <td style="padding:14px 10px;text-align:center;font-size:12px;">
          ${deltaText}
        </td>
        <td style="padding:14px 10px;text-align:right;font-size:12px;color:#E2E8F0;font-weight:600;">
          ${d.citationRate}%
        </td>
      </tr>
    `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly CiteRoute GEO Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.2);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:30px 32px 20px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Weekly AI Observability Digest
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Weekly GEO Performance Update
              </h1>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#CBD5E1;">
                Hello ${recipientName}, here is how your monitored domains performed across ChatGPT, Claude, and Perplexity in the past 7 days:
              </p>

              <!-- Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0E0E;border:1px solid rgba(187,191,191,0.12);border-radius:12px;overflow:hidden;margin:20px 0;">
                <thead>
                  <tr style="border-bottom:1px solid rgba(187,191,191,0.12);background-color:#070A0A;">
                    <th align="left" style="padding:10px 10px;font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:0.5px;">Domain</th>
                    <th align="center" style="padding:10px 10px;font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:0.5px;">GEO Index</th>
                    <th align="center" style="padding:10px 10px;font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:0.5px;">7-Day Change</th>
                    <th align="right" style="padding:10px 10px;font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:0.5px;">Citations</th>
                  </tr>
                </thead>
                <tbody>
                  ${domainRowsHtml}
                </tbody>
              </table>

              <!-- Tip of the Week -->
              <div style="background-color:#0A0E0E;border-left:3px solid #05AD98;padding:14px 16px;border-radius:6px;margin:24px 0;">
                <div style="font-size:11px;font-weight:700;color:#05AD98;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                  GEO Optimization Tip
                </div>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#BBBFBF;">
                  AI search engines favor structured markdown summaries. Ensure your <strong>/llms.txt</strong> file is active and lists your primary documentation links.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#05AD98,#038a79);">
                    <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:13px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      View Live Telemetry Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 26px 32px;background-color:#0A0E0E;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#64748B;">
                CiteRoute Platform | Generative Engine & Agent Observability
              </p>
              <p style="margin:0;font-size:10px;color:#475569;">
                &copy; ${new Date().getFullYear()} CiteRoute. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textSummary = domains
    .map((d) => `- ${d.domain}: GEO Score ${d.geoScore}/100 (${d.trendDelta >= 0 ? '+' : ''}${d.trendDelta} pts), Citations: ${d.citationRate}%`)
    .join('\n');

  const text = `Your Weekly CiteRoute GEO Performance Update\n\nHello ${recipientName},\n\nHere is how your monitored domains performed across ChatGPT, Claude, and Perplexity this week:\n\n${textSummary}\n\nView your live dashboard: ${dashboardUrl}\n\nQuestions? Reach us at tuyishime1angel@gmail.com`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'tuyishime1angel@gmail.com',
      subject: `Weekly GEO Digest: ${domains[0]?.domain || 'Your Monitored Domains'} Performance`,
      html,
      text,
    });

    if (error) {
      console.error('[email] Weekly digest Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[email] Exception while sending weekly digest:', err);
    return { success: false, error: message };
  }
}
