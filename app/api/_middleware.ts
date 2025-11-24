import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  // E2E_NO_AUTH 모드에서는 라우트 내부의 서비스/데모 폴백을 사용하도록
  // 요청을 그대로 통과시키고 플래그 헤더만 추가한다.
  if (process.env.E2E_NO_AUTH === '1') {
    const response = NextResponse.next()
    response.headers.set('x-e2e-no-auth', '1')
    return response
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
