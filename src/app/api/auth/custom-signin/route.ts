import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { encode } from "next-auth/jwt";

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

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error("AUTH_SECRET not set");
      return NextResponse.json({ error: "服务器配置错误" }, { status: 500 });
    }

    // Generate JWT token
    const token = await encode({
      token: {
        id: user.id.toString(),
        name: user.display_name,
        username: user.username,
        role: user.role,
        sub: user.id.toString(),
      },
      secret,
      salt: "authjs.session-token",
    });

    // Determine cookie name based on environment
    const isProd = req.nextUrl.hostname !== "192.168.5.2" && req.nextUrl.hostname !== "localhost";
    const cookieName = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";

    const response = NextResponse.json({ success: true });

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
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
