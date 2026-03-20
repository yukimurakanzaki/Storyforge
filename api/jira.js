export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { jiraUrl, email, apiToken, projectKey, stories } = await req.json();

    if (!jiraUrl || !email || !apiToken || !projectKey || !stories?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: cors });
    }

    const baseUrl = jiraUrl.replace(/\/$/, '');
    const auth = btoa(`${email}:${apiToken}`);

    const created = [];
    const failed = [];

    for (const story of stories) {
      const payload = {
        fields: {
          project: { key: projectKey.toUpperCase() },
          summary: story.title,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: story.description }]
              }
            ]
          },
          issuetype: { name: 'Story' },
        }
      };

      const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        created.push({ key: data.key, title: story.title, url: `${baseUrl}/browse/${data.key}` });
      } else {
        const err = await res.json();
        failed.push({ title: story.title, error: err.errors || err.errorMessages || 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({ created, failed }), { status: 200, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
