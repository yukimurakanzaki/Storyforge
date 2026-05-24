# Bugfix Requirements Document

## Introduction

The StoryForge.id codebase has a critical compliance bug: the ZDR (Zero Data Retention) header `anthropic-beta: zdr-2025-01-01` is missing from all three Anthropic API client instantiations (`/api/analyze`, `/api/refine`, `/api/requirements`). This violates the product's own PRD (v1.5), CLAUDE.md, and compliance documentation which claim ZDR is configured. Without this header, Anthropic may retain user input data per their standard policy, creating a false UU PDP (Indonesia's data protection law) compliance claim — a blocker for William's onboarding and soft launch.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any API route (`/api/analyze`, `/api/refine`, `/api/requirements`) makes a request to the Anthropic API THEN the system sends the request without the `anthropic-beta: zdr-2025-01-01` header, allowing Anthropic to retain user input data per their standard retention policy

1.2 WHEN a new API route is added that needs Anthropic access THEN the system has no shared client module to enforce the ZDR header, requiring each developer to manually remember to add it

1.3 WHEN the PRD, CLAUDE.md, and compliance pages claim ZDR is active THEN the system does not actually enforce ZDR on any Anthropic API call, creating a false compliance claim

### Expected Behavior (Correct)

2.1 WHEN any API route (`/api/analyze`, `/api/refine`, `/api/requirements`) makes a request to the Anthropic API THEN the system SHALL include the `anthropic-beta: zdr-2025-01-01` header in every request via a shared client configured with `defaultHeaders`

2.2 WHEN a new API route is added that needs Anthropic access THEN the system SHALL provide a single shared client module (`lib/anthropic.ts`) that includes the ZDR header by default, preventing accidental omission

2.3 WHEN the compliance documentation claims ZDR is active THEN the system SHALL actually enforce ZDR on all Anthropic API calls, making the compliance claim truthful and verifiable

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `/api/analyze` route receives a valid BRD text THEN the system SHALL CONTINUE TO return a structured JSON analysis with gapList, clarificationQuestions, readinessScore, and readinessLabel

3.2 WHEN the `/api/refine` route receives valid conversation messages THEN the system SHALL CONTINUE TO return a refined analysis with message, readyToFinalize, and updated analysis object

3.3 WHEN the `/api/requirements` route receives valid BRD text and analysis THEN the system SHALL CONTINUE TO return structured user stories in the expected JSON format

3.4 WHEN any API route receives an unauthenticated request without guest-mode header THEN the system SHALL CONTINUE TO return a 401 Unauthorized response

3.5 WHEN a guest-mode request exceeds the rate limit THEN the system SHALL CONTINUE TO return a 429 Rate Limit Exceeded response

3.6 WHEN the Anthropic API key is configured via `ANTHROPIC_API_KEY` environment variable THEN the system SHALL CONTINUE TO authenticate successfully with the Anthropic API

---

## Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AnthropicAPICall
  OUTPUT: boolean
  
  // Returns true when any Anthropic API call is made without the ZDR header
  RETURN X.headers does NOT contain 'anthropic-beta: zdr-2025-01-01'
END FUNCTION
```

### Property: Fix Checking — ZDR Header Enforcement

```pascal
// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result ← createAnthropicClient'()
  ASSERT result.defaultHeaders contains 'anthropic-beta' = 'zdr-2025-01-01'
  ASSERT every API call via result includes the ZDR header
END FOR
```

### Property: Preservation Checking — Functional Behavior Unchanged

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  // Once the header is added, all other behavior remains identical
  ASSERT F(X).responseBody = F'(X).responseBody
  ASSERT F(X).statusCode = F'(X).statusCode
END FOR
```
