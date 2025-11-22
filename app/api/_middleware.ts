import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  if (process.env.E2E_NO_AUTH === '1') {
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
