import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export async function syncSchedulesHelper({
  supabase,
  orgId,
  classId,
  schedule,
  roomName,
}: {
  supabase: any
  orgId: string
  classId: string
  schedule: { day: string; start_time: string; end_time: string }[]
  roomName?: string | null
}) {
  await supabase.from('schedules').delete().eq('class_id', classId)

  if (!schedule?.length) return

  let roomId: string | null = null
  if (roomName) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('org_id', orgId)
      .ilike('name', roomName)
    roomId = rooms?.[0]?.id || null
  }

  const payload = schedule.map((s) => ({
    org_id: orgId,
    class_id: classId,
    day_of_week: s.day,
    start_time: s.start_time,
    end_time: s.end_time,
    room_id: roomId,
  }))

  await supabase.from('schedules').insert(payload)
}
