# Requirements Document

## Introduction

This specification captures the requirements for refining StoryForge's analysis engine based on a validated user pain point: Product Managers cannot identify technical edge cases and journey gaps from BRDs because they lack technical expertise. The core promise is: **"Here are the things your BRD missed that engineering will ask later — and what to do about each one."**

The product must hide all technical machinery from the PM. Output must be aggressively actionable: copy-paste ready for Slack, usable in grooming, and directly insertable into the PRD. The analysis engine does the hard technical thinking; the PM sees simple, prioritized, plain-language results.

This is a product-level refinement — it changes what the analysis engine detects, how it presents findings, what it outputs, and how StoryForge positions itself.

## Glossary

- **Analysis Engine**: The server-side AI pipeline that receives a BRD, detects gaps, and produces structured output.
- **Journey Map**: A visual representation of the customer's end-to-end experience showing happy path, error paths, and missing paths.
- **Gap**: A missing, ambiguous, or incomplete element in the BRD that will cause problems during development.
- **Blindspot**: A technical concern the PM would not have thought to include (e.g., what happens on double-click, session timeout, concurrent edits).
- **Readiness Score**: 0-100 score reflecting how sprint-ready the BRD is, with explainable breakdown.
- **BRD**: Business Requirement Document — the input analyzed by StoryForge.
- **PM**: Product Manager — the primary user.
- **Gap Card**: The standard format for presenting each finding: Yang belum jelas → Kenapa penting → Pertanyaan untuk tim → Usulan requirement.

## Requirements

### Requirement 1: Prioritized Output — Top Risks First

**User Story:** As a PM, I want the analysis to give me a focused, prioritized summary (not 40 items), so that I can act immediately without being overwhelmed.

#### Acceptance Criteria

1. WHEN the analysis completes, the output SHALL present a "Ringkasan Temuan" (Findings Summary) section containing: up to 5 critical gaps, up to 5 questions to ask engineering/stakeholder, and up to 5 requirements to add to the BRD.
2. THE top 5/5/5 items SHALL be selected by severity and impact — the most likely to cause sprint delays or rework.
3. BELOW the summary, the full detailed findings SHALL be available in expandable/collapsible sections for PMs who want to dig deeper.
4. THE summary SHALL be copy-paste ready — formatted so a PM can paste it directly into Slack or a grooming document without reformatting.
5. WHEN the analysis identifies fewer than 5 items in any category, it SHALL show only what was found (no padding with low-priority items).

### Requirement 2: Plain Language — No Technical Jargon in Output

**User Story:** As a PM with limited technical depth, I want all findings explained in plain Bahasa Indonesia using real-world examples, so that I understand every issue without needing engineering background.

#### Acceptance Criteria

1. THE analysis output SHALL avoid technical jargon as the primary explanation. Instead, it SHALL lead with concrete scenario descriptions in plain language. When helpful for learning, technical terms MAY appear as secondary labels in parentheses. Example: "Kalau user klik Submit dua kali, apakah sistem boleh membuat dua transaksi? (duplicate submission)"
2. EACH gap/blindspot SHALL be phrased as a situation the PM can imagine happening to their user — a concrete "what if" scenario, not an abstract technical category.
3. WHEN the engine detects a technical concern, it SHALL translate it into business impact language: what goes wrong for the user, what the stakeholder will ask, or what engineering will flag during grooming.
4. THE output language SHALL be Bahasa Indonesia for all user-facing content (questions, explanations, suggestions). English only for JSON field names and code-level identifiers.

### Requirement 3: Actionable Gap Format — Each Finding Tells You What To Do

**User Story:** As a PM, I want each identified gap to come with a clear next action, so that I can immediately resolve it without needing to figure out what to do.

#### Acceptance Criteria

1. EACH gap/finding SHALL be presented as a "Gap Card" with four fields:
   - **Yang belum jelas**: What is missing or unclear (1-2 sentences, plain language)
   - **Kenapa ini penting**: Why this will cause problems if not addressed (business impact, not technical explanation)
   - **Pertanyaan untuk tim**: A ready-to-send question for engineering or stakeholder (copy-paste to Slack/email)
   - **Usulan requirement**: A suggested requirement sentence that the PM can directly paste into their BRD/PRD
