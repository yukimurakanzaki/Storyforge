// Safety guard for the local integration gauntlet: it creates users and
// mutates/deletes data, so it must ONLY ever point at a loopback host. A
// mistaken cloud URL in LOCAL_SUPABASE_URL would otherwise touch real data.

export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '') // strip IPv6 brackets
  return h === 'localhost' || h === '127.0.0.1' || h === '::1'
}

/** Throws unless `url` is a valid URL whose host is exactly localhost/127.0.0.1/::1. */
export function assertLoopbackUrl(url: string | undefined): void {
  let host: string
  try {
    host = new URL(url ?? '').hostname
  } catch {
    throw new Error(`LOCAL_SUPABASE_URL is not a valid URL: ${String(url)}`)
  }
  if (!isLoopbackHost(host)) {
    throw new Error(
      `Refusing to run the local gauntlet against non-loopback host "${host}". ` +
        `Only localhost, 127.0.0.1, and ::1 are allowed.`,
    )
  }
}
