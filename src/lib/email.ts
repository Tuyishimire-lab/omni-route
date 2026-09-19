import { Resend } from 'resend';
import { sanitizeEmailRecipientName } from './sanitizeText';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

// ─── Email Verification Code ────────────────────────────────────────────────

export interface SendVerificationCodeParams {
  to: string;
  code: string;
}

export async function sendVerificationCodeEmail({
  to,
  code,
}: SendVerificationCodeParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute <onboarding@resend.dev>';

  // Development fallback
  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute] Email Verification Code');
    console.log(` To: ${to}`);
    console.log(` Code: ${code}`);
    console.log(' (Set RESEND_API_KEY in .env.local to deliver live emails)');
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'RESEND_API_KEY is not set in production environment.' };
    }
    return { success: true, id: 'dev-verify-id' };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CiteRoute Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.2);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 18px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine &amp; Agent Observability
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;text-align:center;">
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Verify your email
              </h1>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                Enter this code to start your free GEO scan. It expires in 10 minutes.
              </p>

              <!-- Code Block -->
              <div style="background-color:#0A0E0E;border:2px solid rgba(5,173,152,0.3);border-radius:12px;padding:20px;margin:0 auto;max-width:260px;">
                <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#05AD98;font-family:'Courier New',Courier,monospace;">
                  ${code}
                </div>
              </div>

              <p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#64748B;">
                If you didn&rsquo;t request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 32px 24px 32px;background-color:#0A0E0E;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 4px 0;font-size:10px;color:#64748B;">
                CiteRoute Platform | <a href="https://www.citeroute.com" style="color:#878787;text-decoration:none;">citeroute.com</a>
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

  const text = `Your CiteRoute verification code is: ${code}\n\nEnter this code to start your free GEO scan. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'contact@citeroute.com',
      subject: `${code} is your CiteRoute verification code`,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `verify-${Date.now()}-${to}`,
      },
    });

    if (error) {
      console.error('[email] Verification code delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[email] Exception sending verification code:', err);
    return { success: false, error: message };
  }
}

export interface SendAccountVerificationParams {
  to: string;
  verifyUrl: string;
  code: string;
  userName?: string;
}

export async function sendAccountVerificationEmail({
  to,
  verifyUrl,
  code,
  userName,
}: SendAccountVerificationParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const safeName = sanitizeEmailRecipientName(userName);
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute <onboarding@resend.dev>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com';

  // Development console fallback
  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute] Account Verification Email Dispatched');
    console.log(` To: ${to}`);
    console.log(` Recipient: ${safeName}`);
    console.log(` Verification URL: ${verifyUrl}`);
    console.log(` 6-Digit Code: ${code}`);
    console.log(' (Set RESEND_API_KEY in .env.local to deliver live emails)');
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'RESEND_API_KEY is not set in production environment.' };
    }
    return { success: true, id: 'dev-account-verify-id' };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your CiteRoute Account</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.25);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 18px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine &amp; Agent Observability
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 32px 24px 32px;text-align:left;">
              <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Verify your email address
              </h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#BBBFBF;">
                Hello ${safeName},
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94A3B8;">
                Thank you for creating an account on CiteRoute. Please verify your email address to activate your account and access generative engine analytics, verified domain monitoring, and API keys.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}"
                   target="_blank"
                   style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#05AD98,#038a79);color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;border-radius:10px;box-shadow:0 4px 14px rgba(5,173,152,0.3);letter-spacing:0.5px;">
                  Verify &amp; Activate Account
                </a>
              </div>

              <!-- Monospace Code Fallback -->
              <div style="background-color:#0A0E0E;border:1px solid rgba(187,191,191,0.12);border-radius:12px;padding:18px;margin:24px 0;text-align:center;">
                <div style="font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:600;">
                  Or Enter This 6-Digit Code
                </div>
                <div style="font-size:28px;font-weight:800;letter-spacing:8px;color:#05AD98;font-family:'Courier New',Courier,monospace;">
                  ${code}
                </div>
              </div>

              <p style="margin:24px 0 8px 0;font-size:12px;line-height:1.5;color:#878787;">
                If the button above does not work, copy and paste this verification link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:11px;line-height:1.4;word-break:break-all;color:#05AD98;">
                <a href="${verifyUrl}" style="color:#05AD98;text-decoration:underline;">${verifyUrl}</a>
              </p>

              <div style="padding-top:16px;border-top:1px solid rgba(187,191,191,0.08);font-size:12px;color:#878787;line-height:1.5;">
                This link and verification code expire in 24 hours. If you did not create an account on CiteRoute, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#070A0A;border-top:1px solid rgba(187,191,191,0.08);text-align:center;font-size:11px;color:#878787;">
              <p style="margin:0 0 6px 0;">
                CiteRoute Engine · Generative Engine Optimization &amp; AI Citation Attestation
              </p>
              <p style="margin:0;">
                <a href="${appUrl}/privacy" style="color:#878787;text-decoration:underline;">Privacy Policy</a> ·
                <a href="${appUrl}/terms" style="color:#878787;text-decoration:underline;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: 'Verify your email address - CiteRoute',
      html,
    });

    if (error) {
      console.error('[email] Account verification delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email dispatch error';
    console.error('[email] Exception sending account verification email:', err);
    return { success: false, error: message };
  }
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
  const safeName = sanitizeEmailRecipientName(userName);
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute Security <onboarding@resend.dev>';
  const recipientName = safeName;

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
                CiteRoute Platform | Questions? Reach us at <a href="mailto:contact@citeroute.com" style="color:#05AD98;text-decoration:none;">contact@citeroute.com</a>
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

  const text = `Reset Your CiteRoute Password\n\nHello ${recipientName},\n\nWe received a request to reset the password for your CiteRoute account. Visit the link below to choose a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes. If you did not request this, please ignore this email.\n\nSupport: contact@citeroute.com`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'contact@citeroute.com',
      subject: 'Reset your CiteRoute password',
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `reset-${Date.now()}-${to}`,
      },
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
  const safeName = sanitizeEmailRecipientName(userName);
  const resend = getResendClient();
  const fromEmail = process.env.WELCOME_FROM_EMAIL || 'CiteRoute <hello@citeroute.com>';
  const recipientName = safeName;
  const dashboardUrl = 'https://www.citeroute.com/my-sites';

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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to CiteRoute</title>
</head>
<body style="margin:0;padding:0;background-color:#070A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070A0A;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.25);border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 20px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:22px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:12px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine & AI Citation Observability
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
                Search is shifting rapidly from blue links to direct AI answers. CiteRoute gives you the real-time telemetry, Generative Engine Optimization (GEO) scoring, and citation analytics needed to win visibility across ChatGPT, Claude, and Perplexity.
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
                  <td align="center" style="border-radius:10px;background-color:#05AD98;">
                    <a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      Open Your Sites & Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#878787;">
                Or navigate directly: <a href="${dashboardUrl}" style="color:#05AD98;text-decoration:none;">${dashboardUrl}</a>
              </p>

              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#878787;">
                Need assistance setting up your domain or configuring crawler rules? Reply directly to this email or reach us anytime at <a href="mailto:contact@citeroute.com" style="color:#05AD98;text-decoration:none;">contact@citeroute.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 28px 32px;background-color:#0A0E0E;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#878787;">
                CiteRoute Platform &middot; Generative Engine & AI Observability
              </p>
              <p style="margin:0 0 6px 0;font-size:10px;color:#64748B;">
                You received this transactional email because you registered an account on <a href="https://www.citeroute.com" style="color:#878787;text-decoration:underline;">citeroute.com</a>.
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

  const text = `Welcome to CiteRoute, ${recipientName}!\n\nSearch is moving from blue links to direct AI answers. CiteRoute gives you the real-time telemetry, Generative Engine Optimization (GEO) scoring, and citation analytics needed to win visibility across ChatGPT, Claude, and Perplexity.\n\nQuick Start Guide:\n1. Run a GEO Scan: Audit your domain to uncover your baseline citation rate and vector readiness.\n2. Install the Snippet: Add the one-line CiteRoute telemetry tag to monitor autonomous AI agent crawlers in real-time.\n3. Track Citations: Watch crawler visits transform into citations, brand mentions, and referral traffic.\n\nOpen your sites and dashboard: ${dashboardUrl}\n\nQuestions? Reach us at contact@citeroute.com\n\n© ${new Date().getFullYear()} CiteRoute. All rights reserved.`;

  try {
    const subject = safeName !== 'there' ? `Welcome to CiteRoute, ${safeName}` : 'Welcome to CiteRoute';
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'contact@citeroute.com',
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `welcome-${Date.now()}-${to}`,
        'List-Unsubscribe': '<mailto:contact@citeroute.com?subject=unsubscribe>',
      },
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

export interface PriorityFix {
  pillar: string;
  title: string;
  action: string;
}

export interface EngineVisibility {
  name: string;
  status: 'OPTIMAL' | 'MODERATE' | 'LOW';
  botDetected: boolean;
}

export interface MonitoredDomainDigest {
  domain: string;
  geoScore: number;
  previousGeoScore: number | null;
  trendDelta: number;
  citationRate: number;
  status: 'OPTIMAL' | 'MODERATE' | 'AT_RISK';
  // Subscores
  zeroClickResilience: number;
  infoGainScore: number;
  entityScore: number;
  vectorReadiness: number;
  // Agent traffic (7-day window)
  agentHits7d: number;
  topBots: string[];
  // Scan metadata
  scanCount: number;
  lastScannedAt: string | null;
  dataSource: 'live_crawl' | 'structural_estimate' | 'never_scanned';
  // Optional pre-computed enrichments
  priorityFix?: PriorityFix;
  engines?: EngineVisibility[];
}

export interface WeeklyGeoTip {
  title: string;
  body: string;
}

/** Curated GEO optimization tips that rotate weekly. */
export const GEO_TIPS: WeeklyGeoTip[] = [
  {
    title: 'Structured Markdown Summaries',
    body: 'AI search engines favor structured markdown summaries. Ensure your /llms.txt file is active and lists your primary documentation links.',
  },
  {
    title: 'JSON-LD Schema Markup',
    body: 'Add Organization, Product, and FAQPage JSON-LD schema to your pages. Structured data is the primary mechanism LLMs use to extract entity facts and increases citation probability by up to 2.8x.',
  },
  {
    title: 'Empirical Data Tables',
    body: 'Pages with HTML data tables containing original statistics and benchmarks are cited 2.8x more often by AI answer engines. Add quantitative evidence to your key landing pages.',
  },
  {
    title: 'robots.txt AI Bot Permissions',
    body: 'Ensure OAI-SearchBot, PerplexityBot, ClaudeBot, and Applebot-Extended are not blocked in your robots.txt. Blocking search-citation bots removes you from AI answers entirely.',
  },
  {
    title: 'Semantic HTML Structure',
    body: 'Use a single H1 per page with a clear hierarchy of H2/H3 subheadings. AI extractors use heading structure to identify passage boundaries for retrieval-augmented generation.',
  },
  {
    title: 'Entity Disambiguation with SameAs',
    body: 'Add sameAs links to Wikidata, Crunchbase, and LinkedIn in your Organization schema. This grounds your brand identity in the knowledge graph and resolves entity ambiguity for LLMs.',
  },
  {
    title: 'Long-Form Content Depth',
    body: 'Pages with 1,500+ words of substantive content correlate with higher LLM confidence scores. Thin content pages are rarely selected as citation sources by generative engines.',
  },
  {
    title: 'FAQ Page Optimization',
    body: 'LLMs preferentially cite FAQ-structured content for question-and-answer queries. Add a dedicated FAQ section with FAQPage schema markup to your highest-traffic pages.',
  },
  {
    title: 'AI Crawler Tracking',
    body: 'Install the CiteRoute tracking snippet to monitor which AI bots (GPTBot, PerplexityBot, ClaudeBot) are visiting your site in real time. You cannot optimize what you cannot measure.',
  },
  {
    title: 'Cross-Engine Visibility',
    body: 'Different AI engines weight different signals. Perplexity favors recency, ChatGPT favors authority, and Claude favors structured data. Monitor your per-engine scores to tailor your strategy.',
  },
];

/** Selects the GEO tip for a given week number. Deterministic and rotates through all tips. */
export function getWeeklyTip(weekNumber?: number): WeeklyGeoTip {
  const wn = weekNumber ?? Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return GEO_TIPS[wn % GEO_TIPS.length];
}

/** Computes an automated, high-impact priority fix based on the lowest scoring pillar. */
export function computePriorityFix(d: MonitoredDomainDigest): PriorityFix {
  if (d.dataSource === 'never_scanned' || d.scanCount === 0) {
    return {
      pillar: 'Baseline Audit',
      title: 'Initialize GEO Baseline',
      action: 'Run an initial scan to discover your live citation probability and vector readiness.',
    };
  }

  const pillars = [
    {
      pillar: 'Zero-Click Resilience',
      score: d.zeroClickResilience,
      title: 'Mitigate Answer Cannibalization',
      action: 'Add structured FAQ schemas and rich HTML data tables with clear source anchors to capture citations.',
    },
    {
      pillar: 'Info Gain Score',
      score: d.infoGainScore,
      title: 'Infuse Proprietary Data',
      action: 'Publish unique primary statistics or original research that LLMs cannot synthesize from competitors.',
    },
    {
      pillar: 'Entity Prominence',
      score: d.entityScore,
      title: 'Ground Entity Authority',
      action: 'Add Organization schema linking sameAs identifiers to Wikidata, Crunchbase, and LinkedIn.',
    },
    {
      pillar: 'Vector Readiness',
      score: d.vectorReadiness,
      title: 'Optimize Vector Embeddings',
      action: 'Publish an /llms.txt manifest and clean markdown headings to optimize RAG passage chunking.',
    },
  ];

  pillars.sort((a, b) => a.score - b.score);
  return {
    pillar: pillars[0].pillar,
    title: pillars[0].title,
    action: pillars[0].action,
  };
}

/** Computes foundation model visibility indicators based on bot hits and citation rate. */
export function computeEngineVisibility(d: MonitoredDomainDigest): EngineVisibility[] {
  const botsLower = d.topBots.map((b) => b.toLowerCase());
  const hasPerplexity = botsLower.some((b) => b.includes('perplexity'));
  const hasOpenAI = botsLower.some((b) => b.includes('gptbot') || b.includes('searchbot') || b.includes('oai'));
  const hasClaude = botsLower.some((b) => b.includes('claude') || b.includes('anthropic'));
  const hasGemini = botsLower.some((b) => b.includes('google') || b.includes('vertex'));

  const baseScore = d.geoScore;
  const resolveStatus = (hasBot: boolean, threshold: number): 'OPTIMAL' | 'MODERATE' | 'LOW' => {
    if (hasBot || baseScore >= threshold + 10) return 'OPTIMAL';
    if (baseScore >= threshold) return 'MODERATE';
    return 'LOW';
  };

  return [
    { name: 'Perplexity', status: resolveStatus(hasPerplexity, 70), botDetected: hasPerplexity },
    { name: 'ChatGPT', status: resolveStatus(hasOpenAI, 75), botDetected: hasOpenAI },
    { name: 'Claude', status: resolveStatus(hasClaude, 70), botDetected: hasClaude },
    { name: 'Gemini', status: resolveStatus(hasGemini, 65), botDetected: hasGemini },
  ];
}

export interface SendWeeklyDigestParams {
  to: string;
  userName?: string;
  domains: MonitoredDomainDigest[];
  weeklyTip?: WeeklyGeoTip;
  digestDate?: string;
}

export async function sendWeeklyDigestEmail({
  to,
  userName,
  domains,
  weeklyTip,
  digestDate,
}: SendWeeklyDigestParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail =
    process.env.DIGEST_FROM_EMAIL ||
    process.env.ALERT_FROM_EMAIL ||
    'CiteRoute Digest <onboarding@resend.dev>';
  const recipientName = sanitizeEmailRecipientName(userName);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com').replace(/\/+$/, '');
  const dashboardUrl = `${appUrl}/my-sites`;
  const tip = weeklyTip ?? getWeeklyTip();

  // Compute aggregate stats
  const scannedDomains = domains.filter((d) => d.dataSource !== 'never_scanned');
  const avgScore =
    scannedDomains.length > 0
      ? Math.round(scannedDomains.reduce((s, d) => s + d.geoScore, 0) / scannedDomains.length)
      : 0;
  const totalAgentHits = domains.reduce((s, d) => s + d.agentHits7d, 0);
  const overallTrend = scannedDomains.reduce((s, d) => s + d.trendDelta, 0);
  const optimalDomainsCount = domains.filter((d) => d.status === 'OPTIMAL').length;

  // Compute unique bot list
  const allBots = new Set<string>();
  for (const d of domains) {
    for (const b of d.topBots) allBots.add(b);
  }
  const uniqueBotsCount = allBots.size;

  // Date range for header
  const dateRange =
    digestDate ??
    (() => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${fmt(weekAgo)} - ${fmt(now)}`;
    })();

  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Digest] Weekly GEO Digest Triggered');
    console.log(` To: ${to}`);
    console.log(` Domains: ${domains.map((d) => d.domain).join(', ')}`);
    console.log(` Period: ${dateRange}`);
    console.log(` Avg Score: ${avgScore} | Agent Hits: ${totalAgentHits}`);
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

  // ── Helper: Dynamic score color palette ─────────────────────────────────────
  function getScoreColors(score: number): { text: string; bg: string; border: string } {
    if (score >= 75) return { text: '#05AD98', bg: 'rgba(5,173,152,0.12)', border: 'rgba(5,173,152,0.35)' };
    if (score >= 50) return { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' };
    return { text: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' };
  }

  // ── Helper: Build status pill HTML ──────────────────────────────────────────
  function statusPill(status: string): string {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      OPTIMAL: { bg: 'rgba(5,173,152,0.15)', color: '#05AD98', label: 'Optimal' },
      MODERATE: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Moderate' },
      AT_RISK: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'At Risk' },
    };
    const s = map[status] || map.MODERATE;
    return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background-color:${s.bg};color:${s.color};border:1px solid ${s.color}33;">${s.label}</span>`;
  }

  // ── Helper: Build subscore bar HTML ────────────────────────────────────────
  function subscoreBar(label: string, value: number): string {
    const pct = Math.min(100, Math.max(0, value));
    const colors = getScoreColors(pct);
    return `
      <tr>
        <td style="padding:4px 0;font-size:11px;color:#94A3B8;width:115px;">${label}</td>
        <td style="padding:4px 0;width:100%;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-radius:4px;overflow:hidden;background-color:rgba(255,255,255,0.06);">
            <tr>
              <td style="width:${pct}%;height:6px;background-color:${colors.text};border-radius:3px;"></td>
              <td style="width:${100 - pct}%;height:6px;"></td>
            </tr>
          </table>
        </td>
        <td style="padding:4px 0 4px 10px;font-size:11px;color:#E2E8F0;font-weight:700;text-align:right;white-space:nowrap;">${value}</td>
      </tr>`;
  }

  // ── Helper: Build delta text ───────────────────────────────────────────────
  function deltaHtml(delta: number, dataSource: string): string {
    if (dataSource === 'never_scanned') return `<span style="color:#64748B;font-size:11px;">Not scanned</span>`;
    if (delta > 0) return `<span style="color:#05AD98;font-weight:700;">+${delta} pts vs last week</span>`;
    if (delta < 0) return `<span style="color:#EF4444;font-weight:700;">${delta} pts vs last week</span>`;
    return `<span style="color:#94A3B8;font-size:11px;">Unchanged this week</span>`;
  }

  // ── Helper: Data freshness label ───────────────────────────────────────────
  function freshnessLabel(lastScannedAt: string | null): string {
    if (!lastScannedAt) return '<span style="color:#EF4444;font-size:10px;">Never scanned</span>';
    const daysAgo = Math.floor((Date.now() - new Date(lastScannedAt).getTime()) / (24 * 60 * 60 * 1000));
    if (daysAgo <= 1) return '<span style="color:#05AD98;font-size:10px;">Scanned today</span>';
    if (daysAgo <= 3) return `<span style="color:#05AD98;font-size:10px;">Scanned ${daysAgo}d ago</span>`;
    if (daysAgo <= 7) return `<span style="color:#F59E0B;font-size:10px;">Scanned ${daysAgo}d ago</span>`;
    return `<span style="color:#EF4444;font-size:10px;">Scanned ${daysAgo}d ago (re-scan recommended)</span>`;
  }

  // ── Helper: Engine Visibility Pills ─────────────────────────────────────────
  function enginePillsHtml(engines: EngineVisibility[]): string {
    return engines
      .map((eng) => {
        let color = '#878787';
        let bg = 'rgba(255,255,255,0.04)';
        let border = 'rgba(255,255,255,0.08)';
        let indicator = 'Active';

        if (eng.status === 'OPTIMAL') {
          color = '#05AD98';
          bg = 'rgba(5,173,152,0.12)';
          border = 'rgba(5,173,152,0.25)';
          indicator = 'Cited';
        } else if (eng.status === 'MODERATE') {
          color = '#F59E0B';
          bg = 'rgba(245,158,11,0.12)';
          border = 'rgba(245,158,11,0.25)';
          indicator = 'Indexed';
        }

        return `
          <td style="padding:0 3px 0 0;">
            <div style="background-color:${bg};border:1px solid ${border};border-radius:6px;padding:5px 8px;text-align:center;">
              <span style="font-size:10px;font-weight:700;color:#FFFFFF;display:block;">${eng.name}</span>
              <span style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.3px;">${indicator}</span>
            </div>
          </td>`;
      })
      .join('');
  }

  // ── Build per-domain card HTML ─────────────────────────────────────────────
  const domainCardsHtml = domains
    .map((d) => {
      const auditUrl = `${appUrl}/audit/${encodeURIComponent(d.domain)}`;
      const isNeverScanned = d.dataSource === 'never_scanned';
      const scoreColors = getScoreColors(d.geoScore);
      const fix = d.priorityFix || computePriorityFix(d);
      const engines = d.engines || computeEngineVisibility(d);

      const botListHtml =
        d.topBots.length > 0
          ? d.topBots
              .slice(0, 4)
              .map(
                (b) =>
                  `<span style="display:inline-block;padding:2px 8px;margin:2px 4px 2px 0;border-radius:4px;font-size:10px;font-weight:600;color:#CBD5E1;background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">${b}</span>`
              )
              .join('')
          : '<span style="font-size:11px;color:#64748B;">No crawler activity detected in 7 days</span>';

      return `
      <!-- Domain Card: ${d.domain} -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0E0E;border:1px solid ${scoreColors.border};border-radius:14px;overflow:hidden;margin:0 0 20px 0;">
        <!-- Card Header -->
        <tr>
          <td style="padding:16px 20px 14px 20px;border-bottom:1px solid rgba(187,191,191,0.08);background-color:#0D1313;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-family:monospace;font-size:15px;color:#FFFFFF;font-weight:700;">
                  ${d.domain}
                </td>
                <td align="right" style="vertical-align:middle;">
                  ${statusPill(d.status)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Score + Delta Row -->
        <tr>
          <td style="padding:18px 20px 12px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:top;width:120px;">
                  ${
                    isNeverScanned
                      ? '<span style="font-size:32px;font-weight:800;color:#64748B;line-height:1;">--</span><span style="font-size:13px;color:#64748B;">/100</span>'
                      : `<span style="font-size:36px;font-weight:800;color:${scoreColors.text};line-height:1;">${d.geoScore}</span><span style="font-size:13px;color:#878787;">/100</span>`
                  }
                  <div style="font-size:10px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">
                    GEO Index
                  </div>
                </td>
                <td style="vertical-align:top;padding-left:12px;">
                  <div style="font-size:12px;margin-bottom:4px;">
                    ${deltaHtml(d.trendDelta, d.dataSource)}
                  </div>
                  <div style="font-size:11px;color:#878787;">
                    ${freshnessLabel(d.lastScannedAt)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${
          isNeverScanned
            ? `
        <!-- Never Scanned Message -->
        <tr>
          <td style="padding:8px 20px 16px 20px;">
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">
              This domain has not been audited yet. <a href="${appUrl}/audit?url=${encodeURIComponent(d.domain)}" style="color:#05AD98;text-decoration:none;font-weight:600;">Run your initial GEO audit</a> to discover active citation rates and vector readiness.
            </p>
          </td>
        </tr>
        `
            : `
        <!-- Subscores -->
        <tr>
          <td style="padding:0 20px 12px 20px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${subscoreBar('Zero-Click', d.zeroClickResilience)}
              ${subscoreBar('Info Gain', d.infoGainScore)}
              ${subscoreBar('Entity Authority', d.entityScore)}
              ${subscoreBar('Vector RAG', d.vectorReadiness)}
            </table>
          </td>
        </tr>

        <!-- Foundation Model Coverage -->
        <tr>
          <td style="padding:10px 20px 12px 20px;border-top:1px solid rgba(187,191,191,0.06);">
            <div style="font-size:10px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
              Foundation Model Coverage
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                ${enginePillsHtml(engines)}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Priority Fix Recommendation Box -->
        <tr>
          <td style="padding:6px 20px 14px 20px;">
            <div style="background-color:rgba(5,173,152,0.04);border-left:3px solid #05AD98;border-radius:6px;padding:10px 12px;">
              <div style="font-size:10px;font-weight:700;color:#05AD98;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">
                Priority Action (${fix.pillar}): ${fix.title}
              </div>
              <div style="font-size:11px;line-height:1.5;color:#BBBFBF;">
                ${fix.action}
              </div>
            </div>
          </td>
        </tr>

        <!-- Agent Traffic -->
        <tr>
          <td style="padding:10px 20px 14px 20px;border-top:1px solid rgba(187,191,191,0.06);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size:11px;color:#878787;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:6px;font-weight:600;">
                  AI Crawler Activity (7 days)
                </td>
                <td align="right" style="font-size:12px;color:#E2E8F0;font-weight:700;padding-bottom:6px;">
                  ${d.agentHits7d > 0 ? `${d.agentHits7d} visit${d.agentHits7d !== 1 ? 's' : ''}` : 'None'}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:2px;">
                  ${botListHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        `
        }

        <!-- Actions Footer -->
        <tr>
          <td style="padding:10px 20px 16px 20px;border-top:1px solid rgba(187,191,191,0.06);background-color:#080B0B;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td>
                  <a href="${auditUrl}" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:700;color:#05AD98;text-decoration:none;">
                    View Live Audit &rarr;
                  </a>
                </td>
                <td align="right">
                  <a href="${appUrl}/analytics/${encodeURIComponent(d.domain)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#878787;text-decoration:none;">
                    Crawler Telemetry &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join('\n');

  const avgColors = getScoreColors(avgScore);
  const avgTrendBadge =
    overallTrend > 0
      ? `+${overallTrend} pts net growth`
      : overallTrend < 0
      ? `${overallTrend} pts net drop`
      : 'Net score stable';
  const avgTrendColor = overallTrend > 0 ? '#05AD98' : overallTrend < 0 ? '#EF4444' : '#878787';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Weekly CiteRoute GEO Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050707;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#0D1313;border:1px solid rgba(5,173,152,0.25);border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.6);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 18px 32px;text-align:center;border-bottom:1px solid rgba(187,191,191,0.08);">
              <div style="font-size:22px;font-weight:800;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
                CITE<span style="color:#05AD98;">ROUTE</span>
              </div>
              <div style="font-size:11px;color:#878787;margin-top:4px;letter-spacing:0.5px;">
                Generative Engine & AI Citation Observability
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px 28px 24px 28px;">
              <h1 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Weekly GEO Performance Update
              </h1>
              <p style="margin:0 0 16px 0;font-size:12px;color:#64748B;">
                ${dateRange}
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#CBD5E1;">
                Hello ${recipientName}, here is how your monitored domains performed across ChatGPT, Claude, Gemini, and Perplexity over the past 7 days:
              </p>

              <!-- 3-KPI Executive Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <!-- KPI 1: Network GEO Average -->
                  <td width="32%" style="background-color:#0A0E0E;border:1px solid rgba(5,173,152,0.25);border-radius:12px;padding:14px 10px;text-align:center;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      Avg GEO Score
                    </div>
                    <div style="font-size:24px;font-weight:800;color:${avgColors.text};line-height:1.1;">
                      ${avgScore}<span style="font-size:12px;color:#878787;font-weight:600;">/100</span>
                    </div>
                    <div style="font-size:10px;font-weight:700;margin-top:6px;color:${avgTrendColor};">
                      ${avgTrendBadge}
                    </div>
                  </td>
                  <td width="2%">&nbsp;</td>
                  <!-- KPI 2: AI Crawler Visits -->
                  <td width="32%" style="background-color:#0A0E0E;border:1px solid rgba(187,191,191,0.12);border-radius:12px;padding:14px 10px;text-align:center;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      7d AI Bot Hits
                    </div>
                    <div style="font-size:24px;font-weight:800;color:#FFFFFF;line-height:1.1;">
                      ${totalAgentHits}
                    </div>
                    <div style="font-size:10px;color:#878787;margin-top:6px;">
                      ${uniqueBotsCount} Bot Types
                    </div>
                  </td>
                  <td width="2%">&nbsp;</td>
                  <!-- KPI 3: Monitored Sites Health -->
                  <td width="32%" style="background-color:#0A0E0E;border:1px solid rgba(187,191,191,0.12);border-radius:12px;padding:14px 10px;text-align:center;vertical-align:top;">
                    <div style="font-size:10px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      Portfolio Status
                    </div>
                    <div style="font-size:24px;font-weight:800;color:#05AD98;line-height:1.1;">
                      ${optimalDomainsCount}/${domains.length}
                    </div>
                    <div style="font-size:10px;color:#878787;margin-top:6px;">
                      Optimal Standing
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Domain Cards Section -->
              <div style="font-size:11px;font-weight:700;color:#878787;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
                Monitored Domains Breakdown
              </div>
              ${domainCardsHtml}

              <!-- Tip of the Week -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0E0E;border-left:3px solid #05AD98;border-radius:8px;margin:22px 0 24px 0;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:10px;font-weight:700;color:#05AD98;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                      GEO Strategy Tip: ${tip.title}
                    </div>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#BBBFBF;">
                      ${tip.body}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 16px 0;" width="100%">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#05AD98;">
                    <a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.3px;">
                      Open Live Telemetry Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliance & Unsubscribe Footer -->
          <tr>
            <td style="padding:22px 32px 28px 32px;background-color:#090D0D;border-top:1px solid rgba(187,191,191,0.08);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#878787;">
                CiteRoute Platform &middot; Generative Engine & AI Citation Observability
              </p>
              <p style="margin:0 0 10px 0;font-size:10px;color:#64748B;">
                You are receiving this digest because you registered a site or watchlist on <a href="${appUrl}" style="color:#878787;text-decoration:underline;">citeroute.com</a>.
              </p>
              <p style="margin:0;font-size:10px;color:#64748B;">
                <a href="${dashboardUrl}" style="color:#05AD98;text-decoration:none;margin-right:12px;">Manage Alert Preferences</a>
                &bull;
                <a href="mailto:contact@citeroute.com?subject=Unsubscribe%20Weekly%20Digest&body=Please%20unsubscribe%20${encodeURIComponent(to)}" style="color:#878787;text-decoration:underline;margin-left:12px;">Unsubscribe</a>
              </p>
              <p style="margin:10px 0 0 0;font-size:10px;color:#475569;">
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

  // ── Plaintext fallback ─────────────────────────────────────────────────────
  const textDomains = domains
    .map((d) => {
      if (d.dataSource === 'never_scanned') {
        return `- ${d.domain}: Not scanned yet`;
      }
      const arrow = d.trendDelta > 0 ? `+${d.trendDelta}` : d.trendDelta < 0 ? `${d.trendDelta}` : '0';
      const traffic = d.agentHits7d > 0 ? `, ${d.agentHits7d} AI bot visits` : '';
      const fix = d.priorityFix || computePriorityFix(d);
      return `- ${d.domain}: GEO ${d.geoScore}/100 (${arrow} pts), Status: ${d.status}, Zero-Click: ${d.zeroClickResilience}, Info Gain: ${d.infoGainScore}, Entity: ${d.entityScore}, Vector: ${d.vectorReadiness}${traffic}\n  Priority Fix: ${fix.title} - ${fix.action}`;
    })
    .join('\n');

  const text = [
    `Your Weekly CiteRoute GEO Performance Update`,
    `${dateRange}`,
    ``,
    `Hello ${recipientName},`,
    ``,
    `Here is how your monitored domains performed across ChatGPT, Claude, Gemini, and Perplexity this week:`,
    ``,
    `Summary: ${domains.length} domains | Avg GEO: ${avgScore}/100 | ${totalAgentHits} bot visits | ${optimalDomainsCount} Optimal`,
    ``,
    textDomains,
    ``,
    `GEO Strategy Tip - ${tip.title}: ${tip.body}`,
    ``,
    `View your live dashboard: ${dashboardUrl}`,
    ``,
    `Manage alert preferences: ${dashboardUrl}`,
    `Unsubscribe: mailto:contact@citeroute.com?subject=Unsubscribe%20Weekly%20Digest`,
    ``,
    `Questions? Reach us at contact@citeroute.com`,
    ``,
    `(c) ${new Date().getFullYear()} CiteRoute. All rights reserved.`,
  ].join('\n');

  // ── Subject line with trend direction ──────────────────────────────────────
  const primaryDomain = domains[0]?.domain || 'Your Monitored Domains';
  const trendArrow = overallTrend > 0 ? ' (Up)' : overallTrend < 0 ? ' (Down)' : '';
  const subject = `Weekly GEO Digest: ${primaryDomain}${trendArrow} ${scannedDomains.length > 0 ? `${avgScore}/100` : 'Performance'}`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'contact@citeroute.com',
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `digest-${Date.now()}-${to}`,
        'List-Unsubscribe': '<mailto:contact@citeroute.com?subject=unsubscribe>',
      },
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

// ─── Enterprise Data Inquiry Email ───────────────────────────────────────────

export interface EnterpriseInquiryParams {
  name: string;
  email: string;
  company: string;
  website?: string;
  product: string;
  price?: string;
  industry?: string;
  deliveryFormat?: string;
  message?: string;
}

export async function sendEnterpriseInquiryEmail(
  params: EnterpriseInquiryParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute Enterprise <onboarding@resend.dev>';
  const to = 'contact@citeroute.com';

  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Enterprise] New Data Feed Lead Captured');
    console.log(` Prospect: ${params.name} <${params.email}>`);
    console.log(` Company:  ${params.company} (${params.website || 'N/A'})`);
    console.log(` Product:  ${params.product} (${params.price || 'Enterprise'})`);
    console.log(` Industry: ${params.industry || 'Not specified'}`);
    console.log(` Format:   ${params.deliveryFormat || 'API / CSV'}`);
    if (params.message) console.log(` Notes:    ${params.message}`);
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'RESEND_API_KEY is not configured in production.' };
    }
    return { success: true, id: 'dev-enterprise-lead-id' };
  }

  const subject = `[Enterprise Lead] ${params.product} - ${params.company} (${params.name})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Enterprise Data Inquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E2E8F0;">
  <div style="max-width:560px;margin:24px auto;background:#0D1313;border:1px solid rgba(184,160,74,0.3);border-radius:16px;padding:32px;">
    <div style="font-size:18px;font-weight:800;color:#B8A04A;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
      Enterprise Data Feed Inquiry
    </div>
    <p style="font-size:14px;color:#878787;margin:0 0 24px 0;">
      A new enterprise buyer has requested a custom dataset or consultation on CiteRoute.
    </p>

    <div style="background:#111817;border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:20px;margin-bottom:24px;">
      <div style="margin-bottom:12px;">
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Product Requested</span>
        <strong style="font-size:16px;color:#FFFFFF;">${params.product}</strong>
        ${params.price ? `<span style="font-size:12px;color:#B8A04A;font-weight:bold;margin-left:8px;">(${params.price})</span>` : ''}
      </div>

      <div style="margin-bottom:12px;">
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Prospect</span>
        <strong style="font-size:14px;color:#FFFFFF;">${params.name}</strong> &lt;<a href="mailto:${params.email}" style="color:#05AD98;text-decoration:none;">${params.email}</a>&gt;
      </div>

      <div style="margin-bottom:12px;">
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Company</span>
        <span style="font-size:14px;color:#FFFFFF;">${params.company}</span>
        ${params.website ? `<span style="color:#878787;"> &bull; <a href="${params.website.startsWith('http') ? params.website : `https://${params.website}`}" target="_blank" style="color:#05AD98;text-decoration:none;">${params.website}</a></span>` : ''}
      </div>

      <div style="margin-bottom:12px;">
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Industry / Vertical</span>
        <span style="font-size:14px;color:#FFFFFF;">${params.industry || 'General'}</span>
      </div>

      <div style="margin-bottom:12px;">
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Delivery Format</span>
        <span style="font-size:14px;color:#FFFFFF;">${params.deliveryFormat || 'API Feed / CSV'}</span>
      </div>

      ${params.message ? `
      <div>
        <span style="font-size:11px;color:#878787;text-transform:uppercase;display:block;">Requirements & Notes</span>
        <p style="font-size:13px;color:#BBBFBF;line-height:1.5;margin:4px 0 0 0;white-space:pre-wrap;">${params.message}</p>
      </div>` : ''}
    </div>

    <div style="text-align:center;">
      <a href="mailto:${params.email}?subject=CiteRoute%20Enterprise%20Data%20Feed%20-%20${encodeURIComponent(params.product)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#B8A04A;color:#000000;font-size:13px;font-weight:bold;text-decoration:none;">
        Reply to ${params.name} &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: params.email,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Enterprise inquiry Resend delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown enterprise inquiry email error';
    console.error('[email] Exception sending enterprise inquiry:', err);
    return { success: false, error: message };
  }
}

export async function sendEnterpriseConfirmationEmail(
  params: EnterpriseInquiryParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResendClient();
  const fromEmail = process.env.ALERT_FROM_EMAIL || 'CiteRoute Enterprise <onboarding@resend.dev>';
  const to = params.email;

  if (!resend) {
    console.log('\n======================================================');
    console.log(' [CiteRoute Enterprise] Buyer Confirmation Email Dispatched');
    console.log(` To:      ${params.name} <${params.email}>`);
    console.log(` Product: ${params.product}`);
    console.log('======================================================\n');

    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'RESEND_API_KEY is not configured in production.' };
    }
    return { success: true, id: 'dev-enterprise-confirm-id' };
  }

  const subject = `Inquiry Received: CiteRoute ${params.product} for ${params.company}`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your CiteRoute Enterprise Request</title>
</head>
<body style="margin:0;padding:0;background-color:#050707;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E2E8F0;">
  <div style="max-width:560px;margin:24px auto;background:#0D1313;border:1px solid rgba(184,160,74,0.3);border-radius:16px;padding:32px;">
    <div style="font-size:18px;font-weight:800;color:#FFFFFF;letter-spacing:1px;margin-bottom:8px;">
      CITE<span style="color:#B8A04A;">ROUTE</span> <span style="font-size:12px;color:#B8A04A;padding:2px 8px;border:1px solid rgba(184,160,74,0.3);border-radius:20px;vertical-align:middle;margin-left:6px;">ENTERPRISE</span>
    </div>
    <h2 style="font-size:20px;color:#FFFFFF;margin:16px 0 8px 0;">We've Received Your Feed Request</h2>
    <p style="font-size:14px;color:#BBBFBF;line-height:1.6;margin:0 0 20px 0;">
      Hello ${params.name}, thank you for requesting access to <strong>${params.product}</strong>.
      Our enterprise data engineering team has logged your vertical specifications and will reach out within 24 hours with a custom sample dataset.
    </p>

    <div style="background:#111817;border-radius:12px;border:1px solid rgba(255,255,255,0.06);padding:18px;margin-bottom:24px;">
      <div style="font-size:11px;color:#878787;text-transform:uppercase;margin-bottom:8px;">Request Summary</div>
      <div style="font-size:13px;color:#FFFFFF;margin-bottom:4px;">&bull; <strong>Product:</strong> ${params.product} ${params.price ? `(${params.price})` : ''}</div>
      <div style="font-size:13px;color:#FFFFFF;margin-bottom:4px;">&bull; <strong>Company:</strong> ${params.company}</div>
      <div style="font-size:13px;color:#FFFFFF;margin-bottom:4px;">&bull; <strong>Delivery Format:</strong> ${params.deliveryFormat || 'API / CSV'}</div>
      <div style="font-size:13px;color:#FFFFFF;">&bull; <strong>Vertical:</strong> ${params.industry || 'General'}</div>
    </div>

    <p style="font-size:13px;color:#878787;line-height:1.5;">
      Need immediate setup or an enterprise NDA? Simply reply directly to this email or reach us at <a href="mailto:contact@citeroute.com" style="color:#B8A04A;text-decoration:none;">contact@citeroute.com</a>.
    </p>

    <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:16px;text-align:center;font-size:11px;color:#64748B;">
      &copy; ${new Date().getFullYear()} CiteRoute. Generative Engine & AI Citation Intelligence.
    </div>
  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      replyTo: 'contact@citeroute.com',
      subject,
      html,
    });

    if (error) {
      console.error('[email] Enterprise confirmation delivery error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown enterprise confirmation email error';
    console.error('[email] Exception sending enterprise confirmation:', err);
    return { success: false, error: message };
  }
}

