import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, ctx: { params: { token: string } }) {
  const token = ctx.params.token;
  if (!token) return new NextResponse('Missing token.', { status: 400 });

  const resolver = `https://hxoqpapwugszehqshkox.supabase.co/functions/v1/resolveDocumentEmailLink?token=${encodeURIComponent(token)}`;
  const res = await fetch(resolver, { method: 'GET' });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.targetUrl) {
    return new NextResponse('Document link is invalid or expired.', { status: 410 });
  }

  return NextResponse.redirect(data.targetUrl, 302);
}
