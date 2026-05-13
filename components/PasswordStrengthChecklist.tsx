'use client'

/**
 * Checks if a password meets all 4 requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 symbol
 */
export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

interface PasswordStrengthChecklistProps {
  password: string
  confirmPassword?: string
  showPassword: boolean
  onToggleShow: () => void
}

export function PasswordStrengthChecklist({
  password,
  confirmPassword,
  showPassword,
  onToggleShow,
}: PasswordStrengthChecklistProps) {
  const checks = [
    { label: 'Minimal 8 karakter', met: password.length >= 8 },
    { label: '1 huruf kapital', met: /[A-Z]/.test(password) },
    { label: '1 angka', met: /[0-9]/.test(password) },
    { label: '1 simbol', met: /[^A-Za-z0-9]/.test(password) },
  ]

  return (
    <div className="mt-2 space-y-1">
      {/* Password requirements */}
      {checks.map((check) => (
        <p
          key={check.label}
          className={`text-xs ${check.met ? 'text-green-600' : 'text-gray-400'}`}
        >
          {check.met ? '✓' : '✗'} {check.label}
        </p>
      ))}

      {/* Confirm password match indicator */}
      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <p
          className={`text-xs ${
            password === confirmPassword ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {password === confirmPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
        </p>
      )}

      {/* Show/hide password toggle */}
      <button
        type="button"
        onClick={onToggleShow}
        className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {showPassword ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Sembunyikan password
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Tampilkan password
          </>
        )}
      </button>
    </div>
  )
}
