"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface ProfileData {
  id: string;
  name: string;
  headline: string;
  location: string;
  education: Record<string, string> | null;
  current_focus: string[];
  core_skills: string[];
  interests: string[];
  contact: Record<string, string> | null;
}

export default function ProfileEditor() {
  const token = useAuthStore((s) => s.accessToken);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    if (!token) return;
    api.adminGetProfile(token).then((res) => {
      const p = res.profile as unknown as ProfileData;
      setProfile(p);
      setDraft(p);
    }).catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!token || !draft) return;
    setSaving(true);
    setSaved(false);
    try {
      const { id, ...fields } = draft;
      void id;
      const res = await api.adminUpdateProfile(token, fields);
      setProfile(res.profile as unknown as ProfileData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(profile || {});
    setEditing(false);
  };

  const updateField = (field: string, value: string | string[] | Record<string, string>) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const parseArrayInput = (val: string): string[] =>
    val.split(",").map((s) => s.trim()).filter(Boolean);

  if (!profile) {
    return (
      <p className="terminal-text text-sm text-[var(--text-muted)]">
        Loading profile...
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="terminal-text text-sm text-[var(--text-muted)]">
          PROFILE DATA
        </h2>
        <div className="flex gap-2">
          {saved && (
            <span className="text-xs terminal-text text-[var(--accent-green)]">
              SAVED
            </span>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 terminal-text border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-colors"
            >
              EDIT
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs px-2 py-1 terminal-text border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 transition-colors disabled:opacity-50"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
              <button
                onClick={handleCancel}
                className="text-xs px-2 py-1 terminal-text border border-[var(--border)] text-[var(--text-muted)] hover:border-red-400 hover:text-red-400 transition-colors"
              >
                CANCEL
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="NAME"
          value={draft.name || ""}
          editing={editing}
          onChange={(v) => updateField("name", v)}
        />
        <Field
          label="HEADLINE"
          value={draft.headline || ""}
          editing={editing}
          onChange={(v) => updateField("headline", v)}
        />
        <Field
          label="LOCATION"
          value={draft.location || ""}
          editing={editing}
          onChange={(v) => updateField("location", v)}
        />
      </div>

      <ArrayField
        label="CURRENT FOCUS"
        values={draft.current_focus || []}
        editing={editing}
        onChange={(v) => updateField("current_focus", parseArrayInput(v))}
      />
      <ArrayField
        label="CORE SKILLS"
        values={draft.core_skills || []}
        editing={editing}
        onChange={(v) => updateField("core_skills", parseArrayInput(v))}
      />
      <ArrayField
        label="INTERESTS"
        values={draft.interests || []}
        editing={editing}
        onChange={(v) => updateField("interests", parseArrayInput(v))}
      />

      <JsonField
        label="EDUCATION"
        data={draft.education || {}}
        editing={editing}
        onChange={(v) => updateField("education", v)}
      />
      <JsonField
        label="CONTACT"
        data={draft.contact || {}}
        editing={editing}
        onChange={(v) => updateField("contact", v)}
      />
    </motion.div>
  );
}

function Field({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] terminal-text text-[var(--text-muted)]">
        {label}
      </label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm p-1.5 outline-none focus:border-[var(--accent-cyan)] terminal-text"
          autoComplete="off"
        />
      ) : (
        <p className="terminal-text text-sm text-[var(--text-primary)] border border-transparent p-1.5">
          {value || <span className="text-[var(--text-muted)]">—</span>}
        </p>
      )}
    </div>
  );
}

function ArrayField({
  label,
  values,
  editing,
  onChange,
}: {
  label: string;
  values: string[];
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] terminal-text text-[var(--text-muted)]">
        {label}
      </label>
      {editing ? (
        <input
          type="text"
          value={values.join(", ")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm p-1.5 outline-none focus:border-[var(--accent-cyan)] terminal-text"
          placeholder="comma separated values"
          autoComplete="off"
        />
      ) : (
        <div className="flex flex-wrap gap-1 p-1.5">
          {values.length > 0 ? (
            values.map((v) => (
              <span
                key={v}
                className="text-xs px-1.5 py-0.5 border border-[var(--border)] text-[var(--accent-cyan)] terminal-text"
              >
                {v}
              </span>
            ))
          ) : (
            <span className="text-[var(--text-muted)] text-sm terminal-text">—</span>
          )}
        </div>
      )}
    </div>
  );
}

function JsonField({
  label,
  data,
  editing,
  onChange,
}: {
  label: string;
  data: Record<string, string>;
  editing: boolean;
  onChange: (v: Record<string, string>) => void;
}) {
  const entries = Object.entries(data || {});

  const handleEntryChange = (oldKey: string, newKey: string, newVal: string) => {
    const updated = { ...data };
    if (oldKey !== newKey) {
      delete updated[oldKey];
    }
    updated[newKey] = newVal;
    onChange(updated);
  };

  const handleAdd = () => {
    onChange({ ...data, "": "" });
  };

  const handleRemove = (key: string) => {
    const updated = { ...data };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] terminal-text text-[var(--text-muted)]">
        {label}
      </label>
      {editing ? (
        <div className="space-y-1">
          {entries.map(([key, val], i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={key}
                onChange={(e) => handleEntryChange(key, e.target.value, val)}
                className="w-1/3 bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm p-1 outline-none focus:border-[var(--accent-cyan)] terminal-text"
                placeholder="key"
                autoComplete="off"
              />
              <input
                type="text"
                value={val}
                onChange={(e) => handleEntryChange(key, key, e.target.value)}
                className="flex-1 bg-transparent border border-[var(--border)] text-[var(--text-primary)] text-sm p-1 outline-none focus:border-[var(--accent-cyan)] terminal-text"
                placeholder="value"
                autoComplete="off"
              />
              <button
                onClick={() => handleRemove(key)}
                className="text-xs text-[var(--text-muted)] hover:text-red-400 terminal-text"
              >
                x
              </button>
            </div>
          ))}
          <button
            onClick={handleAdd}
            className="text-xs px-2 py-0.5 terminal-text border border-dashed border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
          >
            + ADD FIELD
          </button>
        </div>
      ) : (
        <div className="space-y-0.5 p-1.5">
          {entries.length > 0 ? (
            entries.map(([key, val]) => (
              <div key={key} className="terminal-text text-sm">
                <span className="text-[var(--text-muted)]">{key}:</span>{" "}
                <span className="text-[var(--text-primary)]">{val}</span>
              </div>
            ))
          ) : (
            <span className="text-[var(--text-muted)] text-sm terminal-text">—</span>
          )}
        </div>
      )}
    </div>
  );
}
