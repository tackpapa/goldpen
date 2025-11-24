import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createSeatSchema = z.object({
  room_id: z.string().uuid().optional(),
  seat_number: z.number().int().positive('좌석 번호는 양수여야 합니다'),
  student_id: z.string().uuid().optional().nullable(),
  assigned_date: z.string().optional().nullable(), // YYYY-MM-DD
  status: z.enum(['available', 'occupied', 'reserved', 'maintenance']).optional(),
  notes: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const room_id = searchParams.get('room_id')
    const status = searchParams.get('status')

    let query = db
      .from('seats')
      .select('*, rooms(name), students(name)')
      .eq('org_id', orgId)
      .order('seat_number', { ascending: true })

    if (room_id) query = query.eq('room_id', room_id)
    if (status) query = query.eq('status', status)

    const { data: seats, error: seatsError } = await query

    if (seatsError) {
      console.error('[Seats GET] Error:', seatsError)
      return Response.json({ error: '좌석 목록 조회 실패', details: seatsError.message }, { status: 500 })
    }

    return Response.json({ seats, count: seats?.length || 0 })
  } catch (error: any) {
    console.error('[Seats GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createSeatSchema.parse(body)

    const { data: seat, error: createError } = await db
      .from('seats')
      .insert({
        ...validated,
        org_id: orgId
      })
      .select()
      .single()

    if (createError) {
      console.error('[Seats POST] Error:', createError)
      return Response.json({ error: '좌석 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ seat, message: '좌석이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Seats POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
