export const config = { runtime: 'edge' };

const GAP_SYSTEM = `You are a senior Product Owner assistant specialized in requirement analysis.
When given a requirement, BRD section, or feature notes, your job is to identify gaps — missing information that a developer or designer would need to build this feature correctly.
Output ONLY a JSON object in this exact format (no markdown, no explanation, just JSON):
{
  "gaps": [
    {
      "id": "G1",
      "question": "Question in the same language as the requirement",
      "category": "Business Rule | UX Flow | Edge Case | Role & Permission | Data Spec | Integration",
      "priority": "High | Medium | Low"
    }
  ],
  "summary": "One sentence summary of what this requirement is about"
}
Rules:
- Maximum 8 gaps. Focus on the most critical ones.
- High priority = without this info, dev cannot start
- Medium priority = needed before sprint ends
- Low priority = nice to have clarity
- Write questions in the same language as the requirement (Bahasa Indonesia or English)
- Be specific — not "what happens on error?" but "Apakah ada pesan error spesifik yang ditampilkan ketika user salah input password?"`;

const STORY_SYSTEM = `You are a senior Product Owner assistant that converts finalized requirements into structured user stories.
You will receive: the original requirement AND all gap answers that have been confirmed.
Output ONLY a JSON object in this exact format (no markdown, no preamble, just JSON):
{
  "stories": [
    {
      "id": "US-01",
      "title": "Short title for Jira summary field",
      "userStory": "As a [role], I want to be able to [action], so that [benefit].",
      "description": "Full user story text + AC table in plain text format ready for Jira description field. Include: Acceptance Criteria with Gherkin scenarios (Given/When/Then) and Field Context Table if applicable.",
      "acTable": [
        {
          "scenario": "Scenario name",
          "gherkin": "Given ... When ... Then ...",
          "notes": "UX or business rule note"
        }
      ],
      "fields": [
        {
          "name": "field_name",
          "type": "String | Integer | Date | Boolean | Enum | Decimal",
          "validation": "validation rules",
          "example": "example value",
          "description": "what this field does"
        }
      ]
    }
  ]
}
Rules:
- Write in the same language as the requirement (Bahasa Indonesia or English)
- Keep English Gherkin keywords: Given, When, Then, And
- Minimum 3 AC scenarios per story: 1 happy path, 1 negative, 1 edge case
- description field must be plain text (no markdown) suitable for Jira API
- title field must be concise (max 100 chars) for Jira summary`;

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
    const { mode, requirement, gapAnswers } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: cors });
    }

    if (!requirement?.trim()) {
      return new Response(JSON.stringify({ error: 'Requirement is required' }), { status: 400, headers: cors });
    }

    let systemPrompt, userMessage;

    if (mode === 'gap') {
      systemPrompt = GAP_SYSTEM;
      userMessage = `Analyze this requirement and identify gaps:\n\n${requirement}`;
    } else if (mode === 'stories') {
      systemPrompt = STORY_SYSTEM;
      const gapContext = gapAnswers?.length
        ? `\n\nGap Analysis Answers (all confirmed by user):\n${gapAnswers.map(g => `${g.id} — ${g.question}\nAnswer: ${g.answer}`).join('\n\n')}`
        : '';
      userMessage = `Generate user stories from this finalized requirement:\n\n${requirement}${gapContext}`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode. Use gap or stories' }), { status: 400, headers: cors });
    }

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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return new Response(JSON.stringify({ error: err.error?.message || 'Claude API error' }), { status: response.status, headers: cors });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse AI response', raw: text }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}
