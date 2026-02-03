const DO_API_BASE = 'https://api.digitalocean.com/v2';

interface DoNamespace {
  namespace: string;
  api_host: string;
  key: string;
  uuid: string;
  label: string;
  region: string;
}

interface DoNamespaceResponse {
  namespace: DoNamespace;
}

interface DoNamespaceListResponse {
  namespaces: DoNamespace[];
}

interface DoTrigger {
  name: string;
  function: string;
  type: string;
  is_enabled: boolean;
  scheduled_details?: {
    cron: string;
    body: Record<string, string>;
  };
}

interface DoTriggerResponse {
  trigger: DoTrigger;
}

export async function createNamespace(doToken: string, label: string, region: string = 'ams3'): Promise<DoNamespace> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      label,
      region,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create namespace (${res.status})`);
  }

  const data: DoNamespaceResponse = await res.json();
  return data.namespace;
}

export async function listNamespaces(doToken: string): Promise<DoNamespace[]> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces`, {
    headers: {
      'Authorization': `Bearer ${doToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list namespaces (${res.status})`);
  }

  const data: DoNamespaceListResponse = await res.json();
  return data.namespaces || [];
}

export async function deleteNamespace(doToken: string, namespaceId: string): Promise<void> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces/${namespaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${doToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete namespace (${res.status})`);
  }
}

export async function deployFunction(
  apiHost: string,
  namespaceKey: string,
  packageName: string,
  functionName: string,
  code: string
): Promise<void> {
  // Use the OpenWhisk API exposed by DO Functions
  const [username, password] = namespaceKey.split(':');
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(`${apiHost}/api/v1/namespaces/_/actions/${packageName}/${functionName}?overwrite=true`, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      namespace: '_',
      name: `${packageName}/${functionName}`,
      exec: {
        kind: 'nodejs:18',
        code,
      },
      annotations: [
        { key: 'web-export', value: true },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to deploy function (${res.status}): ${error}`);
  }
}

export async function deleteFunction(
  apiHost: string,
  namespaceKey: string,
  packageName: string,
  functionName: string
): Promise<void> {
  const [username, password] = namespaceKey.split(':');
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(`${apiHost}/api/v1/namespaces/_/actions/${packageName}/${functionName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete function (${res.status})`);
  }
}

export async function createTrigger(
  doToken: string,
  namespaceId: string,
  triggerName: string,
  functionPath: string,
  cron: string,
  body: Record<string, string>
): Promise<DoTrigger> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces/${namespaceId}/triggers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${doToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: triggerName,
      function: functionPath,
      type: 'SCHEDULED',
      is_enabled: true,
      scheduled_details: {
        cron,
        body,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create trigger (${res.status})`);
  }

  const data: DoTriggerResponse = await res.json();
  return data.trigger;
}

export async function updateTrigger(
  doToken: string,
  namespaceId: string,
  triggerName: string,
  isEnabled: boolean
): Promise<DoTrigger> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces/${namespaceId}/triggers/${triggerName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${doToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      is_enabled: isEnabled,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Failed to update trigger (${res.status})`);
  }

  const data: DoTriggerResponse = await res.json();
  return data.trigger;
}

export async function deleteTrigger(
  doToken: string,
  namespaceId: string,
  triggerName: string
): Promise<void> {
  const res = await fetch(`${DO_API_BASE}/functions/namespaces/${namespaceId}/triggers/${triggerName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${doToken}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete trigger (${res.status})`);
  }
}

export function generateFunctionCode(appUrl: string, apiKey: string): string {
  return `
function main(args) {
  return fetch("${appUrl}/api/cron/apply", {
    method: "POST",
    headers: {
      "Authorization": "Bearer ${apiKey}",
      "Content-Type": "application/json"
    }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) { return { body: data }; })
  .catch(function(err) { return { body: { error: err.message } }; });
}
`.trim();
}
