import { NextRequest } from "next/server";
import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";

export const SESSION_COOKIE_NAME = "wealthy_session";

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[SECURITY FATAL] JWT_SECRET must be configured with at least 32 characters in production."
      );
    }
    return new TextEncoder().encode(
      "wealthy_dashboard_fallback_dev_secret_32_chars"
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  authenticated: boolean;
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export async function signSessionToken(user: {
  id: string;
  username: string;
}): Promise<string> {
  return new SignJWT({
    authenticated: true,
    userId: user.id,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });
    if (
      payload.authenticated === true &&
      typeof payload.userId === "string" &&
      typeof payload.username === "string"
    ) {
      return {
        authenticated: true,
        userId: payload.userId,
        username: payload.username,
        iat: payload.iat,
        exp: payload.exp,
      };
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof JoseErrors.JOSEError) {
      console.warn("[Auth] Expired or invalid JWT token:", error.code, error.message);
      return null;
    }
    console.error("[Auth] Unexpected JWT verification failure:", error);
    return null;
  }
}

export async function requireAuthSession(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
