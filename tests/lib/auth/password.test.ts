import { describe, expect, it } from 'vitest'
import { validatePassword } from '@/lib/auth/password'

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Aa1!aaa')).toBe('Password minimal 8 karakter')
  })

  it('rejects passwords without an uppercase letter', () => {
    expect(validatePassword('password1!')).toBe('Password harus mengandung minimal 1 huruf kapital')
  })

  it('rejects passwords without a number', () => {
    expect(validatePassword('Password!')).toBe('Password harus mengandung minimal 1 angka')
  })

  it('rejects passwords without a symbol', () => {
    expect(validatePassword('Password1')).toBe('Password harus mengandung minimal 1 simbol')
  })

  it('accepts a password that meets all rules', () => {
    expect(validatePassword('Password1!')).toBeNull()
  })
})