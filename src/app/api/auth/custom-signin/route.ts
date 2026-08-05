import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const formData = new URLSearchParams();
  formData.append("username", body.username || "");
  formData.append("password", body.password || "");
  formData.append("csrfToken", "dummy");
  formData.append("redirect", "false");
  formData.append("json", "true");

  const res = await fetch(new URL("/api/auth/callback/credentials", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "false",
    },
    body: formData.toString(),
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");

  try {
    const json = await res.json();
    if (json && (json.url || json.callbackUrl)) {
      const resp = NextResponse.json({ success: true });
      if (setCookie) {
        resp.headers.set("set-cookie", setCookie);
      }
      return resp;
    }
  } catch {
    // body is html on error, that's fine
  }

  const resp = NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  // Even on error, forward cookies — next-auth sets session cookies on success
  if (setCookie) {
    resp.headers.set("set-cookie", setCookie);
  }
  return resp;
}
