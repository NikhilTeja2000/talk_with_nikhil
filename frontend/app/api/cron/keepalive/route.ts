import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 55_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** Direct REST ping — wakes Supabase even when Cloud Run is cold. */
async function pingSupabase(): Promise<{
  ok: boolean;
  status?: number;
  error?: string;
}> {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: "Supabase URL or anon key not configured" };
  }

  const restUrl = new URL("/rest/v1/knowledge_chunks", supabaseUrl);
  restUrl.searchParams.set("select", "id");
  restUrl.searchParams.set("limit", "1");

  try {
    const response = await fetchWithTimeout(restUrl.toString(), {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    return { ok: response.ok, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Supabase ping failed";
    return { ok: false, error: message };
  }
}

/** Full stack check via Cloud Run (Gemini + Supabase + chunk count). */
async function pingBackendReadiness(): Promise<{
  ok: boolean;
  status?: number;
  readiness?: unknown;
  error?: string;
}> {
  const apiBaseUrl =
    process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return { ok: false, error: "API_BASE_URL not configured" };
  }

  const readinessUrl = new URL("/readiness", apiBaseUrl).toString();

  try {
    const response = await fetchWithTimeout(readinessUrl);
    const body = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      readiness: body,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backend ping failed";
    return { ok: false, error: message };
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const [supabase, backend] = await Promise.all([
    pingSupabase(),
    pingBackendReadiness(),
  ]);

  // Keepalive succeeds if Supabase woke up; backend may still be cold on first hit.
  const ok = supabase.ok;

  return NextResponse.json(
    {
      ok,
      checked_at: new Date().toISOString(),
      supabase,
      backend,
    },
    { status: ok ? 200 : 502 }
  );
}
