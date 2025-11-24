import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().min(6).optional(), // only for create or reset
  name: z.string().min(1),
  role: z.enum(['owner', 'manager', 'teacher']),
  phone: z.string().optional().nullable(),
})

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SERVICE_KEY_MISSING')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('users')
      .select('id, email, name, role, phone, org_id, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return Response.json({ accounts: data || [] })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '계정 조회 실패', details: e.message }, { status: code })
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = accountSchema.parse(body)

    const service = getServiceClient()
    const { data: newUser, error: createError } = await service.auth.admin.createUser({
      email: validated.email,
      password: validated.password || crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name: validated.name, role: validated.role },
    })
    if (createError || !newUser?.user) throw createError || new Error('USER_CREATE_FAILED')

    const { error: insertError, data: inserted } = await service
      .from('users')
      .insert({
        id: newUser.user.id,
        email: validated.email,
        name: validated.name,
        role: validated.role,
        phone: validated.phone || null,
        org_id: orgId,
      })
      .select('id, email, name, role, phone, org_id, created_at')
      .single()
    if (insertError) throw insertError

    return Response.json({ account: inserted }, { status: 201 })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message?.includes('AUTH') ? 401 : 500
    return Response.json({ error: '계정 생성 실패', details: e.message }, { status: code })
  }
}

export async function PATCH(request: Request) {
  try {
    const { orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const validated = accountSchema.parse(body)
    if (!validated.id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })

    const service = getServiceClient()

    if (validated.password) {
      await service.auth.admin.updateUser(validated.id, { password: validated.password })
    }

    const { data, error } = await service
      .from('users')
      .update({
        name: validated.name,
        role: validated.role,
        phone: validated.phone || null,
      })
      .eq('id', validated.id)
      .eq('org_id', orgId)
      .select('id, email, name, role, phone, org_id, created_at')
      .single()
    if (error) throw error

    return Response.json({ account: data })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message?.includes('AUTH') ? 401 : 500
    return Response.json({ error: '계정 수정 실패', details: e.message }, { status: code })
  }
}

export async function DELETE(request: Request) {
  try {
    const { orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const id = body?.id as string | undefined
    if (!id) return Response.json({ error: 'id가 필요합니다' }, { status: 400 })

    const service = getServiceClient()
    await service.auth.admin.deleteUser(id)
    await service.from('users').delete().eq('id', id).eq('org_id', orgId)

    return Response.json({ success: true })
  } catch (e: any) {
    const code = e.message?.includes('AUTH') ? 401 : 500
    return Response.json({ error: '계정 삭제 실패', details: e.message }, { status: code })
  }
}
