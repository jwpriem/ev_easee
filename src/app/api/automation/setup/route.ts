import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/session';
import { encryptToken } from '@/lib/easee';
import getDb from '@/lib/db';
import {
  createNamespace,
  deployFunction,
  createTrigger,
  generateFunctionCode,
} from '@/lib/digitalocean';

const PACKAGE_NAME = 'ev-easee';
const FUNCTION_NAME = 'apply-schema';
const TRIGGER_NAME = 'every-15-min';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doApiToken = process.env.DO_API_TOKEN;
    const appUrl = process.env.APP_URL;
    if (!doApiToken || !appUrl) {
      return NextResponse.json(
        { error: 'DO_API_TOKEN and APP_URL environment variables are required.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Generate a cron API key
    const cronApiKey = crypto.randomBytes(32).toString('hex');

    // Step 1: Create DO Functions namespace
    const namespace = await createNamespace(
      doApiToken,
      `ev-easee-user-${session.userId}`,
      'ams3'
    );

    // Step 2: Deploy the function via OpenWhisk API
    const functionCode = generateFunctionCode(appUrl, cronApiKey);
    await deployFunction(
      namespace.api_host,
      namespace.key,
      PACKAGE_NAME,
      FUNCTION_NAME,
      functionCode
    );

    // Step 3: Create a scheduled trigger (every 15 minutes)
    await createTrigger(
      doApiToken,
      namespace.uuid,
      TRIGGER_NAME,
      `${PACKAGE_NAME}/${FUNCTION_NAME}`,
      '*/15 * * * *',
      {}
    );

    // Store settings in DB
    const encryptedDoKey = encryptToken(namespace.key);

    await sql`
      INSERT INTO automation_settings (
        user_id, cron_api_key,
        do_namespace_id, do_api_host, encrypted_do_key,
        do_function_name, do_trigger_name, active
      )
      VALUES (
        ${session.userId}, ${cronApiKey},
        ${namespace.uuid}, ${namespace.api_host}, ${encryptedDoKey},
        ${`${PACKAGE_NAME}/${FUNCTION_NAME}`}, ${TRIGGER_NAME}, true
      )
      ON CONFLICT (user_id) DO UPDATE SET
        cron_api_key = EXCLUDED.cron_api_key,
        do_namespace_id = EXCLUDED.do_namespace_id,
        do_api_host = EXCLUDED.do_api_host,
        encrypted_do_key = EXCLUDED.encrypted_do_key,
        do_function_name = EXCLUDED.do_function_name,
        do_trigger_name = EXCLUDED.do_trigger_name,
        active = true,
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      active: true,
      doConfigured: true,
      triggerName: TRIGGER_NAME,
      namespaceId: namespace.uuid,
    });
  } catch (error) {
    console.error('Automation setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up automation' },
      { status: 500 }
    );
  }
}
