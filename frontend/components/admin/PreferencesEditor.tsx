"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type Preference = {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  tags?: string[] | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

function toTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PreferencesEditor() {
  const { accessToken } = useAuthStore();
  const token = accessToken || "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Preference[]>([]);

  const [draft, setDraft] = useState<Omit<Preference, "id">>({
    slug: "",
    category: "movies",
    title: "",
    content: "",
    tags: [],
    sort_order: 0,
    is_active: true,
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminGetPreferences(token);
      setItems(res.preferences as Preference[]);
    } catch (e) {
      setError((e as Error).message || "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ao = a.sort_order ?? 0;
      const bo = b.sort_order ?? 0;
      if (ao !== bo) return ao - bo;
      return (a.category || "").localeCompare(b.category || "");
    });
  }, [items]);

  const handleCreate = useCallback(async () => {
    if (!token) return;
    if (!draft.slug.trim() || !draft.title.trim() || !draft.category.trim() || !draft.content.trim()) {
      setError("slug, category, title, and content are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api.adminCreatePreference(token, {
        slug: draft.slug.trim(),
        category: draft.category.trim(),
        title: draft.title.trim(),
        content: draft.content.trim(),
        tags: draft.tags || [],
        sort_order: draft.sort_order ?? 0,
        is_active: draft.is_active ?? true,
      });
      const created = res.preference as Preference;
      setItems((prev) => [created, ...prev]);
      setDraft({
        slug: "",
        category: draft.category,
        title: "",
        content: "",
        tags: [],
        sort_order: (draft.sort_order ?? 0) + 10,
        is_active: true,
      });
    } catch (e) {
      setError((e as Error).message || "Failed to create preference");
    } finally {
      setSaving(false);
    }
  }, [token, draft]);

  const handleUpdate = useCallback(
    async (p: Preference) => {
      if (!token) return;
      setSaving(true);
      setError(null);
      try {
        const res = await api.adminUpdatePreference(token, p.id, {
          slug: p.slug,
          category: p.category,
          title: p.title,
          content: p.content,
          tags: p.tags || [],
          sort_order: p.sort_order ?? 0,
          is_active: p.is_active ?? true,
        });
        const updated = res.preference as Preference;
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } catch (e) {
        setError((e as Error).message || "Failed to update preference");
      } finally {
        setSaving(false);
      }
    },
    [token]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!token) return;
      setSaving(true);
      setError(null);
      try {
        await api.adminDeletePreference(token, id);
        setItems((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setError((e as Error).message || "Failed to delete preference");
      } finally {
        setSaving(false);
      }
    },
    [token]
  );

  const handleRebuild = useCallback(async () => {
    if (!token) return;
    setRebuilding(true);
    setError(null);
    try {
      await api.adminRebuildChunks(token);
    } catch (e) {
      setError((e as Error).message || "Failed to rebuild chunks");
    } finally {
      setRebuilding(false);
    }
  }, [token]);

  if (loading) {
    return <p className="terminal-text text-sm text-[var(--text-muted)]">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="terminal-text text-sm text-[var(--text-muted)]">PREFERENCES</h2>
          <p className="terminal-text text-xs text-[var(--text-muted)]">
            These are “about me” preferences (movies/anime/music/etc.) that the agent can use without guessing.
          </p>
        </div>
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          className="px-3 py-1.5 text-xs terminal-text border border-[var(--border)] text-[var(--accent-cyan)] hover:bg-[rgba(0,255,255,0.06)] disabled:opacity-50"
        >
          {rebuilding ? "REBUILDING..." : "REBUILD BRAIN"}
        </button>
      </div>

      {error && (
        <p className="terminal-text text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="border border-[var(--border)] rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="terminal-text text-xs text-[var(--accent-cyan)]">ADD NEW</h3>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-3 py-1.5 text-xs terminal-text border border-[var(--border)] text-[var(--accent-green)] hover:bg-[rgba(0,255,0,0.06)] disabled:opacity-50"
          >
            {saving ? "SAVING..." : "CREATE"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="SLUG" value={draft.slug} onChange={(v) => setDraft((d) => ({ ...d, slug: v }))} placeholder="e.g. anime" />
          <Field label="CATEGORY" value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} placeholder="e.g. movies" />
          <Field label="TITLE" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} placeholder="e.g. Anime" />
          <Field
            label="TAGS (comma separated)"
            value={(draft.tags || []).join(", ")}
            onChange={(v) => setDraft((d) => ({ ...d, tags: toTags(v) }))}
            placeholder="e.g. sci-fi, storytelling"
          />
          <Field
            label="SORT ORDER"
            value={String(draft.sort_order ?? 0)}
            onChange={(v) => setDraft((d) => ({ ...d, sort_order: Number(v || 0) }))} 
            placeholder="0"
          />
          <Toggle
            label="ACTIVE"
            checked={Boolean(draft.is_active)}
            onChange={(checked) => setDraft((d) => ({ ...d, is_active: checked }))}
          />
        </div>
        <TextArea
          label="CONTENT"
          value={draft.content}
          onChange={(v) => setDraft((d) => ({ ...d, content: v }))}
          placeholder="Write what you actually like / prefer. Keep it honest."
        />
      </div>

      <div className="space-y-3">
        {sorted.map((p) => (
          <div key={p.id} className="border border-[var(--border-subtle)] rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="terminal-text text-xs text-[var(--text-muted)]">
                {p.id}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(p)}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs terminal-text border border-[var(--border)] text-[var(--accent-cyan)] hover:bg-[rgba(0,255,255,0.06)] disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE"}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs terminal-text border border-[var(--border)] text-red-400 hover:bg-[rgba(255,0,0,0.06)] disabled:opacity-50"
                >
                  DELETE
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="SLUG" value={p.slug} onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, slug: v } : x)))} />
              <Field label="CATEGORY" value={p.category} onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, category: v } : x)))} />
              <Field label="TITLE" value={p.title} onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, title: v } : x)))} />
              <Field
                label="TAGS"
                value={(p.tags || []).join(", ")}
                onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, tags: toTags(v) } : x)))}
              />
              <Field
                label="SORT ORDER"
                value={String(p.sort_order ?? 0)}
                onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, sort_order: Number(v || 0) } : x)))}
              />
              <Toggle
                label="ACTIVE"
                checked={Boolean(p.is_active ?? true)}
                onChange={(checked) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: checked } : x)))}
              />
            </div>
            <TextArea
              label="CONTENT"
              value={p.content}
              onChange={(v) => setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, content: v } : x)))}
            />
          </div>
        ))}

        {sorted.length === 0 && (
          <p className="terminal-text text-sm text-[var(--text-muted)]">
            No preferences yet.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs terminal-text border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          REFRESH
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <div className="terminal-text text-[10px] text-[var(--text-muted)]">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs terminal-text bg-black border border-[var(--border-subtle)] rounded outline-none focus:border-[var(--accent-cyan)]"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 block">
      <div className="terminal-text text-[10px] text-[var(--text-muted)]">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full px-2 py-2 text-xs terminal-text bg-black border border-[var(--border-subtle)] rounded outline-none focus:border-[var(--accent-cyan)]"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="space-y-1">
      <div className="terminal-text text-[10px] text-[var(--text-muted)]">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-full px-2 py-1 text-xs terminal-text border rounded ${
          checked
            ? "border-[var(--accent-green)] text-[var(--accent-green)]"
            : "border-[var(--border-subtle)] text-[var(--text-muted)]"
        }`}
      >
        {checked ? "YES" : "NO"}
      </button>
    </label>
  );
}

