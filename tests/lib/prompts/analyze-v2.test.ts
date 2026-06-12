import { describe, expect, it } from 'vitest'
import { buildAnalyzeV2Prompt, V2_TOKEN_BUDGET } from '@/lib/prompts/analyze-v2'

describe('buildAnalyzeV2Prompt', () => {
  it('contains the v2 JSON schema, blindspot scenarios, and prompt-injection hardening', () => {
    const prompt = buildAnalyzeV2Prompt()

    expect(prompt).toContain('"gapCards"')
    expect(prompt).toContain('"pertanyaanUntukTim"')
    expect(prompt).toContain('"usulanRequirement"')
    expect(prompt).toContain('Aksi ganda')
    expect(prompt).toContain('Koneksi lambat')
    expect(prompt).toContain('Sesi dan login')
    expect(prompt).toContain('Konflik data')
    expect(prompt).toContain('Batas dan kapasitas')
    expect(prompt).toContain('Hak akses berubah')
    expect(prompt).toContain('<BRD_CONTENT>')
    expect(prompt).toContain('DATA yang harus dianalisis')
    expect(prompt).toContain('ignore previous instructions')
  })

  it('includes project context when provided and exports tier token budgets', () => {
    const prompt = buildAnalyzeV2Prompt({
      name: 'Project Pembayaran',
      context: {
        business: {
          description: 'Pembayaran digital',
          targetUsers: ['PM', 'Nasabah'],
          domain: 'Fintech',
          compliance: ['UU PDP'],
          namingConventions: {},
          pastDecisions: ['Manual transfer untuk beta'],
        },
        technical: {
          frontend: 'Next.js',
          backend: 'Vercel',
          existingSystems: ['Core banking'],
          integrations: ['Payment gateway'],
          constraints: ['ZDR'],
          techDebt: [],
        },
      },
    })

    expect(prompt).toContain('Project Pembayaran')
    expect(prompt).toContain('Fintech')
    expect(prompt).toContain('Payment gateway')
    expect(V2_TOKEN_BUDGET.free).toBe(6144)
    expect(V2_TOKEN_BUDGET.pro).toBe(8192)
  })
})
