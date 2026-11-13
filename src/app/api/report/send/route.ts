// POST /api/report/send
// Secure server-side report delivery adapter. The destination is configured via
// the REPORT_WEBHOOK_URL environment variable (an HTTPS webhook of the mission
// medical system or an email-delivery provider). Credentials never reach the
// client. If not configured, the route responds 501 and the UI keeps local
// PDF/JSON export available.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const configured = process.env.REPORT_WEBHOOK_URL;
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Online delivery is not configured on this server. Set the REPORT_WEBHOOK_URL environment variable (an HTTPS endpoint of the mission medical system or email provider) to enable it. Local PDF/JSON export remains fully available.',
      },
      { status: 501 },
    );
  }
  if (!configured.startsWith('https://')) {
    return NextResponse.json({ ok: false, error: 'REPORT_WEBHOOK_URL must use HTTPS.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    // Never log the payload — it contains health information.
    const res = await fetch(configured, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.REPORT_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.REPORT_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Delivery endpoint responded with status ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: `Delivery failed: ${(err as Error).message}` }, { status: 502 });
  }
}

export async function GET() {
  const configured = Boolean(process.env.REPORT_WEBHOOK_URL);
  return NextResponse.json({
    configured,
    destination: configured ? 'Configured mission medical delivery endpoint (HTTPS webhook)' : null,
  });
}
