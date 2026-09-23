import { prisma } from './prisma';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sendWelcomeEmail } from './email';
import { validatePasswordPolicy } from './passwordPolicy';
import { issueAndSendVerification, isUserEmailVerified } from './emailVerification';
import { validateAndSanitizeName } from './sanitizeText';
import { revokeToken, isTokenRevoked } from './tokenRevocation';

// ─── Password Hashing (bcryptjs - pure JS, works in serverless) ─────────────

let bcryptModule: typeof import('bcryptjs') | null = null;

async function getBcrypt() {
  if (!bcryptModule) {
    bcryptModule = await import('bcryptjs');
  }
  return bcryptModule;
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await getBcrypt();
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await getBcrypt();
  return bcrypt.compare(password, hash);
}

// ─── JWT Session Management ─────────────────────────────────────────────────

// P0: Never fall back to a hardcoded secret in production - an attacker who
// finds this repo could forge valid session tokens.
//
// Lazy initialization: the secret is resolved on first use, NOT at module
// load time. This prevents next build from crashing when it statically
// imports route modules in NODE_ENV=production (before env vars are served).
let _jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth] JWT_SECRET environment variable is not set. Cannot start in production without it.');
    }
    // Dev-only fallback - safe because NODE_ENV !== 'production'
    console.warn('[auth] WARNING: JWT_SECRET is not set. Using insecure dev fallback. Set JWT_SECRET in .env.local.');
    _jwtSecret = new TextEncoder().encode('citeroute-dev-secret-DO-NOT-USE-IN-PROD');
  } else {
    _jwtSecret = new TextEncoder().encode(secret);
  }
  return _jwtSecret;
}

