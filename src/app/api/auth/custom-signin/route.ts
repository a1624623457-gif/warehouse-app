import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(new URL("/api/auth/callback/credentials", req.url), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: body.username || "",
      password: body.password || "",
      redirect: "false",
    }).toString(),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");

  // Success: next-auth sends back JSON with `url` on successful credentials
  try {
    const json = await res.json();
    if (json.url) {
      const resp = NextResponse.json({ success: true });
      if (setCookie) resp.headers.set("set-cookie", setCookie);
      return resp;
    }
    return NextResponse.json({ error: "用户名或密码错误", detail: json }, { status: 401 });
  } catch {}

  const resp = NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  if (setCookie) resp.headers.set("set-cookie", setCookie);
  return resp;
}
