/**
 * SWR fetcher 및 공통 설정
 */

export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const error = new Error('API 요청 실패')
    throw error
  }
  return res.json()
}

// SWR 기본 설정
export const swrConfig = {
  revalidateOnFocus: false,      // 탭 전환 시 재요청 방지
  revalidateOnReconnect: false,  // 재연결 시 재요청 방지
  dedupingInterval: 60000,       // 1분간 중복 요청 방지
  keepPreviousData: true,        // 로딩 중 이전 데이터 유지
  errorRetryCount: 2,            // 에러 시 2번까지 재시도
}