const SESSION_COOKIE = 'citeroute_session';
const SESSION_MAX_AGE = 60 * 60; // 1 hour (sliding refresh on active requests)

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  tokenVersion?: number;
  jti?: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const jti = payload.jti || crypto.randomUUID();
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string,
  options?: { checkRevocation?: boolean }
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const session = payload as unknown as SessionPayload & { tokenVersion?: number; jti?: string };
    if (session.role === 'admin') {
      session.tier = 'enterprise';
    }

    if (options?.checkRevocation) {
      // Check JTI revocation blacklist
      const jti = session.jti || (payload.jti as string | undefined);
      if (jti && (await isTokenRevoked(jti))) {
        return null;
      }

      if (session.userId) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { tokenVersion: true, isActive: true },
        });
        if (!user || !user.isActive) return null;
        if (
          (session.tokenVersion !== undefined && user.tokenVersion !== undefined && session.tokenVersion !== user.tokenVersion) ||
          (session.tokenVersion === undefined && user.tokenVersion > 1)
        ) {
          return null;
        }
      }
    }

    return session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Server-side session revocation:
 * Increments the user's tokenVersion in the database, invalidating all existing active sessions across all devices.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: { increment: 1 },
    },
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return null;
  }
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const session = payload as unknown as SessionPayload & { iat?: number; exp?: number; tokenVersion?: number; jti?: string };
    if (!session || !session.userId) return null;

    // Check if token was revoked via JTI blacklist
    const jti = session.jti || (payload.jti as string | undefined);
    if (jti && (await isTokenRevoked(jti))) {
      try {
        cookieStore.delete(SESSION_COOKIE);
      } catch {}
      return null;
    }

    if (session.role === 'admin') {
      session.tier = 'enterprise';
    }

    // Always verify user and session version against database for real-time revocation
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          avatarUrl: true,
          isActive: true,
          tokenVersion: true,
        },
      });
    } catch (err) {
      console.warn('[auth] Failed to query user during session check:', err);
    }

    // Revoke session if user does not exist or is inactive
    if (!user || !user.isActive) {
      try {
        cookieStore.delete(SESSION_COOKIE);
      } catch {}
      return null;
    }

    // Server-side session revocation: if user's tokenVersion was incremented (e.g. via password reset),
    // invalidate and destroy this session immediately across all devices.
    if (
      (session.tokenVersion !== undefined && user.tokenVersion !== undefined && session.tokenVersion !== user.tokenVersion) ||
      (session.tokenVersion === undefined && user.tokenVersion > 1)
    ) {
      try {
        cookieStore.delete(SESSION_COOKIE);
      } catch {}
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const iat = session.iat ?? now;
    const exp = session.exp ?? (iat + SESSION_MAX_AGE);
    const totalLifetime = exp - iat;
    const age = now - iat;

    const isVerified = await isUserEmailVerified(user);

    // Sliding refresh: if token is valid and > 50% through its lifetime, refresh it
    if (totalLifetime > 0 && age > totalLifetime / 2) {
      const refreshedSession: SessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.role === 'admin' ? 'enterprise' : user.tier,
        avatarUrl: user.avatarUrl,
        emailVerified: isVerified,
        tokenVersion: user.tokenVersion,
      };

      const refreshedToken = await createSessionToken(refreshedSession);
      try {
        cookieStore.set(SESSION_COOKIE, refreshedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_MAX_AGE,
          path: '/',
        });
      } catch {}

      return refreshedSession;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.role === 'admin' ? 'enterprise' : user.tier,
      avatarUrl: user.avatarUrl,
      emailVerified: isVerified,
      tokenVersion: user.tokenVersion,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const jti = (payload.jti as string | undefined) || (payload as any).jti;
      const exp = payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
      const userId = (payload as any).userId as string | undefined;

      if (jti) {
        await revokeToken(jti, new Date(exp * 1000), userId);
      }
    } catch (err) {
      console.warn('[auth] Error parsing session token during logout revocation:', err);
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

// ─── User Operations ────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string; requiresVerification?: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Valid email is required.' };
  }

  // Validate and sanitize name (blocks URL injection, HTML tags, and social engineering)
  const nameValidation = validateAndSanitizeName(name);
  if (!nameValidation.isValid) {
    return { success: false, error: nameValidation.error || 'Valid name is required.' };
  }
  const cleanName = nameValidation.sanitized;

  const passwordValidation = validatePasswordPolicy(password);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.error || 'Password does not meet security requirements.' };
  }

  // Check existing
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const passwordHash = await hashPassword(password);

  // First user gets admin role
  const allUsers = await prisma.user.findMany({ select: { id: true }, take: 1 });
  const isFirstUser = allUsers.length === 0;

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: cleanName,
      passwordHash,
      role: isFirstUser ? 'admin' : 'user',
      tier: isFirstUser ? 'enterprise' : 'free',
      provider: 'email',
    },
  });

  // Dispatch account verification email with tokenized link and 6-digit code
  issueAndSendVerification(user.id, user.email, user.name).catch((err) => {
    console.error('[auth/register] Failed to dispatch account verification email:', err);
  });

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: isFirstUser ? 'enterprise' : user.tier,
    avatarUrl: user.avatarUrl,
    emailVerified: false,
    tokenVersion: user.tokenVersion ?? 1,
  };

  await setSessionCookie(session);
  return { success: true, user: session, requiresVerification: true };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string; requiresVerification?: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  if (!user.isActive) {
    return { success: false, error: 'This account has been deactivated.' };
  }

  if (!user.passwordHash) {
    return { success: false, error: `This account uses ${user.provider} sign-in. Please use that method.` };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password.' };
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const emailVerified = await isUserEmailVerified(user);

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.role === 'admin' ? 'enterprise' : user.tier,
    avatarUrl: user.avatarUrl,
    emailVerified,
    tokenVersion: user.tokenVersion ?? 1,
  };

  await setSessionCookie(session);
  return { success: true, user: session, requiresVerification: !emailVerified };
}

// ─── OAuth User Upsert ──────────────────────────────────────────────────────

export async function upsertOAuthUser(profile: {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'github';
  providerId: string;
}): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  const normalizedEmail = profile.email.toLowerCase().trim();

  // Check if user exists by email
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    // Preserve primary account provider consistency:
    // 1. If the user registered via email, preserve provider: 'email' and do not set providerId.
    // 2. If the user registered via OAuth (e.g. google), do not silently clobber provider to another OAuth provider.
    // 3. Update providerId only when logging in with the matching provider or if no provider was previously set.
    const isSameProvider = user.provider === profile.provider;
    const shouldUpdateProvider = !user.provider || isSameProvider;

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: profile.avatarUrl || user.avatarUrl,
        provider: shouldUpdateProvider ? profile.provider : user.provider,
        providerId: shouldUpdateProvider ? profile.providerId : user.providerId,
        lastLoginAt: new Date(),
      },
    });
  } else {
    // First user gets admin role
    const allUsers = await prisma.user.findMany({ select: { id: true }, take: 1 });
    const isFirstUser = allUsers.length === 0;

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        provider: profile.provider,
        providerId: profile.providerId,
        role: isFirstUser ? 'admin' : 'user',
        tier: isFirstUser ? 'enterprise' : 'free',
        lastLoginAt: new Date(),
      },
    });

    // Dispatch welcome onboarding email asynchronously for new OAuth signup
    sendWelcomeEmail({ to: user.email, userName: user.name }).catch((err) => {
      console.error('[auth/oauth] Failed to dispatch welcome email:', err);
    });
  }

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.role === 'admin' ? 'enterprise' : user.tier,
    avatarUrl: user.avatarUrl,
    emailVerified: true,
    tokenVersion: user.tokenVersion ?? 1,
  };

  await setSessionCookie(session);
  return { success: true, user: session };
}

