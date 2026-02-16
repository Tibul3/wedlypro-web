"use client";

import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  email: string;
  message: string;
  company: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  message: "",
  company: "",
};

export default function SupportContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setResult({ ok: false, message: data.message ?? "Unable to send message right now." });
      } else {
        setResult({ ok: true, message: data.message ?? "Message sent successfully." });
        setForm(initialState);
      }
    } catch {
      setResult({ ok: false, message: "Unable to send message right now." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-black/10 bg-zinc-50 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600">Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-300"
            maxLength={120}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-300"
            maxLength={200}
          />
        </label>
      </div>

      <label className="hidden">
        <span>Company</span>
        <input
          value={form.company}
          onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-zinc-600">Message</span>
        <textarea
          required
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          className="min-h-28 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 focus:border-zinc-300"
          maxLength={3000}
        />
      </label>

      <button type="submit" className="btn-primary" disabled={sending}>
        {sending ? "Sending..." : "Send message"}
      </button>

      {result ? (
        <p className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-700"}`}>{result.message}</p>
      ) : null}
    </form>
  );
}

