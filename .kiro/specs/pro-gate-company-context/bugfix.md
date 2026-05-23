# Bugfix Requirements Document

## Introduction

Company Context (project context) is the primary Pro-tier differentiator in StoryForge.id's freemium model, yet it is currently accessible to all authenticated users regardless of subscription plan. The bug has two dimensions: (1) the gate check is entirely absent — any authenticated user can select a project and have its context influence the analysis, and (2) the context is injected in the wrong location — it is concatenated into the BRD user text on the client side rather than being injected into the system prompt on the server side. This means free users receive a Pro feature for free, and even Pro users receive degraded context quality because user-message injection is less effective than system-prompt injection.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated free-tier user selects a project and submits a BRD for analysis THEN the system injects the full project context JSON into the analysis without checking the user's subscription plan

1.2 WHEN any authenticated user (free or Pro) submits a BRD with a selected project THEN the system appends the project context to the `text` field as a string on the client side and sends it as part of the user message, not as a system-prompt injection

1.3 WHEN the `/api/analyze` route receives a request THEN the system does not accept or process a `projectId` field — it only reads the `text` field, so there is no server-side ownership of context injection

1.4 WHEN the `/api/analyze` route processes a request for an authenticated user THEN the system does not query `subscriptions.plan` to determine whether project context should be applied

1.5 WHEN a free-tier user navigates to the project selection screen THEN the system displays all projects and allows selection without any paywall CTA or upgrade prompt

### Expected Behavior (Correct)

2.1 WHEN an authenticated free-tier user selects a project and submits a BRD for analysis THEN the system SHALL ignore the project context entirely and proceed with the analysis as if no project was selected

2.2 WHEN an authenticated Pro-tier user submits a BRD with a `projectId` THEN the system SHALL fetch the project from the `projects` table server-side and inject the context into the system prompt (appended to `SYSTEM_PROMPT`), not into the user message

2.3 WHEN the `/api/analyze` route receives a request THEN the system SHALL accept an optional `projectId: string | null` field in the request body and use it — not a pre-serialized context string — as the basis for context injection

2.4 WHEN the `/api/analyze` route processes a request for an authenticated user with a non-null `projectId` THEN the system SHALL query `subscriptions.plan` and only inject project context if `plan === 'pro'`

2.5 WHEN a free-tier user selects a project on the project selection screen THEN the system SHALL display a paywall CTA prompting the user to upgrade to Pro before proceeding to the BRD input phase

2.6 WHEN the request is in guest mode THEN the system SHALL ignore any `projectId` field entirely and proceed without context

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Pro-tier user submits a BRD without selecting a project (`projectId` is null) THEN the system SHALL CONTINUE TO analyze the BRD using only the base `SYSTEM_PROMPT` without any project context appended

3.2 WHEN a guest user submits a BRD for analysis THEN the system SHALL CONTINUE TO apply the existing guest rate-limit check and process the analysis without any project context

3.3 WHEN an authenticated user (free or Pro) submits a BRD without selecting a project THEN the system SHALL CONTINUE TO analyze the BRD normally with no change in behavior

3.4 WHEN the `/api/analyze` route validates the request body THEN the system SHALL CONTINUE TO reject requests with missing or oversized `text` fields using the existing `validateAnalyzePayload` logic

3.5 WHEN an authenticated user's usage limit is reached THEN the system SHALL CONTINUE TO return a 429 response regardless of whether a `projectId` was provided

3.6 WHEN a Pro-tier user submits a BRD with a `projectId` that does not belong to them THEN the system SHALL CONTINUE TO enforce RLS — the server-side Supabase query using the authenticated user's session will return no row, and the analysis SHALL proceed without context (no error exposed to the client)

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies requests that trigger the leak:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AnalyzeRequest { user, plan, selectedProject }
  OUTPUT: boolean

  // Bug fires when a free user has a project selected — context leaks
  RETURN X.selectedProject IS NOT NULL AND X.plan = 'free'
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← analyzeWithFix'(X)
  ASSERT result.systemPrompt DOES NOT CONTAIN X.selectedProject.context
  ASSERT result.userMessage DOES NOT CONTAIN X.selectedProject.context
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT analyzeWithFix'(X) = analyzeOriginal(X)
END FOR
```
