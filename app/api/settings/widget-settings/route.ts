import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Request body types
interface UpdateWidgetSettingsBody {
  widgets: Array<{
    id: string
    enabled: boolean
    order?: number
  }>
}

// GET: 위젯 설정 조회
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
      .from('widget_settings')
      .select('*')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[WidgetSettings GET] Error:', error)
      return Response.json({ error: '위젯 설정 조회 실패' }, { status: 500 })
    }

    return Response.json({ settings: settings || [] })
  } catch (error: any) {
    console.error('[WidgetSettings GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 위젯 설정 일괄 업데이트
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

    const body = await request.json() as UpdateWidgetSettingsBody
    const { widgets } = body

    if (!widgets || !Array.isArray(widgets)) {
      return Response.json({ error: '위젯 데이터가 필요합니다' }, { status: 400 })
    }

    // 위젯 설정 upsert
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i]

      const { error } = await supabase
        .from('widget_settings')
        .upsert({
          org_id: orgId,
          widget_id: widget.id,
          is_enabled: widget.enabled,
          display_order: widget.order ?? i
        }, {
          onConflict: 'org_id,widget_id'
        })

      if (error) {
        console.error('[WidgetSettings PUT] Error:', error)
      }
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[WidgetSettings PUT] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
