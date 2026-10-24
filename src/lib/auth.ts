import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";

export const SESSION_COOKIE_NAME = "wealthy_session";

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ?? "wealthy_dashboard_fallback_dev_secret_32_chars";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  authenticated: boolean;
  iat?: number;
  exp?: number;
}

export async function signSessionToken(): Promise<string> {
  return new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
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
    if (payload.authenticated === true) {
      return {
        authenticated: true,
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

export function verifyAppPasscode(inputPasscode: string): boolean {
  const configuredPasscode = process.env.APP_PASSCODE ?? "123456";
  return inputPasscode.trim() === configuredPasscode.trim();
}

