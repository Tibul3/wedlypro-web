"use client";

import { CONSENT_OPEN_EVENT } from "./CookieConsentBanner";

export default function CookiePreferencesLink() {
  return (
    <button
      type="button"
      className="text-sm text-zinc-600 underline transition hover:text-zinc-900"
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      Manage cookies
    </button>
  );
}

