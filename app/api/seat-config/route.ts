import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
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
    const isDev = process.env.NODE_ENV !== 'production'
    const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const { searchParams } = new URL(request.url)
    const serviceParam = searchParams.get('service')
    // orgSlug 파라미터 지원 (프로덕션 대시보드용)
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug || (isDev && serviceParam === null)

    // 인증 사용자 org 혹은 service role 시 org를 쿼리 파라미터로 받기
    let orgId: string | null = null
    const orgParam = searchParams.get('orgId')

    // 먼저 인증된 클라이언트 생성 시도
    let supabase: any = await createAuthenticatedClient(request)

    // orgSlug가 제공된 경우 (프로덕션 대시보드) - organizations 테이블에서 org_id 조회
    if (orgSlug && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (orgError || !org) {
        console.error('[SeatConfig GET] Organization not found for slug:', orgSlug)
        return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = org.id
    } else if (orgParam) {
      orgId = orgParam
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      // 개발 모드에서는 인증이 없을 때 서비스 롤 + demo org로 폴백
      if ((!user || authError) && allowService && supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any
        orgId = demoOrgId
      } else {
        if (authError || !user) {
          // 인증 실패 시 기본값 반환 (새로 가입한 사용자도 페이지 로드 가능)
          return Response.json({
            totalSeats: 20,
            seatTypes: [],
            orgId: null,
            note: '인증이 필요합니다. 로그인 후 좌석 설정을 저장할 수 있습니다.',
          })
        }
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .single()

        if (profileError || !userProfile) {
          // 프로필을 찾지 못해도 기본값 반환
          return Response.json({
            totalSeats: 20,
            seatTypes: [],
            orgId: null,
            note: '사용자 프로필을 찾을 수 없습니다.',
          })
        }
        orgId = userProfile.org_id
      }
    }
    if (!orgId) return Response.json({ totalSeats: 20, seatTypes: [], orgId: null })

    // Get seat config
    const { data: seatConfig, error: configError } = await supabase
      .from('seat_configs')
      .select('*')
      .eq('org_id', orgId)
      .single()

    // Get seat types
    const { data: seatTypes, error: typesError } = await supabase
      .from('seat_types')
      .select('*')
      .eq('org_id', orgId)
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
      orgId,
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
