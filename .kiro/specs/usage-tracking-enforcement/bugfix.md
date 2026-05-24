# Bugfix Requirements Document

## Introduction

The `/api/analyze` route in StoryForge.id does not enforce usage limits or track analysis events for authenticated users. The `lib/usage.ts` module exports fully-implemented functions (`checkUsage`, `incrementUsage`, `logAnalysisEvent`) but none are imported or called anywhere in the codebase. This results in free-tier users having unlimited analyses (PRD specifies 3/month), the North Star Metric (WAA) being untrackable since `analysis_events` is never written to, and Pro tier having no differentiation from Free. Additionally, `FREE_TIER_LIMIT` in `lib/constants.ts` is set to 5 instead of the PRD-specified 3.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated free-tier user calls `/api/analyze` THEN the system allows unlimited analyses without checking the usage counter

1.2 WHEN an authenticated user successfully completes an analysis THEN the system does not increment the `usage_counters` table

1.3 WHEN an authenticated user starts or completes an analysis THEN the system does not write any record to the `analysis_events` table

1.4 WHEN `FREE_TIER_LIMIT` is referenced for usage enforcement THEN the system uses the value 5 instead of the PRD-specified value of 3

1.5 WHEN a free-tier user has exhausted their rolling 30-day analysis quota THEN the system still allows the analysis to proceed (no 429 response)

### Expected Behavior (Correct)

2.1 WHEN an authenticated free-tier user calls `/api/analyze` THEN the system SHALL call `checkUsage()` before invoking the Anthropic API and block the request with a 429 status if the rolling 30-day limit is reached

2.2 WHEN an authenticated user successfully completes an analysis THEN the system SHALL call `incrementUsage()` to update the `usage_counters` table

2.3 WHEN an authenticated user starts an analysis THEN the system SHALL call `logAnalysisEvent()` with event type `analysis_started`, and upon completion SHALL call `logAnalysisEvent()` with event type `analysis_completed` including `word_count` and `duration_ms`

2.4 WHEN `FREE_TIER_LIMIT` is referenced THEN the system SHALL use the value 3 as specified in the PRD

2.5 WHEN a free-tier user has reached their rolling 30-day limit THEN the system SHALL return a 429 response with an `X-Limit-Reached: true` header and usage information (current count, limit, plan)

2.6 WHEN a `usage_counters` row does not exist for an authenticated user THEN the system SHALL create (upsert) the row on first usage increment, setting `first_analysis_at` to now and `reset_at` to 30 days from now

2.7 WHEN the rolling 30-day window has elapsed (current time > `reset_at`) THEN the system SHALL reset the usage counter to 0 and set a new `reset_at` 30 days from the reset point before evaluating the limit

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a guest user (unauthenticated, `x-guest-mode: 1` header) calls `/api/analyze` THEN the system SHALL CONTINUE TO use the in-memory rate limiter without any Supabase usage tracking

3.2 WHEN an authenticated Pro-tier user calls `/api/analyze` within their 50/month limit THEN the system SHALL CONTINUE TO allow the analysis to proceed successfully

3.3 WHEN any user submits an invalid or oversized payload to `/api/analyze` THEN the system SHALL CONTINUE TO return the appropriate 400/413 validation error before any usage check

3.4 WHEN an unauthenticated non-guest request is made to `/api/analyze` THEN the system SHALL CONTINUE TO return a 401 Unauthorized response

3.5 WHEN the Anthropic API call fails THEN the system SHALL CONTINUE TO return a 500 error and SHALL NOT increment the usage counter (only successful analyses count)
