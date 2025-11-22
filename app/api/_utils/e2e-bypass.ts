// E2E_NO_AUTH 모드에서 API 인증을 우회하기 위한 헬퍼
// 개별 route handler 최상단에서 사용:
//   const bypass = e2eBypass(request, { ok: true })
//   if (bypass) return bypass

export function e2eBypass(request: Request, payload: any = { ok: true }) {
  if (process.env.E2E_NO_AUTH === '1') {
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  return null
}
