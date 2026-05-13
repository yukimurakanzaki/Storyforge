# Bugfix Requirements Document

## Introduction

Guest users (not logged in) visiting the `/analyze` page are shown the project creation UI (`ProjectSelector` component) which includes a "Pilih Project" heading, a "+ Project baru" button, and a project list. This UI should only be available to registered (authenticated) users. While the server-side API correctly rejects unauthenticated requests with 401, the client-side UI still renders the project selection/creation interface for guests, creating a confusing experience where guests interact with UI that will inevitably fail.

Guest users should instead skip the project selection phase entirely and go directly to the BRD input phase, since projects are a registered-user feature.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a guest user (not authenticated) visits the /analyze page THEN the system displays the ProjectSelector component with "Pilih Project" heading and "+ Project baru" button

1.2 WHEN a guest user clicks "+ Project baru" and submits a project name THEN the system attempts to call the /api/projects endpoint which returns a 401 error, showing "Gagal membuat project. Coba lagi."

1.3 WHEN a guest user lands on the /analyze page THEN the system calls fetchProjects() which fails with 401, showing "Gagal memuat project. Muat ulang halaman." error message

1.4 WHEN a guest user starts a new session (handleNewSession) THEN the system resets the phase to 'select-project', showing the project creation UI again instead of the BRD input

### Expected Behavior (Correct)

2.1 WHEN a guest user (not authenticated) visits the /analyze page THEN the system SHALL skip the project selection phase and display the BRD input form directly

2.2 WHEN a guest user attempts to create a project THEN the system SHALL NOT render the project creation UI at all, preventing the interaction entirely

2.3 WHEN a guest user lands on the /analyze page THEN the system SHALL NOT call fetchProjects() since the ProjectSelector component is not rendered for guests

2.4 WHEN a guest user starts a new session (handleNewSession) THEN the system SHALL reset to the BRD input phase directly, bypassing the project selection phase

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated user visits the /analyze page THEN the system SHALL CONTINUE TO display the ProjectSelector component with project list and creation options

3.2 WHEN an authenticated Pro user selects a project THEN the system SHALL CONTINUE TO transition to the BRD input phase with the selected project context

3.3 WHEN an authenticated Free user selects a project THEN the system SHALL CONTINUE TO show the paywall CTA for Company Context upgrade

3.4 WHEN a guest user submits a BRD for analysis THEN the system SHALL CONTINUE TO process the analysis with guest rate limiting (5 analyses limit)

3.5 WHEN a guest user completes an analysis THEN the system SHALL CONTINUE TO show the account creation prompt to encourage registration
