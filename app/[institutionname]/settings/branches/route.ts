import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const branchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  manager_name: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('branches')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return Response.json({ branches: data || [] })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '지점 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = branchSchema.omit({ id: true }).parse(body)
    const { data, error } = await db
      .from('branches')
      .insert({ ...validated, org_id: orgId })
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ branch: data }, { status: 201 })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '지점 생성 실패', details: e.message }, { status: code })
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = branchSchema.parse(body)
    if (!validated.id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { data, error } = await db
      .from('branches')
      .update({
        name: validated.name,
        address: validated.address,
        phone: validated.phone,
        manager_name: validated.manager_name,
        status: validated.status,
      })
      .eq('id', validated.id)
      .eq('org_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return Response.json({ branch: data })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '지점 수정 실패', details: e.message }, { status: code })
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const id = body?.id as string | undefined
    if (!id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { error } = await db.from('branches').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error
    return Response.json({ success: true })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '지점 삭제 실패', details: e.message }, { status: code })
  }
}
