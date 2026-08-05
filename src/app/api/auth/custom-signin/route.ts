import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { encode } from "next-auth/jwt";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set");
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
      .get(username.trim()) as any;

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // Update last login
    db.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).run(user.id);

    // Generate JWT token manually
    const token = await encode({
      token: {
        id: user.id.toString(),
        name: user.display_name,
        username: user.username,
        role: user.role,
      },
      secret: process.env.AUTH_SECRET!,
      salt: "authjs.session-token",
    });

    // Set the session cookie
    const response = NextResponse.json({ success: true });

    // Use secure cookie in production
    const isProd = req.nextUrl.hostname !== "localhost";
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (e: any) {
    console.error("Login error:", e);
    return NextResponse.json(
      { error: e?.message || "登录失败" },
      { status: 401 }
    );
  }
}
