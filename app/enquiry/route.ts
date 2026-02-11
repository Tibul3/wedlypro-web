import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_FORM_URL =
  'https://hxoqpapwugszehqshkox.supabase.co/functions/v1/publicLeadFormSubmit';

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug')?.trim();
  if (!slug) return new NextResponse('Missing slug.', { status: 400 });

  const upstream = await fetch(`${SUPABASE_FORM_URL}?slug=${encodeURIComponent(slug)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  const html = await upstream.text();
  return new NextResponse(html, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(SUPABASE_FORM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
