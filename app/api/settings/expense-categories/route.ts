import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Request body types
interface CreateCategoryBody {
  name: string
  description?: string
  color?: string
}

interface UpdateCategoryBody {
  id?: string
  name?: string
  description?: string
  color?: string
  is_active?: boolean
  categories?: Array<{
    id: string
    name: string
    description?: string
    color?: string
    is_active: boolean
  }>
}

// GET: 지출 카테고리 목록 조회
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

    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[ExpenseCategories GET] Error:', error)
      return Response.json({ error: '카테고리 조회 실패' }, { status: 500 })
    }

    return Response.json({ categories: categories || [] })
  } catch (error: any) {
    console.error('[ExpenseCategories GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 지출 카테고리 추가
export async function POST(request: Request) {
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

    const body = await request.json() as CreateCategoryBody
    const { name, description, color } = body

    if (!name) {
      return Response.json({ error: '카테고리명은 필수입니다' }, { status: 400 })
    }

    const { data: maxOrderData } = await supabase
      .from('expense_categories')
      .select('display_order')
      .eq('org_id', orgId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

    const { data: category, error } = await supabase
      .from('expense_categories')
      .insert({
        org_id: orgId,
        name,
        description,
        color: color || '#6b7280',
        display_order: nextOrder,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: '이미 존재하는 카테고리명입니다' }, { status: 409 })
      }
      console.error('[ExpenseCategories POST] Error:', error)
      return Response.json({ error: '카테고리 생성 실패' }, { status: 500 })
    }

    return Response.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error('[ExpenseCategories POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 지출 카테고리 수정
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

    const body = await request.json() as UpdateCategoryBody

    // 일괄 업데이트
    if (body.categories && Array.isArray(body.categories)) {
      for (let i = 0; i < body.categories.length; i++) {
        const cat = body.categories[i]
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name: cat.name,
            description: cat.description,
            color: cat.color,
            is_active: cat.is_active,
            display_order: i
          })
          .eq('id', cat.id)
          .eq('org_id', orgId)

        if (error) {
          console.error('[ExpenseCategories PUT batch] Error:', error)
        }
      }

      return Response.json({ success: true })
    }

    // 단일 업데이트
    const { id, name, description, color, is_active } = body

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (color !== undefined) updateData.color = color
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: category, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[ExpenseCategories PUT] Error:', error)
      return Response.json({ error: '카테고리 수정 실패' }, { status: 500 })
    }

    return Response.json({ category })
  } catch (error: any) {
    console.error('[ExpenseCategories PUT] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PATCH: 지출 카테고리 수정 (프론트엔드에서 PATCH 사용)
export async function PATCH(request: Request) {
  // PUT과 동일하게 처리
  return PUT(request)
}

// DELETE: 지출 카테고리 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')
    const id = searchParams.get('id')

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

    if (!id) {
      return Response.json({ error: 'ID는 필수입니다' }, { status: 400 })
    }

    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('[ExpenseCategories DELETE] Error:', error)
      return Response.json({ error: '카테고리 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('[ExpenseCategories DELETE] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
