# Requirements Document

## Introduction

This document specifies the core UX changes for StoryForge v2.0 Sprint 1. The scope covers five areas: removing guest mode entirely, implementing a tiered AI model selector, fixing the analyze page UX for Free vs Pro users, adding watermarks on free-tier output, and displaying a usage counter in the page header. These changes align with the PRD v2.0 pivot from "BRD Gap Analysis Tool" to "The BRD Quality Gate" and support the North Star metric (Weekly Active Analyzers).

## Glossary

- **System**: The StoryForge web application (frontend + backend)
- **Middleware**: The Next.js middleware layer (`lib/supabase/middleware.ts`) responsible for route protection and session management
- **Model_Selector**: The server-side module that determines which AI model to use based on the authenticated user's subscription plan
- **Analyze_Page**: The `/analyze` route where users input BRDs and receive analysis results
- **Usage_Counter_Component**: The UI component in the analyze page header that displays remaining analyses
- **Watermark_Renderer**: The component responsible for appending watermark text to free-tier analysis output
- **Auth_Pages**: The `/login` and `/signup` pages
- **Free_Tier**: Users with no active subscription (limit: 3 analyses/month, AI model: Gemini 2.0 Flash)
- **Pro_Tier**: Users with an active Pro subscription (limit: 50 analyses/month, AI model: Claude Haiku 4.5)
- **Upgrade_CTA**: A call-to-action UI element prompting the user to upgrade their subscription plan
- **Guest_Mode**: The deprecated unauthenticated access path using localStorage tracking and IP-based rate limiting

## Requirements

### Requirement 1: Remove Guest Mode — Route Protection