// ─── OAuth Helper ────────────────────────────────────────────────────────────

export function getOAuthRedirectUri(
  req: { headers: { get: (name: string) => string | null }; nextUrl: { host: string } },
  provider: 'google' | 'github'
): string {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const hostHeader = req.headers.get('host');
  const host = forwardedHost || hostHeader || req.nextUrl.host;

  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const proto = isLocal ? 'http' : 'https';

  return `${proto}://${host}/api/auth/${provider}/callback`;
}

// ─── Password Reset Tokens ──────────────────────────────────────────────────

export interface PasswordResetPayload {
  userId: string;
  email: string;
  purpose: 'password_reset';
  hashSnippet: string;
  tokenId: string;
}

/**
 * Creates a single-use, time-limited password reset token.
 * Automatically invalidates all previously issued reset tokens for this user.
 */
export async function createPasswordResetToken(user: {
  id: string;
  email: string;
  passwordHash: string | null;
}): Promise<string> {
  const secret = getJwtSecret();
  const hashSnippet = user.passwordHash ? user.passwordHash.slice(-12) : 'no-prior-hash';
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // 1. Invalidate all previously issued reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // 2. Persist the newly created token as the sole active token
  await prisma.passwordResetToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      expiresAt,
      used: false,
    },
  });

  return new SignJWT({
    userId: user.id,
    email: user.email,
    purpose: 'password_reset',
    hashSnippet,
    tokenId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(secret);
}

/**
 * Validates a password reset token:
 * - Checks cryptographic signature and 30-minute expiry
 * - Verifies user exists and is active
 * - Confirms the password hasn't changed since token issuance
 * - Ensures the token exists in the database, is marked unused, and is the latest active token issued
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  tokenId?: string;
  error?: string;
}> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.purpose !== 'password_reset') {
      return { valid: false, error: 'Invalid token purpose' };
    }

    const userId = payload.userId as string;
    const email = payload.email as string;
    const tokenSnippet = payload.hashSnippet as string;
    const tokenId = (payload.tokenId || payload.jti) as string;

    if (!userId || !tokenId) {
      return { valid: false, error: 'Malformed or incomplete reset token.' };
    }

    // Fetch user from DB to verify current state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { valid: false, error: 'User not found or account is deactivated' };
    }

    const currentSnippet = user.passwordHash ? user.passwordHash.slice(-12) : 'no-prior-hash';
    if (tokenSnippet !== currentSnippet) {
      return { valid: false, error: 'This reset link has already been used. Please request a new one.' };
    }

    // Verify against database record for active status
    const dbToken = await prisma.passwordResetToken.findUnique({
      where: { id: tokenId },
    });

    if (!dbToken || dbToken.userId !== user.id) {
      return { valid: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
    }

    if (dbToken.used) {
      return {
        valid: false,
        error: 'This reset link is no longer valid because a newer reset link was requested or it has already been used. Please request a new link.',
      };
    }

    if (new Date() > dbToken.expiresAt) {
      return { valid: false, error: 'This reset link has expired. Please request a new one.' };
    }

    // Check if any newer reset token was generated after this token
    const newerToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: dbToken.createdAt },
      },
    });

    if (newerToken) {
      return {
        valid: false,
        error: 'This reset link is no longer valid because a newer reset link was requested. Please use the latest link sent to your email.',
      };
    }

    return { valid: true, userId: user.id, email: user.email, tokenId: dbToken.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid or expired token';
    return { valid: false, error: message };
  }
}


