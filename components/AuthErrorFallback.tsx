'use client'

interface AuthErrorFallbackProps {
  message?: string
  onRetry?: () => void
}

/**
 * Displayed on login/signup pages when both Google OAuth and email/password
 * services are temporarily unavailable.
 */
export function AuthErrorFallback({ message, onRetry }: AuthErrorFallbackProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-center">
      <div className="mb-2 flex justify-center">
        <svg
          className="h-6 w-6 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-amber-800">
        {message || 'Layanan login sedang tidak tersedia. Silakan coba beberapa saat lagi.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          Coba Lagi
        </button>
      )}
    </div>
  )
}