**User Story:** As a product owner, I want all unauthenticated users redirected to the login page when accessing `/analyze`, so that every analysis is tied to a registered account for WAA tracking.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/analyze`, THE Middleware SHALL redirect the user to `/login` with a `redirect=/analyze` query parameter
2. WHEN an unauthenticated user navigates to any path starting with `/analyze`, THE Middleware SHALL redirect the user to `/login`
3. THE Middleware SHALL treat `/analyze` as a protected path in addition to paths starting with `/analyze/`

### Requirement 2: Remove Guest Mode — Auth Page Cleanup

**User Story:** As a user, I want the login and signup pages to only show authenticated access options, so that I am not confused by deprecated guest access links.

#### Acceptance Criteria

1. THE Auth_Pages SHALL NOT display a "Lanjutkan sebagai Tamu" link or any guest access option
2. THE Auth_Pages SHALL present Google OAuth and email/password as the only login methods
3. IF both Google OAuth and email/password services are temporarily unavailable, THEN THE Auth_Pages SHALL display an error message indicating login services are currently unavailable

### Requirement 3: Remove Guest Mode — Code Removal

**User Story:** As a developer, I want all guest-mode code removed from the codebase, so that the application has no dead code paths related to unauthenticated usage.

#### Acceptance Criteria

1. THE System SHALL NOT contain the file `lib/guest-usage.ts`
2. THE System SHALL NOT contain the file `lib/guest-rate-limit.ts`
3. THE System SHALL NOT contain the file `lib/session/temp-session.ts`
4. THE System SHALL NOT contain the file `lib/session/use-migrate-temp-session.ts`
5. THE System SHALL NOT contain the directory `app/api/migrate-session/`
6. THE System SHALL NOT contain any import or reference to `canGuestAnalyze`, `incrementGuestUsage`, `readGuestUsage`, `checkGuestRateLimit`, or `useMigrateTempSession`
7. THE System SHALL NOT send or read an `x-guest-mode` HTTP header in any API route

### Requirement 4: Remove Guest Mode — API Route Protection

**User Story:** As a product owner, I want the analyze, refine, and requirements API routes to reject unauthenticated requests, so that all AI usage is attributed to registered users.

#### Acceptance Criteria

1. WHEN an unauthenticated request is received, THE `/api/analyze` route SHALL return HTTP 401 with a JSON error message
2. WHEN an unauthenticated request is received, THE `/api/refine` route SHALL return HTTP 401 with a JSON error message
3. WHEN an unauthenticated request is received, THE `/api/requirements` route SHALL return HTTP 401 with a JSON error message
4. THE API routes SHALL NOT contain any guest-mode fallback logic or IP-based rate limiting for unauthenticated users
5. THE System SHALL NOT contain any guest-mode code, including unused or commented-out guest-mode logic, in any API route or middleware file

### Requirement 5: Tiered AI Model Selector

**User Story:** As a product owner, I want the AI model used for analysis to match the user's subscription tier, so that free-tier costs are near-zero while Pro users get higher-quality output.

#### Acceptance Criteria

1. THE Model_Selector SHALL return the Google Gemini 2.0 Flash model identifier when the authenticated user's plan is `free`
2. THE Model_Selector SHALL return the Anthropic Claude Haiku 4.5 model identifier when the authenticated user's plan is `pro`
3. WHEN the Model_Selector returns an Anthropic model, THE Model_Selector SHALL include the `anthropic-beta: zdr-2025-01-01` header in the client configuration
4. THE `/api/analyze` route SHALL use the Model_Selector to determine the AI model for each request
5. THE `/api/refine` route SHALL use the Model_Selector to determine the AI model for each request
6. THE `/api/requirements` route SHALL use the Model_Selector to determine the AI model for each request
7. THE Model_Selector SHALL accept the user's plan as a parameter and SHALL NOT query the database directly

### Requirement 6: Analyze Page UX — Free User Flow

**User Story:** As a free-tier user, I want to land directly on the BRD input form without project selection, so that I can start analyzing immediately.

#### Acceptance Criteria

1. WHEN a free-tier user loads the Analyze_Page, THE Analyze_Page SHALL display the BRD input form immediately without showing a project selector
2. WHEN a free-tier user loads the Analyze_Page, THE Analyze_Page SHALL NOT display Company Context options
3. WHEN a free-tier user loads the Analyze_Page, THE System SHALL guarantee the BRD input form is visible on initial page render

### Requirement 7: Analyze Page UX — Pro User Flow

**User Story:** As a Pro user, I want to see a project selector with Company Context before inputting my BRD, so that the analysis is contextualized to my project.

#### Acceptance Criteria

1. WHEN a pro-tier user loads the Analyze_Page, THE Analyze_Page SHALL display the project selector before the BRD input form
2. WHEN a pro-tier user selects a project, THE Analyze_Page SHALL load and display the associated Company Context
3. IF the Company Context fails to load due to network error or missing data, THEN THE Analyze_Page SHALL display an error state and SHALL NOT proceed to the BRD input form until context is successfully loaded or the user retries

### Requirement 8: Tier Badge in Header

**User Story:** As a user, I want to see my current subscription tier displayed in the header, so that I always know which plan I am on.

#### Acceptance Criteria

1. WHILE a user is authenticated, THE System SHALL display the user's tier badge ("Free" or "Pro") in the application header consistently across all pages
2. THE tier badge SHALL be visually distinct from surrounding text using a colored background or border

### Requirement 9: Usage Limit Handling for Free Users

**User Story:** As a free-tier user who has reached my monthly limit, I want to see an upgrade prompt instead of a blocking wall, so that I understand the value of upgrading without feeling locked out.

#### Acceptance Criteria

1. WHEN a free-tier user has used all 3 monthly analyses, THE Analyze_Page SHALL display an Upgrade_CTA with a message explaining the limit has been reached
2. WHEN a free-tier user has used between 4 and 6 total analyses (inclusive), THE Analyze_Page SHALL NOT display a full-screen blocking wall but SHALL show a prominent Upgrade_CTA
3. WHEN a free-tier user has used more than 6 total analyses, THE Analyze_Page SHALL display a blocking wall preventing further analysis until the user upgrades
4. THE Upgrade_CTA SHALL include a link or button to the upgrade/pricing page

### Requirement 10: Usage Counter Display

**User Story:** As a user, I want to see how many analyses I have remaining this month, so that I can plan my usage accordingly.

#### Acceptance Criteria

1. WHILE a user is on the Analyze_Page, THE Usage_Counter_Component SHALL display the text "{used}/{limit} analisis" where `{used}` is the number of analyses consumed and `{limit}` is the tier's monthly cap
2. WHILE the user has more than 50% of analyses remaining, THE Usage_Counter_Component SHALL display the counter text in green
3. WHILE the user has between 25% and 50% of analyses remaining (inclusive), THE Usage_Counter_Component SHALL display the counter text in yellow
4. WHILE the user has less than 25% of analyses remaining, THE Usage_Counter_Component SHALL display the counter text in red
5. IF the user's analysis limit is zero, THEN THE Usage_Counter_Component SHALL hide the counter or display a distinct visual state instead of calculating a percentage
6. WHEN a free-tier user clicks the Usage_Counter_Component, THE System SHALL display an Upgrade_CTA

### Requirement 11: Watermark on Free-Tier Output

**User Story:** As a product owner, I want free-tier analysis output to include a branded watermark, so that users are reminded of the upgrade path and the brand gets exposure on shared outputs.

#### Acceptance Criteria

1. WHEN analysis results are displayed for a free-tier user, THE Watermark_Renderer SHALL append the text "Generated by StoryForge.id — Upgrade ke Pro untuk menghapus watermark" at the bottom of the gap list section
2. WHEN analysis results are displayed for a free-tier user, THE Watermark_Renderer SHALL append the watermark text at the bottom of the clarification questions section
3. WHEN analysis results are displayed for a free-tier user, THE Watermark_Renderer SHALL append the watermark text at the bottom of the PRD output section
4. THE Watermark_Renderer SHALL display watermarks on all output sections simultaneously — partial watermarking (some sections with, some without) SHALL NOT occur for free-tier users
5. WHEN analysis results are displayed for a pro-tier user, THE Watermark_Renderer SHALL NOT display any watermark text
6. THE watermark text SHALL be visually distinguishable from analysis content using reduced opacity or a lighter color

### Requirement 12: Usage Counter Data Fetching

**User Story:** As a developer, I want the usage counter to fetch data from the server on page load, so that the displayed count is always accurate and tamper-proof.

#### Acceptance Criteria

1. WHEN the Analyze_Page loads and the user session is authenticated, THE System SHALL fetch the current usage count and plan from the server using the authenticated session
2. IF the user session is not authenticated when the Analyze_Page loads, THEN THE System SHALL skip the usage data fetch entirely and display the fallback state directly
3. IF the usage data fetch fails, THEN THE Usage_Counter_Component SHALL display a fallback state without blocking the user from inputting a BRD
4. THE System SHALL NOT use localStorage or client-side state to determine usage counts
