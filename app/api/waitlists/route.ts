import { z } from 'zod'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'

const createWaitlistSchema = z.object({
  name: z.string().min(1, '대기리스트 이름은 필수입니다'),
  description: z.string().optional().nullable(),
})

// GET /api/waitlists - Get all waitlists with consultations
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    // Get waitlists
    const { data: waitlists, error } = await db
      .from('waitlists')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      if ((error as any).code === '42P01') {
        return Response.json({ waitlists: [] })
      }
      console.error('[Waitlists GET] Error:', error)
      return Response.json({ error: '대기리스트 조회 실패' }, { status: 500 })
    }

    // Get consultation IDs for each waitlist
    const waitlistsWithConsultations = await Promise.all(
      (waitlists || []).map(async (waitlist: any) => {
        const { data: junctions } = await db
          .from('waitlist_consultations')
          .select('consultation_id, position')
          .eq('waitlist_id', waitlist.id)
          .order('position', { ascending: true })

        return {
          ...waitlist,
          consultationIds: (junctions || []).map((j: any) => j.consultation_id),
        }
      })
    )

    return Response.json({ waitlists: waitlistsWithConsultations })
  } catch (error: any) {
    console.error('[Waitlists GET] Unexpected:', error)
    return Response.json({ waitlists: [] })
  }
}

// POST /api/waitlists - Create new waitlist
export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createWaitlistSchema.parse(body)

    const { data: waitlist, error } = await db
      .from('waitlists')
      .insert({
        org_id: orgId,
        name: validated.name,
        description: validated.description || null,
        status: 'active',
        consultation_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[Waitlists POST] Error:', error)
      return Response.json({ error: '대기리스트 생성 실패' }, { status: 500 })
    }

    return Response.json({ waitlist, message: '대기리스트가 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlists POST] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
