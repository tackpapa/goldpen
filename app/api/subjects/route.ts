import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const serviceParam = searchParams.get('service')
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug

    let supabase: any
    let orgId: string | null = null
    const orgParam = searchParams.get('orgId')

    if (allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any

      // orgSlug로 org_id 조회 (프로덕션 지원)
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
        }
        orgId = org.id
      } else {
        orgId = orgParam || (isDev ? demoOrgId : null)
      }
    } else {
      supabase = await createAuthenticatedClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
      }
    }

    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('order', { ascending: true })

    if (error) {
      console.error('[Subjects GET] Error:', error)
      return Response.json({ error: '과목 조회 실패' }, { status: 500 })
    }

    return Response.json({ subjects: subjects || [] })
  } catch (error: any) {
    console.error('[Subjects GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const serviceParam = searchParams.get('service')
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug

    let supabase: any
    let orgId: string | null = null
    const orgParam = searchParams.get('orgId')

    if (allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any

      // orgSlug로 org_id 조회 (프로덕션 지원)
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
        }
        orgId = org.id
      } else {
        orgId = orgParam || (isDev ? demoOrgId : null)
      }
    } else {
      supabase = await createAuthenticatedClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userProfile) {
        if (supabaseServiceKey) {
          supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
          orgId = orgParam || demoOrgId
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
      }
    }

    const body = await request.json() as { studentId: string; name: string; color?: string; order?: number }
    const { studentId, name, color, order } = body

    if (!studentId || !name) {
      return Response.json({ error: 'studentId와 name이 필요합니다' }, { status: 400 })
    }

    if (!orgId) {
      return Response.json({ error: 'orgId가 필요합니다' }, { status: 400 })
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        org_id: orgId,
        student_id: studentId,
        name,
        color: color || '#4A90E2',
        order: order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Subjects POST] Error:', error)
      return Response.json({ error: '과목 생성 실패' }, { status: 500 })
    }

    return Response.json({ subject })
  } catch (error: any) {
    console.error('[Subjects POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceParam = searchParams.get('service')
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug

    let supabase: any

    if (allowService && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
    } else {
      supabase = await createAuthenticatedClient(request)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
      }
    }

    const subjectId = searchParams.get('id')

    if (!subjectId) {
      return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: false })
      .eq('id', subjectId)

    if (error) {
      console.error('[Subjects DELETE] Error:', error)
      return Response.json({ error: '과목 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[Subjects DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
