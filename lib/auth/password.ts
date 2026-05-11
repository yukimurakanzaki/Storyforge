export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password minimal 8 karakter'
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung minimal 1 huruf kapital'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung minimal 1 angka'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung minimal 1 simbol'
  return null
}