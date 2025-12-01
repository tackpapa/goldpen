import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const WEEKDAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const

type Weekday = typeof WEEKDAYS[number]

type SchedulePayload = {
  weekday: Weekday
  check_in_time?: string | null
  check_out_time?: string | null
  notes?: string | null
}

function mapDbToDto(row: any) {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    student_id: row.student_id,
    day_of_week: row.weekday as Weekday,
    start_time: row.check_in_time ?? null,
    end_time: row.check_out_time ?? null,
    notes: row.notes ?? null,
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data, error } = await db
      .from('commute_schedules')
      .select('*')
      .eq('org_id', orgId)
      .eq('student_id', id)
      .order('weekday')

    if (error) throw error

    return Response.json({ schedules: (data || []).map(mapDbToDto) })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[commute-schedules][GET]', error)
    return Response.json({ error: error.message || 'failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload: SchedulePayload = await request.json()
    if (!payload.weekday || !WEEKDAYS.includes(payload.weekday)) {
      return Response.json({ error: 'weekday required' }, { status: 400 })
    }

    const { id } = params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data, error } = await db
      .from('commute_schedules')
      .upsert({
        org_id: orgId,
        student_id: id,
        weekday: payload.weekday,
        check_in_time: payload.check_in_time || null,
        check_out_time: payload.check_out_time || null,
        notes: payload.notes || null,
      }, { onConflict: 'org_id,student_id,weekday' })
      .select()
      .single()

    if (error) throw error

    return Response.json({ schedule: mapDbToDto(data) })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[commute-schedules][PATCH]', error)
    return Response.json({ error: error.message || 'failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const weekday = searchParams.get('weekday') as Weekday | null
    if (!weekday || !WEEKDAYS.includes(weekday)) {
      return Response.json({ error: 'weekday required' }, { status: 400 })
    }

    const { id } = params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { error } = await db
      .from('commute_schedules')
      .delete()
      .eq('org_id', orgId)
      .eq('student_id', id)
      .eq('weekday', weekday)

    if (error) throw error

    return Response.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[commute-schedules][DELETE]', error)
    return Response.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
