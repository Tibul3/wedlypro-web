"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "wedlypro_cookie_consent";
const CONSENT_EVENT = "wedlypro-consent-changed";
export const CONSENT_OPEN_EVENT = "wedlypro-consent-open";

function setConsent(value: "accepted" | "rejected") {
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    setShow(stored !== "accepted" && stored !== "rejected");

    const openBanner = () => setShow(true);
    window.addEventListener(CONSENT_OPEN_EVENT, openBanner);
    return () => {
      window.removeEventListener(CONSENT_OPEN_EVENT, openBanner);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-black/10 bg-white p-4 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.5)]">
        <p className="text-sm leading-6 text-zinc-700">
          We use essential technologies to run the site and optional analytics to improve performance.
          You can accept or reject non-essential analytics cookies.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setConsent("accepted");
              setShow(false);
            }}
          >
            Accept analytics
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setConsent("rejected");
              setShow(false);
            }}
          >
            Reject non-essential
          </button>
          <Link href="/privacy" className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