2. THE "Pertanyaan untuk tim" field SHALL be phrased as a natural question a PM would ask in a meeting — not a formal requirement statement.
3. THE "Usulan requirement" field SHALL be a complete, self-contained requirement sentence ready for insertion — not a fragment or instruction.
4. IF a gap relates to a specific section of the BRD, the Gap Card SHALL reference which part of the original BRD it relates to (quoting relevant text if possible).

### Requirement 4: Journey-Based Gap Detection

**User Story:** As a PM, I want the analysis to detect missing steps, error paths, and "what happens when things go wrong" in my user flow, so that I can see the complete customer experience before sprint.

#### Acceptance Criteria

1. WHEN the analysis processes a BRD, it SHALL extract all identifiable user journey steps and map the flow from entry to completion.
2. FOR each step in the journey, the analysis SHALL check: what happens on success, what happens on failure, what happens on timeout, and what happens if the user goes back or abandons.
3. IF the BRD describes a flow without specifying what happens on failure at any step, the analysis SHALL flag each missing failure path as a gap (severity: high).
4. WHEN the analysis detects implied concurrent actions (e.g., two users doing the same thing, or user doing action while system is still processing), it SHALL generate "what if" scenarios phrased as plain-language questions.
5. THE journey analysis SHALL detect at minimum these gap types: missing error handling, missing loading/waiting states, missing cancellation paths, missing edge cases at decision points, and missing "back" or "undo" flows.

### Requirement 5: Technical Blindspot Detection (Hidden From User as "Technical")

**User Story:** As a PM, I want the analysis to surface things engineering will definitely ask about during grooming, so that I can address them proactively — without needing to understand the underlying technical concepts.

#### Acceptance Criteria

1. THE analysis SHALL detect and surface blindspots in these areas (presented as user-facing scenarios, NOT technical labels):
   - Double actions: "Apa yang terjadi kalau user klik tombol dua kali?" (duplicate submissions)
   - Slow/failed connections: "Apa yang user lihat kalau internet lambat atau terputus?" (timeout, retry)
   - Session/login edge cases: "Apa yang terjadi kalau user login di dua device?" (concurrent sessions)
   - Data conflicts: "Apa yang terjadi kalau dua orang edit data yang sama?" (race conditions)
   - Limits and overload: "Berapa maksimal data yang bisa diproses? Apa yang terjadi kalau melebihi?" (rate limits, quotas)
   - Permission edge cases: "Apa yang terjadi kalau user yang sudah tidak punya akses mencoba masuk?" (auth revocation)
2. EACH blindspot SHALL be presented using the Gap Card format (Yang belum jelas, Kenapa penting, Pertanyaan untuk tim, Usulan requirement).
3. THE analysis SHALL NOT label these as "technical blindspots" in the UI. They SHALL be integrated naturally into the gap list, indistinguishable in tone from other gaps.
4. THE analysis SHALL only surface blindspots that are relevant to the BRD being analyzed — not a generic checklist applied to every document.

### Requirement 6: Visual Customer Journey Map

**User Story:** As a PM, I want a simple visual map of my product's user journey showing happy path, error paths, and missing paths, so that I can immediately see what's incomplete.

#### Acceptance Criteria

1. WHEN the analysis completes, it SHALL produce a Journey Map showing: all identified steps (as nodes), transitions between steps (as arrows), path type for each transition (happy path, error path, or missing/inferred path).
2. THE Journey Map SHALL use three visual states for each step: "Ada di BRD" (explicitly in document — solid), "Disimpulkan AI" (inferred by analysis — dashed), "Belum ada" (missing — red/highlighted).
3. THE Journey Map SHALL be renderable as a simple flowchart/diagram in the frontend — NOT as raw JSON or a text table. The underlying data structure supports visual rendering.
4. THE Journey Map SHALL be limited to one primary user flow per analysis. If the BRD contains multiple flows, the map shows the primary flow and explicitly states: "Kami mendeteksi [N] alur dalam BRD ini. Yang ditampilkan: [nama alur utama]. Alur lainnya: [list]." — so the PM knows the tool detected them and can analyze them separately.
5. IF the AI cannot construct a coherent journey from the BRD (too vague or fragmented), the analysis SHALL skip the journey map and note: "BRD belum cukup detail untuk membuat peta perjalanan. Coba tambahkan alur langkah-langkah user."

### Requirement 7: Explainable Readiness Score

**User Story:** As a PM, I want to know WHY my score is 62 (not just the number), so that I know exactly what to improve to make the BRD sprint-ready.

