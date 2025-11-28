import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('revenue_categories')
      .select('*')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error

    // 기본 수입 항목을 항상 포함 (DB 커스텀 + 시스템 기본)
    return Response.json({ categories: data || [] })
  } catch (e: any) {
    const code = e?.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '수입 항목 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = schema.omit({ id: true }).parse(body)
    const { data, error } = await db
      .from('revenue_categories')
      .insert({ ...validated, org_id: orgId })
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ category: data }, { status: 201 })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e?.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '수입 항목 생성 실패', details: e.message }, { status: code })
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = schema.parse(body)
    if (!validated.id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { data, error } = await db
      .from('revenue_categories')
      .update({
        name: validated.name,
        description: validated.description ?? null,
        is_active: validated.is_active ?? true,
        display_order: validated.display_order ?? 0,
      })
      .eq('id', validated.id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ category: data })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e?.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '수입 항목 수정 실패', details: e.message }, { status: code })
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json() as { id?: string }
    const id = body?.id
    if (!id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { error } = await db.from('revenue_categories').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error
    return Response.json({ success: true })
  } catch (e: any) {
    const code = e?.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '수입 항목 삭제 실패', details: e.message }, { status: code })
  }
}
