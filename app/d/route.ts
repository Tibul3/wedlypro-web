import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get('target');

  if (!target) return new NextResponse('Missing document link.', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('Invalid document link.', { status: 400 });
  }

  // Safety: only allow your Supabase host
  if (parsed.hostname !== 'hxoqpapwugszehqshkox.supabase.co') {
    return new NextResponse('Invalid target host.', { status: 400 });
  }

  const upstream = await fetch(parsed.toString(), { method: 'GET' });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Document not available.', { status: upstream.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/pdf';
  const contentDisposition =
    upstream.headers.get('content-disposition') ?? 'inline; filename="document.pdf"';

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'private, no-store',
    },
  });
}
