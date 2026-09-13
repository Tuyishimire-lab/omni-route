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
      reply_to: 'tuyishime1angel@gmail.com',
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
