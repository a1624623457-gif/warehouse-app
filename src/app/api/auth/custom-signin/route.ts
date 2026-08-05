import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    // Forward to the actual next-auth credentials endpoint
    const body = await req.json();
    const authRes = await fetch(new URL("/api/auth/callback/credentials", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: body.username || "",
        password: body.password || "",
        redirect: "false",
        csrfToken: "dummy", // next-auth beta may not check this strictly
      }).toString(),
      redirect: "manual",
    });

    // Get the set-cookie header from next-auth
    const setCookie = authRes.headers.get("set-cookie");
    const authBody = await authRes.text();

    if (!authRes.ok && !setCookie) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
