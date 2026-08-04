// Server-only auth helpers. Uses Web Crypto (globalThis.crypto) instead of
// Node's `crypto` module so this works unchanged in both the Node.js API
// routes and the Edge middleware.

export type Role = "clinician" | "admin";

export type SessionUser = {
  username: string;
  role: Role;
  displayName: string;
};

type AuthUserRecord = SessionUser & { password: string };

export const SESSION_COOKIE_NAME = "triage_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getUsers(): AuthUserRecord[] {
  const raw = process.env.AUTH_USERS ?? "[]";
  try {
    return JSON.parse(raw) as AuthUserRecord[];
  } catch {
    return [];
  }
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyCredentials(username: string, password: string): SessionUser | null {
  const match = getUsers().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!match || !constantTimeEqual(match.password, password)) return null;
  return { username: match.username, role: match.role, displayName: match.displayName };
}

export async function createSessionCookie(user: SessionUser): Promise<string> {
  const payload = JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const sig = await hmacSign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export async function verifySessionCookie(
  cookieValue: string | undefined | null
): Promise<SessionUser | null> {
  if (!cookieValue) return null;
  const [payloadB64, sig] = cookieValue.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = await hmacSign(payloadB64, getSecret());
  if (!constantTimeEqual(expectedSig, sig)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (payload.role !== "clinician" && payload.role !== "admin") return null;
    return {
      username: payload.username,
      role: payload.role,
      displayName: payload.displayName,
    };
  } catch {
    return null;
  }
}

/** All clinician display names (used by the admin dashboard). Excludes admin accounts. */
export function getClinicianDisplayNames(): string[] {
  return getUsers()
    .filter((u) => u.role === "clinician")
    .map((u) => u.displayName);
}
