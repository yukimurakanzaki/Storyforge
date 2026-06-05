// lib/prompts/workspace.ts
import type { WorkspaceState } from '@/types/workspace'
import type { ChatMessage } from '@/types'

function renderGaps(state: WorkspaceState): string {
  const open = state.gaps.filter((g) => g.status === 'open')
  if (open.length === 0) return '(tidak ada gap terbuka)'
  return open.map((g) => `  - id=${g.id} [${g.severity}] (${g.category}) ${g.question}`).join('\n')
}

/**
 * System prompt for one orchestrator turn. The model MUST return ONE JSON object
 * matching ModelTurnResponse — no markdown, no code fence.
 * `contextBlock` is prepended verbatim (empty in Story 1, filled by Story 2).
 */
export function buildWorkspaceSystemPrompt({ contextBlock, state }: { contextBlock: string; state: WorkspaceState }): string {
  const ctx = contextBlock.trim() ? `${contextBlock.trim()}\n\n` : ''
  const summary = state.contextSummary.trim() ? `RINGKASAN PERCAKAPAN SEBELUMNYA:\n${state.contextSummary.trim()}\n\n` : ''

  return `${ctx}Kamu adalah analis requirements senior yang membantu seorang Product Manager mengubah requirement yang berantakan menjadi PRD yang siap dikerjakan. Bahasa: Indonesia yang natural.

${summary}STATE SAAT INI:
- Readiness score: ${state.readinessScore}/100 (${state.readinessLabel})
- Gap TERBUKA (gunakan id persis saat menutupnya):
${renderGaps(state)}
- PRD: ${state.prd ? `sudah ada, versi ${state.prd.version}` : 'belum dibuat'}

TUGAS: klasifikasikan pesan terakhir user ke SATU intent, lalu lakukan aksinya:
1. "new_or_expanded_requirement" — user menempel/menambah requirement. Temukan gap baru (maks 6 per turn). JANGAN bertanya hal yang sudah dijawab oleh KONTEKS di atas. Jika requirement BERTENTANGAN dengan konteks (mis. pakai SFTP padahal default S3, atau melanggar regulasi yang disebut), buat gap dengan category "constraint_conflict" dan isi conflictsWith.
2. "answer_pending_question" — pesan user menjawab satu/lebih gap terbuka. Isi resolvedGapIds (pakai id dari daftar di atas) + gapAnswers. Jika jawaban ambigu/parsial, JANGAN tutup; ajukan follow-up sebagai newGaps.
3. "command" — user minta menulis/memperbarui/menfinalkan PRD ("tulis PRD", "update PRD", "finalkan"). Hasilkan field prd: markdown PRD lengkap (epic + user story INVEST + acceptance criteria Gherkin). Jika ada "TEMPLATE PRD" di KONTEKS, IKUTI strukturnya; jika tidak, pakai format default. Pertanyaan yang masih terbuka MASUK ke prd.openQuestions; gap out_of_scope MASUK ke prd.assumptions.
4. "general_chat" — selain di atas. Balas saja; jangan ubah gap/PRD.

assistantMessage WAJIB: balasan natural ke user yang menjelaskan apa yang kamu lakukan (gap baru, gap yang ditutup, atau jawaban langsung).

KEMBALIKAN HANYA JSON valid (tanpa markdown, tanpa code block) dengan bentuk PERSIS:
{"intent":"...","assistantMessage":"...","newGaps":[{"category":"functional","description":"...","severity":"high","question":"...","source":"brd","conflictsWith":null}],"resolvedGapIds":[],"gapAnswers":{},"outOfScopeGapIds":[],"prd":null}`
}

/** Cheap prompt to summarise old chat turns during compaction. */
export function buildSummaryPrompt(messages: ChatMessage[]): string {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'PM' : 'AI'}: ${m.content}`).join('\n')
  return `Ringkas percakapan berikut menjadi 4-6 poin penting (keputusan, jawaban, dan konteks yang sudah ditetapkan). Bahasa Indonesia, padat, tanpa basa-basi.\n\n${transcript}`
}
