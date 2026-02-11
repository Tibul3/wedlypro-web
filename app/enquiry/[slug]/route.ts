import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_FORM_URL =
  'https://hxoqpapwugszehqshkox.supabase.co/functions/v1/publicLeadFormSubmit';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const slug = params.slug;
  if (!slug) return new NextResponse('Missing slug.', { status: 400 });

  return NextResponse.redirect(
    `https://wedlypro.com/enquiry?slug=${encodeURIComponent(slug)}`,
    302
  );
}
