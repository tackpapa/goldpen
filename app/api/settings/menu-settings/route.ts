import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

// Request body types
interface UpdateMenuSettingsBody {
  enabledMenus?: string[]
  menuOrder: string[]
}

// GET: 메뉴 설정 조회
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

    const { data: settings, error } = await supabase
      .from('menu_settings')
      .select('*')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[MenuSettings GET] Error:', error)
      return Response.json({ error: '메뉴 설정 조회 실패' }, { status: 500 })
    }

    return Response.json({ settings: settings || [] })
  } catch (error: any) {
    console.error('[MenuSettings GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 메뉴 설정 일괄 업데이트
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

    const body = await request.json() as UpdateMenuSettingsBody
    const { enabledMenus, menuOrder } = body

    if (!menuOrder || !Array.isArray(menuOrder)) {
      return Response.json({ error: '메뉴 순서 데이터가 필요합니다' }, { status: 400 })
    }

    // 기존 설정 삭제 후 새로 삽입 (upsert)
    for (let i = 0; i < menuOrder.length; i++) {
      const menuId = menuOrder[i]
      const isEnabled = enabledMenus ? enabledMenus.includes(menuId) : true

      const { error } = await supabase
        .from('menu_settings')
        .upsert({
          org_id: orgId,
          menu_id: menuId,
          is_enabled: isEnabled,
          display_order: i
        }, {
          onConflict: 'org_id,menu_id'
        })

      if (error) {
        console.error('[MenuSettings PUT] Error:', error)
      }
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[MenuSettings PUT] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
