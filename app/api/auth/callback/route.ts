import { NextResponse } from 'next/server'

// TODO: Implement Supabase auth callback (exchange code for session)
export async function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL('/analyze', url.origin))
}
