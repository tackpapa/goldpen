import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Request body types
// 프론트엔드에서 배열 형태로 전송: [{page_id, manager, teacher}, ...]
interface PermissionItem {
  page_id: string
  manager?: boolean  // 프론트엔드에서 manager로 전송
  staff?: boolean    // 또는 staff로 전송
  teacher?: boolean
}

interface UpdatePermissionsBody {
  permissions: PermissionItem[] | Record<string, { staff?: boolean; manager?: boolean; teacher?: boolean }>
}

// GET: 페이지 권한 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if (user && !authError) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: permissions, error } = await supabase
      .from('page_permissions')
      .select('*')
      .eq('org_id', orgId)

    if (error) {
      console.error('[PagePermissions GET] Error:', error)
      return Response.json({ error: '권한 조회 실패' }, { status: 500 })
    }

    // 페이지별 권한을 객체로 변환 (manager로 반환하여 타입과 일치)
    const permissionsMap: Record<string, { manager: boolean; teacher: boolean }> = {}
    for (const perm of (permissions || [])) {
      permissionsMap[perm.page_id] = {
        manager: perm.staff_access,  // DB의 staff_access를 manager로 반환
        teacher: perm.teacher_access
      }
    }

    return Response.json({ permissions: permissionsMap })
  } catch (error: any) {
    console.error('[PagePermissions GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 페이지 권한 업데이트
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null

    // orgSlug 서비스 모드 지원
    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if (user && !authError) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }

      if (!['admin', 'owner'].includes(userProfile.role)) {
        return Response.json({ error: '권한이 없습니다' }, { status: 403 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json() as UpdatePermissionsBody
    const { permissions } = body

    if (!permissions || (typeof permissions !== 'object' && !Array.isArray(permissions))) {
      return Response.json({ error: '권한 데이터가 필요합니다' }, { status: 400 })
    }

    // 배열 또는 객체 형태 모두 지원
    // 프론트엔드에서 배열로 전송: [{page_id, manager, teacher}, ...]
    // manager는 staff_access로 매핑
    let permissionsToProcess: { pageId: string; staff: boolean; teacher: boolean }[] = []

    if (Array.isArray(permissions)) {
      // 배열 형태 처리 (프론트엔드 방식)
      permissionsToProcess = permissions.map((item: PermissionItem) => ({
        pageId: item.page_id,
        staff: item.manager ?? item.staff ?? false,  // manager를 staff로 매핑
        teacher: item.teacher ?? false
      }))
    } else {
      // 객체 형태 처리 (기존 방식)
      permissionsToProcess = Object.entries(permissions).map(([pageId, permData]) => ({
        pageId,
        staff: (permData as any).manager ?? (permData as any).staff ?? false,
        teacher: (permData as any).teacher ?? false
      }))
    }

    // 각 페이지 권한 upsert
    for (const perm of permissionsToProcess) {
      const { error } = await supabase
        .from('page_permissions')
        .upsert({
          org_id: orgId,
          page_id: perm.pageId,
          staff_access: perm.staff,
          teacher_access: perm.teacher
        }, {
          onConflict: 'org_id,page_id'
        })

      if (error) {
        console.error('[PagePermissions PUT] Error:', error)
      }
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[PagePermissions PUT] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
