import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';
import { updateTrigger } from '@/lib/digitalocean';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT encrypted_do_token, do_namespace_id, do_trigger_name
      FROM automation_settings
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No automation configured' }, { status: 400 });
    }

    const settings = rows[0];

    if (settings.encrypted_do_token && settings.do_namespace_id && settings.do_trigger_name) {
      const doToken = decryptToken(settings.encrypted_do_token);
      await updateTrigger(doToken, settings.do_namespace_id, settings.do_trigger_name, true);
    }

    await sql`
      UPDATE automation_settings
      SET active = true, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${session.userId}
    `;

    return NextResponse.json({
      active: true,
      doConfigured: true,
      triggerName: settings.do_trigger_name,
      namespaceId: settings.do_namespace_id,
    });
  } catch (error) {
    console.error('Automation resume error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume automation' },
      { status: 500 }
    );
  }
}
