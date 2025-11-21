import { getInstitutionName } from '@/lib/config/navigation'

/**
 * Get href with institution prefix
 * @param path - The path without institution name (e.g., '/students')
 * @param institutionName - Optional institution name override
 * @returns Full path with institution prefix (e.g., '/goldpen/students')
 *
 * NOTE: institutionName을 명시적으로 전달하는 것을 권장
 * 서버/클라이언트 일관성을 위해 컴포넌트에서 useParams()로 가져온 값을 전달하세요
 */
export function getInstitutionHref(path: string, institutionName?: string): string {
  const institution = institutionName || getInstitutionName()
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `/${institution}${cleanPath}`
}

/**
 * 상대 경로로 href 생성 (hydration mismatch 방지용)
 * 현재 URL 경로의 institution을 유지하면서 하위 경로만 변경
 */
export function getRelativeHref(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return cleanPath
}

/**
 * Navigate to a path with institution prefix
 * Usage with router: router.push(getInstitutionHref('/students'))
 */
export { getInstitutionHref as navTo }
