import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const roomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  capacity: z.number().int().min(0).default(0),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

async function getOrgId(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('AUTH')
  const demoOrg = process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
  if ((user as any).role === 'service_role' || user.id === 'service-role') return demoOrg
  const { data: profile, error: profileError } = await supabase.from('users').select('org_id').eq('id', user.id).single()
  if (profileError || !profile?.org_id) return demoOrg
  return profile.org_id as string
}

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const orgId = await getOrgId(supabase)
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, capacity, status, notes')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
    if (error) throw error
    return Response.json({ rooms: data || [] })
  } catch (e: any) {
    const code = e.message === 'AUTH' ? 401 : 500
    return Response.json({ error: '교실 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const orgId = await getOrgId(supabase)
    const body = await request.json()
    const validated = roomSchema.omit({ id: true }).parse(body)
    const { data, error } = await supabase
      .from('rooms')
      .insert({ ...validated, org_id: orgId })
      .select('id, name, capacity, status, notes')
      .single()
    if (error) throw error
    return Response.json({ room: data }, { status: 201 })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message === 'AUTH' ? 401 : 500
    return Response.json({ error: '교실 생성 실패', details: e.message }, { status: code })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const orgId = await getOrgId(supabase)
    const body = await request.json()
    const validated = roomSchema.parse(body)
    if (!validated.id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { data, error } = await supabase
      .from('rooms')
      .update({
        name: validated.name,
        capacity: validated.capacity,
        status: validated.status ?? 'active',
        notes: validated.notes ?? null,
      })
      .eq('id', validated.id)
      .eq('org_id', orgId)
      .select('id, name, capacity, status, notes')
      .single()
    if (error) throw error
    return Response.json({ room: data })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message === 'AUTH' ? 401 : 500
    return Response.json({ error: '교실 수정 실패', details: e.message }, { status: code })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const orgId = await getOrgId(supabase)
    const body = await request.json() as { id?: string }
    const id = body?.id
    if (!id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })
    const { error } = await supabase.from('rooms').delete().eq('id', id).eq('org_id', orgId)
    if (error) throw error
    return Response.json({ success: true })
  } catch (e: any) {
    const code = e.message === 'AUTH' ? 401 : 500
    return Response.json({ error: '교실 삭제 실패', details: e.message }, { status: code })
  }
}
