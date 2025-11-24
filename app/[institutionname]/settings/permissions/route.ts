import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const permissionSchema = z.object({
  page_id: z.string(),
  staff: z.boolean(),
  teacher: z.boolean(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { data, error } = await db
      .from('page_permissions')
      .select('page_id, staff_access, teacher_access')
      .eq('org_id', orgId)
    if (error) throw error
    const mapped = (data || []).map((p: any) => ({
      page_id: p.page_id,
      staff: !!p.staff_access,
      teacher: !!p.teacher_access,
    }))
    return Response.json({ permissions: mapped })
  } catch (e: any) {
    const code = e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '권한 조회 실패', details: e.message }, { status: code })
  }
}

export async function PUT(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const items = z.array(permissionSchema).parse(body?.permissions || [])

    // upsert each
    const rows = items.map((p) => ({
      org_id: orgId,
      page_id: p.page_id,
      staff_access: p.staff,
      teacher_access: p.teacher,
    }))

    const { error } = await db
      .from('page_permissions')
      .upsert(rows, { onConflict: 'org_id,page_id' })
    if (error) throw error

    return Response.json({ success: true })
  } catch (e: any) {
    const code = e instanceof ZodError ? 400 : e.message === 'AUTH_REQUIRED' ? 401 : 500
    return Response.json({ error: '권한 저장 실패', details: e.message }, { status: code })
  }
}
