import { NextRequest, NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
  company?: string; // honeypot
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const ipLimitStore = globalThis as unknown as {
  __wedlyproContactRateLimit?: Map<string, RateLimitState>;
};
if (!ipLimitStore.__wedlyproContactRateLimit) {
  ipLimitStore.__wedlyproContactRateLimit = new Map<string, RateLimitState>();
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const store = ipLimitStore.__wedlyproContactRateLimit!;
  const current = store.get(ip);

  if (!current || current.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  store.set(ip, { ...current, count: current.count + 1 });
  return true;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as ContactPayload;
    const name = safeText(body.name);
    const email = safeText(body.email).toLowerCase();
    const message = safeText(body.message);
    const company = safeText(body.company);

    if (company) {
      return NextResponse.json({ ok: true, message: "Message received." });
    }

    if (!name || name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { ok: false, message: "Please enter a valid name." },
        { status: 400 },
      );
    }
    if (!email || email.length > 200 || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (!message || message.length < 10 || message.length > 3000) {
      return NextResponse.json(
        { ok: false, message: "Please enter a message between 10 and 3000 characters." },
        { status: 400 },
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM_EMAIL ?? "Wedly Pro <noreply@mail.wedlypro.com>";
    const to = process.env.CONTACT_TO_EMAIL ?? "support@wedlypro.com";

    if (!resendApiKey) {
      return NextResponse.json(
        {
          ok: false,
          message: "Support form is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 },
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Website support message from ${name}`,
        text: [
          "New support message from wedlypro.com",
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          `IP: ${ip}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          ok: false,
          message: "Unable to send message right now. Please try again shortly.",
          details,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, message: "Thanks — your message has been sent." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Unable to process request." },
      { status: 500 },
    );
  }
}

