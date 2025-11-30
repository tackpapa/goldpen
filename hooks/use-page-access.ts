'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { PageId, UserRole } from '@/lib/types/permissions'

type MeResponse = { user?: { id: string; role: UserRole; org_id?: string } }
type PermResponse = { permissions?: Array<{ page_id: string; staff: boolean; teacher: boolean }> }

// owner만 접근 가능한 페이지 목록
const OWNER_ONLY_PAGES: PageId[] = ['settings']

export function usePageAccess(pageId: PageId) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let cancelled = false
    const checkAccess = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const meJson: MeResponse = (await meRes.json().catch(() => ({} as MeResponse))) as MeResponse
        // 인증 API 오류나 미인증 상태여도 페이지 접근은 허용
        if (!meRes.ok || !meJson.user) return

        const role = meJson.user.role

        // super_admin만 별도 관리자 콘솔로 보낸다.
        if ((role as string) === 'super_admin') {
          if (!cancelled) router.push('/admin')
          return
        }

        // owner만 접근 가능한 페이지 체크 (manager, teacher 접근 불가)
        if (OWNER_ONLY_PAGES.includes(pageId)) {
          if (role === 'manager' || role === 'teacher') {
            // 기관 slug 추출 (pathname에서 첫 번째 세그먼트)
            const segments = pathname.split('/').filter(Boolean)
            const institutionName = segments[0] || 'goldpen'
            if (!cancelled) router.push(`/${institutionName}/overview`)
            return
          }
        }

        // 나머지는 권한 체크 없이 통과
        return
      } catch (_) {
        router.push('/login')
      }
    }
    checkAccess()
    return () => {
      cancelled = true
    }
  }, [pageId, router, pathname])
}
