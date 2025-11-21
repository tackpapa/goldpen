import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createScheduleSchema = z.object({
  class_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  start_time: z.string(), // HH:MM 형식
  end_time: z.string(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const day_of_week = searchParams.get('day_of_week')
    const teacher_id = searchParams.get('teacher_id')
    const room_id = searchParams.get('room_id')

    let query = supabase
      .from('schedules')
      .select('*, classes(name, teacher_id), rooms(name), teacher:users!schedules_teacher_id_fkey(name)')
      .eq('org_id', userProfile.org_id)
      .order('day_of_week', { ascending: true })

    if (day_of_week) query = query.eq('day_of_week', day_of_week)
    if (teacher_id) query = query.eq('teacher_id', teacher_id)
    if (room_id) query = query.eq('room_id', room_id)

    const { data: schedules, error: schedulesError } = await query

    if (schedulesError) {
      console.error('[Schedules GET] Error:', schedulesError)
      return Response.json({ error: '스케줄 목록 조회 실패', details: schedulesError.message }, { status: 500 })
    }

    return Response.json({ schedules, count: schedules?.length || 0 })
  } catch (error: any) {
    console.error('[Schedules GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createScheduleSchema.parse(body)

    const { data: schedule, error: createError } = await supabase
      .from('schedules')
      .insert({
        ...validated,
        org_id: userProfile.org_id
      })
      .select()
      .single()

    if (createError) {
      console.error('[Schedules POST] Error:', createError)
      return Response.json({ error: '스케줄 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ schedule, message: '스케줄이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
