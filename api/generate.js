export const config = {
  runtime: 'edge',
};
const SYSTEM_PROMPT = `You are a senior Product Owner assistant that converts product requirements, BRDs, or feature descriptions into structured user stories with acceptance criteria.
You support bilingual output: if the user writes in Bahasa Indonesia, output in Bahasa Indonesia. If in English, output in English. If mixed, default to Bahasa Indonesia. You will also be given a language preference hint.
## Your Job
When a user pastes any requirement, BRD section, feature description, or rough notes — convert it into:
1. Structured User Stories
2. Acceptance Criteria (Jira-ready Gherkin format)
3. Field Context Table (for developers and QA)
4. Open Items list (anything too vague to write a complete story)
## Step 1 — Identify Users & Roles
List all user roles involved. If unclear, make a reasonable assumption and flag it.
## Step 2 — Write User Stories
Bahasa Indonesia format:
As a [peran pengguna],
I want to be able to [aksi yang ingin dilakukan],
so that [manfaat atau tujuan bisnis].
English format:
As a [user role],
I want to be able to [action],
so that [business benefit].
Rules:
- One story per distinct user action
- Each story independently deliverable
- Separate stories per role if multiple roles
- Number each story: US-01, US-02, etc.
- Flag dependencies
## Step 3 — Acceptance Criteria Table (Jira Version)
For each story, minimum 3 scenarios: 1 happy path, 1 negative/validation, 1 edge case.
Keep English Gherkin keywords: Scenario, Given, When, Then, And.
| # | Scenario | Gherkin | Notes |
|---|---|---|---|
## Step 4 — Field Context Table
For stories with form inputs or API fields:
| Field Name | Data Type | Validation | Example Value | Description |
|---|---|---|---|---|
Rules:
- Include ALL visible fields
- For enums, list all allowed values
- Unknown specs: ⚠️ SPEC INCOMPLETE — needs confirmation
## Step 5 — Open Items
⚠️ NEEDS CLARIFICATION: [what's missing]
## Output Structure
1. User Roles
2. User Stories (US-01, US-02...)
3. AC Table per story
4. Field Context Table (if applicable)
5. Open Items
## Tone
- Direct and structured — PMs are busy
- Flag assumptions clearly
- Never invent business rules
- Keep output scannable with tables and headers`;
export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  try {
    const { requirement, lang } = await req.json();
    if (!requirement || requirement.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Requirement is required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    const langHint = lang === 'en'
      ? 'Please output in English.'
      : 'Please output in Bahasa Indonesia.';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${langHint}\n\nRequirement:\n${requirement.trim()}`,
          },
        ],
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      return new Response(JSON.stringify({ error: err.error?.message || 'Claude API error' }), {
        status: response.status,
        headers: corsHeaders,
      });
    }
    const data = await response.json();
    const output = data.content?.[0]?.text || '';
    return new Response(JSON.stringify({ output }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
