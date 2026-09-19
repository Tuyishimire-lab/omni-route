/**
 * CiteRoute Enterprise Email Verification Engine
 *
 * Implements tokenized, time-limited verification links and 6-digit OTP codes.
 * Enforces mandatory email verification before activating accounts or accessing features.
 */

import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';
import { sendAccountVerificationEmail } from './email';
import { checkRateLimit } from './rateLimiter';

const VERIFICATION_TOKEN_MAX_AGE = '24h'; // 24 hours expiration
const OTP_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours for OTP code

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'dev-fallback-insecure-secret-citeroute-2026';
  return new TextEncoder().encode(secret);
}

/**
 * Generate a cryptographically random 6-digit numeric verification code.
 */
export function generateVerificationOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1_000_000).padStart(6, '0');
}

/**
 * Creates a cryptographically signed, time-limited verification token.
 */
export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  return new SignJWT({
    userId,
    email: normalizedEmail,
    purpose: 'email-verification',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(VERIFICATION_TOKEN_MAX_AGE)
    .sign(getJwtSecret());
}

/**
 * Validates a verification token's signature, expiration, and user identity.
 */
export async function verifyEmailVerificationToken(
  token: string
): Promise<{ valid: boolean; userId?: string; email?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (payload.purpose !== 'email-verification') {
      return { valid: false, error: 'Invalid verification token purpose.' };
    }

    const userId = payload.userId as string;
    const email = (payload.email as string)?.toLowerCase().trim();

    if (!userId || !email) {
      return { valid: false, error: 'Malformed verification token.' };
    }

    // Confirm user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, provider: true },
    });

    if (!user || user.email.toLowerCase() !== email) {
      return { valid: false, error: 'Verification token does not match any registered account.' };
    }

    // Mark email as verified in EmailVerification model
    await markEmailAsVerified(email);

    return { valid: true, userId, email };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('expired')) {
      return { valid: false, error: 'This verification link has expired. Please request a new one.' };
    }
    return { valid: false, error: 'Invalid or tampered verification link.' };
  }
}

/**
 * Validates a 6-digit OTP code against the database.
 */
export async function verifyEmailVerificationOtp(
  email: string,
  code: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedCode = code.trim();

  if (!normalizedEmail || !trimmedCode) {
    return { valid: false, error: 'Email and verification code are required.' };
  }

  const record = await prisma.emailVerification.findFirst({
    where: {
      email: normalizedEmail,
      code: trimmedCode,
      verified: false,
      expiresAt: { gte: new Date() },
    },
  });

  if (!record) {
    return { valid: false, error: 'Invalid or expired verification code. Please request a new one.' };
  }

  // Mark record as verified
  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  // Find user associated with this email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  return { valid: true, userId: user?.id };
}

/**
 * Marks an email address as verified in the database.
 */
export async function markEmailAsVerified(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.emailVerification.findFirst({
    where: { email: normalizedEmail },
  });

  if (existing) {
    await prisma.emailVerification.update({
      where: { id: existing.id },
      data: { verified: true },
    });
  } else {
    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        code: 'LINK_VERIFIED',
        expiresAt: new Date(Date.now() + OTP_MAX_AGE_MS),
        verified: true,
      },
    });
  }
}

/**
 * Checks whether a user account has verified their email.
 * OAuth users (Google / GitHub) are automatically considered verified.
 */
export async function isUserEmailVerified(user: {
  id?: string;
  email: string;
  provider?: string | null;
  emailVerified?: boolean;
}): Promise<boolean> {
  // 1. OAuth users are inherently verified by the identity provider
  if (user.provider && user.provider !== 'email') {
    return true;
  }

  // 2. Session claim check
  if (user.emailVerified === true) {
    return true;
  }

  // 3. Database check
  const normalizedEmail = user.email.toLowerCase().trim();
  const verifiedRecord = await prisma.emailVerification.findFirst({
    where: {
      email: normalizedEmail,
      verified: true,
    },
  });

  return Boolean(verifiedRecord);
}

/**
 * Dispatches an account verification token link and 6-digit code.
 */
export async function issueAndSendVerification(
  userId: string,
  email: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Create JWT token
  const token = await createEmailVerificationToken(userId, normalizedEmail);

  // Generate 6-digit OTP code
  const code = generateVerificationOtp();
  const expiresAt = new Date(Date.now() + OTP_MAX_AGE_MS);

  // Clean up any pending unverified records and save new code
  await prisma.emailVerification.deleteMany({
    where: { email: normalizedEmail, verified: false },
  });

  await prisma.emailVerification.create({
    data: {
      email: normalizedEmail,
      code,
      expiresAt,
      verified: false,
    },
  });

  // Construct absolute verification URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.citeroute.com';
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  // Dispatch email
  const dispatchResult = await sendAccountVerificationEmail({
    to: normalizedEmail,
    userName,
    verifyUrl,
    code,
  });

  return dispatchResult;
}
