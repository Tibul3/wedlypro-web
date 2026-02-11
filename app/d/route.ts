import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_RESOLVER_URL =
  'https://hxoqpapwugszehqshkox.supabase.co/functions/v1/resolveDocumentEmailLink';

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token) return new NextResponse('Missing token.', { status: 400 });

  const resolverUrl = `${SUPABASE_RESOLVER_URL}?token=${encodeURIComponent(token)}`;
  const resolverRes = await fetch(resolverUrl, { method: 'GET', cache: 'no-store' });
  const resolverJson = await resolverRes.json().catch(() => null);

  if (!resolverRes.ok || !resolverJson?.targetUrl) {
    return new NextResponse('Document link is invalid or expired.', { status: 410 });
  }

  const upstream = await fetch(resolverJson.targetUrl, { method: 'GET', cache: 'no-store' });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Document is unavailable.', { status: 404 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? 'inline; filename="document.pdf"',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
