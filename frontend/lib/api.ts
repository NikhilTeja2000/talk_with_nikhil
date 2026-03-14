import { API_BASE_URL } from "./constants";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function authedRequest<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
}

export const api = {
  healthCheck: () => request<{ status: string }>("/health"),

  createSession: () =>
    request<{ session_id: string; status: string }>("/api/session/create", {
      method: "POST",
    }),

  endSession: (sessionId: string) =>
    request<{ session_id: string; status: string }>(
      `/api/session/${sessionId}/end`,
      { method: "POST" }
    ),

  getSessionState: (sessionId: string) =>
    request<{
      session_id: string;
      status: string;
      turn_count: number;
      current_topic: string;
    }>(`/api/session/${sessionId}/state`),

  login: (email: string, password: string) =>
    request<{
      access_token: string;
      refresh_token: string;
      user_id: string;
      email: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  refreshToken: (refreshToken: string) =>
    request<{ access_token: string; refresh_token: string }>(
      `/api/auth/refresh?refresh_token=${refreshToken}`,
      { method: "POST" }
    ),

  getMe: (token: string) =>
    authedRequest<{ id: string; email: string }>("/api/auth/me", token),

  adminGetSessions: (token: string, limit = 20, offset = 0) =>
    authedRequest<{ sessions: Record<string, unknown>[]; count: number }>(
      `/api/admin/sessions?limit=${limit}&offset=${offset}`,
      token
    ),

  adminGetSession: (token: string, sessionId: string) =>
    authedRequest<{
      session: Record<string, unknown>;
      transcript: Record<string, unknown>[];
      questions: Record<string, unknown>[];
    }>(`/api/admin/sessions/${sessionId}`, token),

  adminGetFlagged: (token: string, status = "open", limit = 20, offset = 0) =>
    authedRequest<{ questions: Record<string, unknown>[]; count: number }>(
      `/api/admin/flagged?status=${status}&limit=${limit}&offset=${offset}`,
      token
    ),

  adminResolve: (token: string, questionId: string, adminAnswer: string, knowledgeTarget?: string) =>
    authedRequest<{ status: string; question_id: string }>(
      `/api/admin/flagged/${questionId}/resolve`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ admin_answer: adminAnswer, knowledge_target: knowledgeTarget }),
      }
    ),

  adminGetStats: (token: string) =>
    authedRequest<{
      total_sessions: number;
      active_sessions: number;
      open_flags: number;
      total_questions: number;
    }>("/api/admin/stats", token),

  adminGetProfile: (token: string) =>
    authedRequest<{ profile: Record<string, unknown> }>("/api/admin/profile", token),

  adminUpdateProfile: (token: string, data: Record<string, unknown>) =>
    authedRequest<{ profile: Record<string, unknown> }>("/api/admin/profile", token, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
