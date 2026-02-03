import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { decryptToken } from '@/lib/easee';
import getDb from '@/lib/db';
import { deleteTrigger, deleteFunction, deleteNamespace } from '@/lib/digitalocean';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT encrypted_do_token, do_namespace_id, do_api_host, encrypted_do_key,
             do_function_name, do_trigger_name
      FROM automation_settings
      WHERE user_id = ${session.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ active: false, doConfigured: false });
    }

    const settings = rows[0];

    if (settings.encrypted_do_token && settings.do_namespace_id) {
      const doToken = decryptToken(settings.encrypted_do_token);

      // Delete trigger
      if (settings.do_trigger_name) {
        try {
          await deleteTrigger(doToken, settings.do_namespace_id, settings.do_trigger_name);
        } catch (e) {
          console.error('Failed to delete trigger:', e);
        }
      }

      // Delete function
      if (settings.do_function_name && settings.encrypted_do_key && settings.do_api_host) {
        try {
          const doKey = decryptToken(settings.encrypted_do_key);
          const [pkg, fn] = settings.do_function_name.split('/');
          await deleteFunction(settings.do_api_host, doKey, pkg, fn);
        } catch (e) {
          console.error('Failed to delete function:', e);
        }
      }

      // Delete namespace
      try {
        await deleteNamespace(doToken, settings.do_namespace_id);
      } catch (e) {
        console.error('Failed to delete namespace:', e);
      }
    }

    // Remove from DB
    await sql`
      DELETE FROM automation_settings
      WHERE user_id = ${session.userId}
    `;

    return NextResponse.json({
      active: false,
      doConfigured: false,
    });
  } catch (error) {
    console.error('Automation delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete automation' },
      { status: 500 }
    );
  }
}
