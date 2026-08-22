import { prisma } from './prisma';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
    _jwtSecret = new TextEncoder().encode('omniroute-dev-secret-DO-NOT-USE-IN-PROD');
  } else {
    _jwtSecret = new TextEncoder().encode(secret);
  }
  return _jwtSecret;
}

const SESSION_COOKIE = 'omniroute_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  avatarUrl?: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
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

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ─── User Operations ────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Validate
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Valid email is required.' };
  }
  if (!name || name.trim().length < 2) {
    return { success: false, error: 'Name must be at least 2 characters.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
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
      name: name.trim(),
      passwordHash,
      role: isFirstUser ? 'admin' : 'user',
      provider: 'email',
    },
  });

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    avatarUrl: user.avatarUrl,
  };

  await setSessionCookie(session);
  return { success: true, user: session };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionPayload; error?: string }> {
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

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    avatarUrl: user.avatarUrl,
  };

  await setSessionCookie(session);
  return { success: true, user: session };
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
    // Update OAuth info and login
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: profile.avatarUrl || user.avatarUrl,
        provider: user.provider === 'email' ? user.provider : profile.provider,
        providerId: profile.providerId,
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
        lastLoginAt: new Date(),
      },
    });
  }

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier: user.tier,
    avatarUrl: user.avatarUrl,
  };

  await setSessionCookie(session);
  return { success: true, user: session };
}
