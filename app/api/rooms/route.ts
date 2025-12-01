import { ZodError, z } from 'zod'
import { getSupabaseWithOrg } from '../_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  capacity: z.number().int().nonnegative(),
  status: z.enum(['available', 'inactive', 'maintenance', 'active']).default('available'),
  notes: z.string().nullable().optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: rooms, error } = await db
      .from('rooms')
      .select('id, name, capacity, status, notes')
      .eq('org_id', orgId)
      .order('name', { ascending: true })

    if (error) {
      console.error('[Rooms GET] error', error)
      // rooms 테이블이 없거나 오류가 날 경우 데모 org 에 한해 기본 값 반환 (UI 연속성)
      const demoFallback = [
        { id: 'demo-room-201', org_id: demoOrg, name: '201호', capacity: 15, status: 'active' },
        { id: 'demo-room-202', org_id: demoOrg, name: '202호', capacity: 20, status: 'active' },
        { id: 'demo-room-203', org_id: demoOrg, name: '203호', capacity: 15, status: 'active' },
        { id: 'demo-room-lab', org_id: demoOrg, name: '실험실', capacity: 10, status: 'active' },
        { id: 'demo-room-big', org_id: demoOrg, name: '특강실', capacity: 30, status: 'active' },
      ]
      if (orgId === demoOrg) {
        return Response.json({ rooms: demoFallback, fallback: true }, { status: 200 })
      }
      return Response.json({ error: '강의실 조회 실패', details: error }, { status: 500 })
    }

    return Response.json({ rooms: rooms || [] }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Rooms GET] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error?.message || error }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const parsed = roomSchema.parse(body)

    const normalizedStatus = parsed.status === 'active' ? 'available' : parsed.status

    const { data, error } = await db
      .from('rooms')
      .insert({
        org_id: orgId,
        name: parsed.name,
        capacity: parsed.capacity,
        status: normalizedStatus,
        notes: parsed.notes ?? null,
      })
      .select('id, name, capacity, status, notes')
      .single()

    if (error) throw error

    return Response.json({ room: data })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 값이 올바르지 않습니다', details: error.issues }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Rooms POST] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error?.message || error }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const parsed = roomSchema.extend({ id: z.string() }).parse(body)

    const normalizedStatus = parsed.status === 'active' ? 'available' : parsed.status

    const { data, error } = await db
      .from('rooms')
      .update({
        name: parsed.name,
        capacity: parsed.capacity,
        status: normalizedStatus,
        notes: parsed.notes ?? null,
      })
      .eq('id', parsed.id)
      .eq('org_id', orgId)
      .select('id, name, capacity, status, notes')
      .single()

    if (error) throw error
    return Response.json({ room: data })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 값이 올바르지 않습니다', details: error.issues }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Rooms PATCH] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error?.message || error }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const body = await request.json()
    const parsed = z.object({ id: z.string() }).parse(body)

    const { error } = await db
      .from('rooms')
      .delete()
      .eq('id', parsed.id)
      .eq('org_id', orgId)

    if (error) throw error
    return Response.json({ success: true })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 값이 올바르지 않습니다', details: error.issues }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Rooms DELETE] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error?.message || error }, { status: 500 })
  }
}
