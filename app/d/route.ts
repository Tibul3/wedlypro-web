import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get('target');

  if (!target) {
    return new NextResponse('Missing document link.', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('Invalid document link.', { status: 400 });
  }

  // Only allow redirects to your Supabase project host
  const allowedHost = 'hxoqpapwugszehqshkox.supabase.co';
  if (parsed.hostname !== allowedHost) {
    return new NextResponse('Invalid target host.', { status: 400 });
  }

  return NextResponse.redirect(parsed.toString(), 302);
}