#### Acceptance Criteria

1. THE Readiness Score (0-100) SHALL be accompanied by a breakdown showing four component scores:
   - Kelengkapan Alur (Journey Completeness): 30% weight — are all steps and paths covered?
   - Kesiapan untuk Sprint (Sprint Readiness): 25% weight — are technical concerns addressed?
   - Kejelasan Requirement (Requirement Clarity): 25% weight — are requirements specific and testable?
   - Konteks Bisnis (Business Context): 20% weight — are goals, metrics, and constraints clear?
2. EACH component score SHALL include a one-sentence explanation of why it received that score. Example: "Kelengkapan Alur: 45/100 — Ada 3 langkah yang belum punya penanganan error."
3. WHEN the total score is below 80, the output SHALL list the top 3 actions that would most improve the score, phrased as concrete tasks.
4. THE score labels SHALL remain: Siap (80-100, green), Perlu Klarifikasi (50-79, yellow), Tidak Siap (0-49, red).
5. IF the BRD has no journey gaps and no technical blindspots relevant to its scope, those components SHALL score 100% (not penalized for simplicity).

### Requirement 8: Honest Positioning — Credible Differentiation

**User Story:** As a PM evaluating tools, I want StoryForge to position itself credibly (not with overclaims), so that I trust it enough to integrate into my workflow.

#### Acceptance Criteria

1. THE product positioning SHALL frame StoryForge as: "Structured PM review: journey gaps, technical blindspots, clarification questions, and PRD-ready fixes" — NOT as "things you could never get from ChatGPT."
2. THE output SHALL demonstrate value through structure and actionability — prioritized findings, Gap Cards with next actions, visual journey map, and explainable score — rather than through claims of AI superiority.
3. WHEN presenting findings, the output SHALL tag each item as either "Sudah tertulis di BRD" (extracted from document — quality issue) or "Belum tertulis di BRD" (generated insight not in document) — showing added value without overclaiming.
4. THE summary header SHALL show concrete metrics: "X temuan baru yang belum ada di BRD" and "Readiness Score: Y/100" — letting the numbers speak.

### Requirement 9: Copy-Paste Ready Output for PM Workflows

**User Story:** As a PM, I want to be able to copy findings directly into Slack, grooming docs, and my PRD without reformatting, so that the tool fits my actual daily workflow.

#### Acceptance Criteria

1. THE "Pertanyaan untuk tim" fields across all Gap Cards SHALL be formatted as natural chat messages — directly pasteable into Slack or WhatsApp to a stakeholder.
2. THE "Usulan requirement" fields SHALL be formatted as standalone requirement sentences — directly insertable into a PRD document.
3. THE output SHALL include a "Salin Semua Pertanyaan" (Copy All Questions) action that copies all questions as a numbered list — ready to send in one message to engineering.
4. THE output SHALL include a "Salin Semua Usulan" (Copy All Requirements) action that copies all suggested requirements as a bullet list — ready to paste into the BRD.
5. THE Journey Map SHALL be exportable/copyable as an image or embeddable format for inclusion in presentations or documents.

### Requirement 10: Streaming and Graceful Output

**User Story:** As a PM using the tool, I want to see results appearing progressively (not waiting 30 seconds for a blank screen), and I want the experience to degrade gracefully if something is too complex.

#### Acceptance Criteria

1. THE analysis SHALL stream status messages progressively via SSE during AI processing: "Sedang membaca BRD...", "Memetakan alur utama user...", "Mengecek skenario yang sering terlewat...", "Menyusun pertanyaan untuk tim...", "Membuat usulan requirement...". Once AI completes, the full validated result is emitted as a single structured payload.
2. THE streaming approach SHALL ensure the PM sees activity immediately (within 2-3 seconds via status messages and skeleton UI) while the AI completes full analysis. All pending status messages SHALL be cancelled immediately when the result arrives — no late messages after results are shown.
3. IF the AI cannot produce a valid Journey Map for a given BRD, the analysis SHALL skip that section gracefully and show remaining output normally — no error state, no broken UI.
4. THE enhanced output format SHALL maintain backward-compatible JSON structure so existing frontend components continue to work during incremental migration.
5. IF the BRD is very short or vague (fewer than 200 words), the analysis SHALL still produce useful output (even if limited) rather than refusing to analyze. It SHALL note what additional information would help.
