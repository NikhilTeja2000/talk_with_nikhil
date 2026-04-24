import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const readinessUrl = new URL("/readiness", apiBaseUrl).toString();
  const response = await fetch(readinessUrl, { cache: "no-store" });
  const body = await response.json().catch(() => null);

  return NextResponse.json(
    {
      ok: response.ok,
      status: response.status,
      readiness: body,
      checked_at: new Date().toISOString(),
    },
    { status: response.ok ? 200 : 502 }
  );
}
