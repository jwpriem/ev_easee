import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT active, do_namespace_id, do_trigger_name, cron_api_key
      FROM automation_settings
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        active: false,
        doConfigured: false,
      });
    }

    const settings = rows[0];
    return NextResponse.json({
      active: settings.active,
      doConfigured: !!(settings.do_namespace_id),
      triggerName: settings.do_trigger_name,
      namespaceId: settings.do_namespace_id,
    });
  } catch (error) {
    console.error('Automation status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get automation status' },
      { status: 500 }
    );
  }
}
