import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Seat type schema
const seatTypeSchema = z.object({
  id: z.string().optional(),
  startNumber: z.number().int().positive(),
  endNumber: z.number().int().positive(),
  typeName: z.string().min(1).max(50),
})

// Update seat config schema
const updateSeatConfigSchema = z.object({
  totalSeats: z.number().int().min(1).max(100),
  seatTypes: z.array(seatTypeSchema),
})

// GET: 좌석 설정 조회
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

    // Get seat config
    const { data: seatConfig, error: configError } = await supabase
      .from('seat_configs')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .single()

    // Get seat types
    const { data: seatTypes, error: typesError } = await supabase
      .from('seat_types')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('start_number', { ascending: true })

    if (typesError) {
      console.error('[SeatConfig GET] Types error:', typesError)
    }

    // Return default if no config exists
    const config = seatConfig || { total_seats: 20 }
    const types = (seatTypes || []).map((t: any) => ({
      id: t.id,
      startNumber: t.start_number,
      endNumber: t.end_number,
      typeName: t.type_name,
    }))

    return Response.json({
      totalSeats: config.total_seats,
      seatTypes: types,
      orgId: userProfile.org_id,
    })
  } catch (error: any) {
    console.error('[SeatConfig GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// PUT: 좌석 설정 저장/업데이트
export async function PUT(request: Request) {
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

    // Parse and validate request body
    const body = await request.json()
    const validated = updateSeatConfigSchema.parse(body)

    // Validate seat types ranges
    for (const type of validated.seatTypes) {
      if (type.startNumber > type.endNumber) {
        return Response.json({
          error: '좌석 범위 오류',
          details: `시작 번호(${type.startNumber})가 종료 번호(${type.endNumber})보다 클 수 없습니다`
        }, { status: 400 })
      }
      if (type.endNumber > validated.totalSeats) {
        return Response.json({
          error: '좌석 범위 오류',
          details: `종료 번호(${type.endNumber})가 총 좌석 수(${validated.totalSeats})를 초과할 수 없습니다`
        }, { status: 400 })
      }
    }

    // Upsert seat config (insert or update)
    const { error: configError } = await supabase
      .from('seat_configs')
      .upsert({
        org_id: userProfile.org_id,
        total_seats: validated.totalSeats,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id',
      })

    if (configError) {
      console.error('[SeatConfig PUT] Config error:', configError)
      return Response.json({ error: '좌석 설정 저장 실패', details: configError.message }, { status: 500 })
    }

    // Delete existing seat types for this org
    const { error: deleteError } = await supabase
      .from('seat_types')
      .delete()
      .eq('org_id', userProfile.org_id)

    if (deleteError) {
      console.error('[SeatConfig PUT] Delete types error:', deleteError)
    }

    // Insert new seat types if any
    if (validated.seatTypes.length > 0) {
      const typesToInsert = validated.seatTypes.map(type => ({
        org_id: userProfile.org_id,
        start_number: type.startNumber,
        end_number: type.endNumber,
        type_name: type.typeName,
      }))

      const { error: insertError } = await supabase
        .from('seat_types')
        .insert(typesToInsert)

      if (insertError) {
        console.error('[SeatConfig PUT] Insert types error:', insertError)
        return Response.json({ error: '좌석 타입 저장 실패', details: insertError.message }, { status: 500 })
      }
    }

    return Response.json({
      message: '좌석 설정이 저장되었습니다',
      totalSeats: validated.totalSeats,
      seatTypesCount: validated.seatTypes.length,
    })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[SeatConfig PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
