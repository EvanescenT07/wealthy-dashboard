import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      confirmPassword?: string;
      displayName?: string;
    };

    const rawUsername =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const rawPassword = typeof body.password === "string" ? body.password : "";
    const rawConfirm =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : rawPassword;
    const rawDisplayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";

    if (!rawUsername || !rawPassword) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (rawUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_.-]+$/.test(rawUsername)) {
      return NextResponse.json(
        {
          error:
            "Username may only contain letters, numbers, dots, hyphens, and underscores.",
        },
        { status: 400 }
      );
    }

    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (rawPassword !== rawConfirm) {
      return NextResponse.json(
        { error: "Password and confirmation password do not match." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username: rawUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken. Please choose another or sign in." },
        { status: 409 }
      );
    }

    const createdUser = await prisma.user.create({
      data: {
        username: rawUsername,
        passwordHash: hashPassword(rawPassword),
        displayName: rawDisplayName || rawUsername,
      },
    });

    const token = await signSessionToken({
      id: createdUser.id,
      username: createdUser.username,
    });

    const response = NextResponse.json(
      {
        authenticated: true,
        user: {
          id: createdUser.id,
          username: createdUser.username,
          displayName: createdUser.displayName,
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.error("[API /api/auth/register] Invalid JSON:", error.message);
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        "[API /api/auth/register] Prisma error:",
        error.code,
        error.message
      );
      return NextResponse.json(
        { error: "Database error while creating user account." },
        { status: 500 }
      );
    }
    console.error("[API /api/auth/register] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}

