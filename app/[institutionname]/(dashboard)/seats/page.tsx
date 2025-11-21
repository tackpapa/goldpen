'use client'



import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserCheck, UserX, Settings2, Armchair, Moon, DoorOpen, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Student } from '@/lib/types/database'
import { useAllSeatsRealtime } from '@/hooks/use-all-seats-realtime'
import { useSeatAssignmentsRealtime } from '@/hooks/use-seat-assignments-realtime'
import { createClient } from '@/lib/supabase/client'

// LiveScreen State Types
interface LiveScreenState {
  student_id: string
  seat_number: number
  date: string
  sleep_count: number
  is_out: boolean
  timer_running: boolean
  current_sleep_id?: string
  current_outing_id?: string
}

interface SleepRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  sleep_time: string
  wake_time?: string
  duration_minutes?: number
  status: 'sleeping' | 'awake'
}

interface OutingRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  outing_time: string
  return_time?: string
  duration_minutes?: number
  reason: string
  status: 'out' | 'returned'
}

interface CallRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  call_time: string
  acknowledged_time?: string
  message: string
  status: 'calling' | 'acknowledged'
}

// Types
interface Seat {
  id: string
  number: number
  student_id: string | null
  student_name: string | null
  status: 'checked_in' | 'checked_out' | 'vacant'
  type_name?: string
  check_in_time?: string // ISO string for check-in time
  session_start_time?: string // ISO string for session start
  allocated_minutes?: number // allocated usage time
  remaining_minutes?: number | null // student's remaining usage time (hours pass)
  pass_type?: 'hours' | 'days' | null // type of active pass
  remaining_days?: number | null // remaining days for days-based pass
}

interface SeatType {
  id: string
  startNumber: number
  endNumber: number
  typeName: string
}

// Grade options
const gradeOptions = [
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
]

// Student interface for local use
interface LocalStudent {
  id: string
  name: string
  grade: string
  school: string
}

// Initialize seats with some mock data
// Helper function to get live screen state from localStorage
const getLiveScreenState = (studentId: string, seatNumber: number): LiveScreenState | null => {
  if (typeof window === 'undefined') return null

  const today = new Date().toISOString().split('T')[0]
  const key = `livescreen-state-${studentId}-${seatNumber}`
  const data = localStorage.getItem(key)

  if (!data) return null

  try {
    const state = JSON.parse(data) as LiveScreenState
    // Only return state if it's from today
    if (state.date === today) {
      return state
    }
  } catch {
    return null
  }

  return null
}

// Helper function to get current sleep record
const getCurrentSleepRecord = (studentId: string, seatNumber: number): SleepRecord | null => {
  if (typeof window === 'undefined') return null

  const today = new Date().toISOString().split('T')[0]
  const key = `sleep-records-${studentId}-${seatNumber}`
  const data = localStorage.getItem(key)

  if (!data) return null

  try {
    const records = JSON.parse(data) as SleepRecord[]
    // Find the most recent sleeping record for today
    const currentSleep = records.find(
      r => r.date === today && r.status === 'sleeping'
    )
    return currentSleep || null
  } catch {
    return null
  }
}

// Helper function to get current outing record
const getCurrentOutingRecord = (studentId: string, seatNumber: number): OutingRecord | null => {
  if (typeof window === 'undefined') return null

  const today = new Date().toISOString().split('T')[0]
  const key = `outing-records-${studentId}-${seatNumber}`
  const data = localStorage.getItem(key)

  if (!data) return null

  try {
    const records = JSON.parse(data) as OutingRecord[]
    // Find the most recent outing record for today
    const currentOuting = records.find(
      r => r.date === today && r.status === 'out'
    )
    return currentOuting || null
  } catch {
    return null
  }
}

// Sleep Status Component - shows remaining time for sleeping students
function SleepStatus({
  sleepRecord,
  onSleepExpired
}: {
  sleepRecord: SleepRecord
  onSleepExpired?: (seatNumber: number, studentName: string) => void
}) {
  const [remaining, setRemaining] = useState('')
  const [isExpiring, setIsExpiring] = useState(false)
  const hasNotifiedRef = useRef(false)
  const onSleepExpiredRef = useRef(onSleepExpired)

  // Update ref when callback changes
  useEffect(() => {
    onSleepExpiredRef.current = onSleepExpired
  }, [onSleepExpired])

  useEffect(() => {
    // Reset notification flag when sleep record changes (including status change)
    hasNotifiedRef.current = false

    // Don't process if already awake
    if (sleepRecord.status !== 'sleeping') {
      setRemaining('')
      setIsExpiring(false)
      return
    }

    const calculateRemaining = () => {
      const now = Date.now()
      const sleepStart = new Date(sleepRecord.sleep_time).getTime()
      const elapsed = now - sleepStart
      const maxDuration = 15 * 60 * 1000 // 15 minutes in milliseconds
      const remainingMs = maxDuration - elapsed

      if (remainingMs <= 0) {
        setRemaining('시간 종료')
        setIsExpiring(true)

        // Trigger notification only once
        if (!hasNotifiedRef.current && onSleepExpiredRef.current) {
          hasNotifiedRef.current = true
          onSleepExpiredRef.current(sleepRecord.seat_number, '')
        }
        return
      }

      const minutes = Math.floor(remainingMs / (1000 * 60))
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000)

      setRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      setIsExpiring(remainingMs <= 30 * 1000) // Last 30 seconds
    }

    calculateRemaining()
    const interval = setInterval(calculateRemaining, 1000)

    return () => clearInterval(interval)
  }, [sleepRecord.sleep_time, sleepRecord.seat_number, sleepRecord.status])

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded",
      isExpiring ? "bg-red-100 text-red-700" : "bg-red-100 text-red-700"
    )}>
      <Moon className="h-3.5 w-3.5" />
      <span>잠자기 {remaining}</span>
    </div>
  )
}

// Outing Status Component - shows elapsed time for students who are out
function OutingStatus({ outingRecord }: { outingRecord: OutingRecord }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const calculateElapsed = () => {
      const now = Date.now()
      const outingStart = new Date(outingRecord.outing_time).getTime()
      const diff = now - outingStart

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setElapsed(`${hours}시간 ${minutes}분`)
      } else {
        setElapsed(`${minutes}분`)
      }
    }

    calculateElapsed()
    const interval = setInterval(calculateElapsed, 1000)

    return () => clearInterval(interval)
  }, [outingRecord.outing_time])

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-700">
      <DoorOpen className="h-3.5 w-3.5" />
      <span>외출 {elapsed}</span>
    </div>
  )
}

// Usage Time Status Component - shows remaining usage time
function UsageTimeStatus({
  sessionStartTime,
  remainingMinutes,
  onExpired,
}: {
  sessionStartTime: string
  remainingMinutes: number
  onExpired?: () => void
}) {
  const [remaining, setRemaining] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const hasNotifiedRef = useRef(false)
  const onExpiredRef = useRef(onExpired)

  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    hasNotifiedRef.current = false // Reset on mount

    const calculateRemaining = () => {
      const now = Date.now()
      const start = new Date(sessionStartTime).getTime()
      const elapsedMs = now - start
      const elapsedMinutes = elapsedMs / (1000 * 60)
      const remainingMs = (remainingMinutes - elapsedMinutes) * 60 * 1000

      if (remainingMs <= 0) {
        setRemaining('이용시간 끝')
        setIsExpired(true)

        if (!hasNotifiedRef.current && onExpiredRef.current) {
          hasNotifiedRef.current = true
          onExpiredRef.current()
        }
        return
      }

      const hours = Math.floor(remainingMs / (1000 * 60 * 60))
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setRemaining(`${hours}시간 ${minutes}분 남음`)
      } else {
        setRemaining(`${minutes}분 남음`)
      }
      setIsExpired(false)
    }

    calculateRemaining()
    const interval = setInterval(calculateRemaining, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [sessionStartTime, remainingMinutes])

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-red-600 text-white animate-pulse">
        ⏰ 이용시간 끝
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-orange-100 text-orange-700">
      ⏱️ {remaining}
    </div>
  )
}

// Elapsed Time Component
function ElapsedTime({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const calculateElapsed = () => {
      const now = Date.now()
      const checkIn = new Date(checkInTime).getTime()
      const diff = now - checkIn

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setElapsed(`${hours}시간 ${minutes}분`)
      } else if (minutes > 0) {
        setElapsed(`${minutes}분 ${seconds}초`)
      } else {
        setElapsed(`${seconds}초`)
      }
    }

    calculateElapsed()
    const interval = setInterval(calculateElapsed, 1000)

    return () => clearInterval(interval)
  }, [checkInTime])

  return (
    <div className="text-xs text-primary font-medium">
      ⏱️ {elapsed}
    </div>
  )
}

// Live Status Indicator - monitors real-time sleep/outing status from Supabase
function LiveStatusIndicator({
  studentId,
  seatNumber,
  studentName,
  sleepRecord,
  outingRecord,
  onSleepExpired
}: {
  studentId: string
  seatNumber: number
  studentName: string
  sleepRecord: SleepRecord | null
  outingRecord: OutingRecord | null
  onSleepExpired?: (seatNumber: number, studentName: string) => void
}) {
  // Show sleep status first (higher priority)
  if (sleepRecord) {
    return (
      <SleepStatus
        sleepRecord={sleepRecord}
        onSleepExpired={(seatNum) => onSleepExpired?.(seatNum, studentName)}
      />
    )
  }

  // Then show outing status
  if (outingRecord) {
    return <OutingStatus outingRecord={outingRecord} />
  }

  // No active status
  return null
}

// Seat Card Component - separated to properly use hooks
function SeatCard({
  seat,
  sleepRecord,
  outingRecord,
  getCardStyle,
  getStatusBadge,
  handleSeatClick,
  handleToggleAttendance,
  handleCallStudent,
  handleSleepExpired,
  handleUsageTimeExpired,
  students
}: {
  seat: any
  sleepRecord: SleepRecord | null
  outingRecord: OutingRecord | null
  getCardStyle: (status: string) => string
  getStatusBadge: (status: string) => JSX.Element
  handleSeatClick: (seat: any) => void
  handleToggleAttendance: (seatId: string) => void
  handleCallStudent: (seatNumber: number, studentId: string, studentName: string) => void
  handleSleepExpired: (seatNumber: number, studentName: string) => void
  handleUsageTimeExpired: (seatNumber: number, studentName: string) => void
  students: LocalStudent[]
}) {
  // Determine card style based on live status
  let cardStyle = getCardStyle(seat.status)
  if (seat.status === 'checked_in') {
    if (sleepRecord) {
      cardStyle = 'border-red-300 bg-red-50/50' // 잠자기 중
    } else if (outingRecord) {
      cardStyle = 'border-blue-300 bg-blue-50/50' // 외출 중
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        cardStyle
      )}
      onClick={() => handleSeatClick(seat)}
    >
      <CardContent className="p-4 space-y-3 flex flex-col h-full">
        {/* Seat Number and Type */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold">
              {seat.number}번
            </div>
            {seat.type_name && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {seat.type_name}
              </div>
            )}
          </div>
          {getStatusBadge(seat.status)}
        </div>

        {/* Student Info */}
        {seat.student_name ? (
          <>
            <div className="space-y-1 flex-grow">
              <div className="text-sm font-medium">{seat.student_name}</div>
              <div className="text-xs text-muted-foreground">
                {students.find(s => s.id === seat.student_id)?.grade}학년
              </div>


            {/* Live Status Indicator (Sleep/Outing) */}
            {seat.student_id && (
              <LiveStatusIndicator
                studentId={seat.student_id}
                seatNumber={seat.number}
                studentName={seat.student_name}
                sleepRecord={sleepRecord}
                outingRecord={outingRecord}
                onSleepExpired={handleSleepExpired}
              />
            )}

            {/* Usage Time Status */}
            {seat.status === 'checked_in' && seat.session_start_time && seat.remaining_minutes != null && seat.remaining_minutes > 0 && (
              <UsageTimeStatus
                sessionStartTime={seat.session_start_time}
                remainingMinutes={seat.remaining_minutes}
                onExpired={() => handleUsageTimeExpired(seat.number, seat.student_name)}
              />
            )}

            {/* Show expired badge if remaining_minutes is 0 (hours pass) */}
            {seat.pass_type === 'hours' && seat.remaining_minutes === 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-red-600 text-white">
                ⏰ 이용시간 끝
              </div>
            )}

            {/* Show remaining days for days-based pass */}
            {seat.pass_type === 'days' && seat.remaining_days != null && seat.remaining_days > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-blue-600 text-white">
                📅 {seat.remaining_days}일 남음
              </div>
            )}

            {/* Show remaining hours for hours-based pass (when not checked in) */}
            {seat.pass_type === 'hours' && seat.remaining_minutes != null && seat.remaining_minutes > 0 && seat.status !== 'checked_in' && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded bg-green-600 text-white">
                ⏱️ {Math.floor(seat.remaining_minutes / 60)}시간 {seat.remaining_minutes % 60}분 남음
              </div>
            )}

            {/* Elapsed Time (only show when checked in) */}
            {seat.status === 'checked_in' && seat.check_in_time && (
              <ElapsedTime checkInTime={seat.check_in_time} />
            )}
            </div>

            {/* Toggle Button */}
            {seat.status !== 'vacant' && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant={seat.status === 'checked_in' ? 'outline' : 'default'}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleAttendance(seat.id)
                  }}
                >
                  {seat.status === 'checked_in' ? '하원 처리' : '등원 처리'}
                </Button>
                {seat.status === 'checked_in' && seat.student_id && (
                  <Button
                    size="sm"
                    className="w-full bg-red-600 text-white hover:bg-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (seat.student_id && seat.student_name) {
                        handleCallStudent(seat.number, seat.student_id, seat.student_name)
                      }
                    }}
                  >
                    호출
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            배정된 학생 없음
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const initializeSeats = (totalSeats: number, seatTypes: SeatType[] = []): Seat[] => {
  const seats: Seat[] = []
  for (let i = 1; i <= totalSeats; i++) {
    // Seat assignments loaded from API
    const seatAssignments: Record<number, { student_id: string; student_name: string; status: 'checked_in' | 'checked_out'; check_in_time?: string }> = {}

    const assignment = seatAssignments[i]

    // Find seat type for this seat number
    const seatType = seatTypes.find(
      type => i >= type.startNumber && i <= type.endNumber
    )

    seats.push({
      id: `seat-${i}`,
      number: i,
      student_id: assignment?.student_id || null,
      student_name: assignment?.student_name || null,
      status: assignment?.status || 'vacant',
      type_name: seatType?.typeName,
      check_in_time: assignment?.check_in_time,
    })
  }
  return seats
}

export default function SeatsPage() {
  usePageAccess('seats')

  const params = useParams()
  const institutionName = params.institutionname as string
  const { toast } = useToast()
  const [totalSeats, setTotalSeats] = useState(20)
  const [seatTypes, setSeatTypes] = useState<SeatType[]>([])
  const [seats, setSeats] = useState<Seat[]>(initializeSeats(20, []))
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [tempTotalSeats, setTempTotalSeats] = useState(20)
  const [tempSeatTypes, setTempSeatTypes] = useState<SeatType[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  // New student registration state
  const [assignmentTab, setAssignmentTab] = useState<'existing' | 'new'>('existing')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentGrade, setNewStudentGrade] = useState('')
  const [newStudentSchool, setNewStudentSchool] = useState('')
  const [newStudentPhone, setNewStudentPhone] = useState('')

  // Usage time state (이용시간)
  const [newStudentUsageHours, setNewStudentUsageHours] = useState('0')
  const [newStudentUsageMinutes, setNewStudentUsageMinutes] = useState('0')

  // Sleep expiration alert state
  const [sleepAlertOpen, setSleepAlertOpen] = useState(false)
  const [sleepAlertInfo, setSleepAlertInfo] = useState<{ seatNumber: number; studentName: string } | null>(null)
  const [alarmInterval, setAlarmInterval] = useState<NodeJS.Timeout | null>(null)

  // Call student modal state
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callMessage, setCallMessage] = useState('카운터로 와주세요')
  const [callStudentInfo, setCallStudentInfo] = useState<{ seatNumber: number; studentId: string; studentName: string } | null>(null)

  // Track call records for each seat
  const [callRecords, setCallRecords] = useState<Map<number, CallRecord>>(new Map())

  // Manager call alert state
  const [managerCallAlert, setManagerCallAlert] = useState<{ seatNumber: number; studentName: string } | null>(null)

  // Usage time expiry alert state
  const [usageTimeAlertOpen, setUsageTimeAlertOpen] = useState(false)
  const [usageTimeAlertInfo, setUsageTimeAlertInfo] = useState<{ seatNumber: number; studentName: string } | null>(null)
  const [usageTimeAlarmInterval, setUsageTimeAlarmInterval] = useState<NodeJS.Timeout | null>(null)

  // URL copy state
  const [urlCopied, setUrlCopied] = useState(false)
  const [liveScreenUrl, setLiveScreenUrl] = useState('')

  // Students from API
  const [students, setStudents] = useState<LocalStudent[]>([])

  // Org ID for realtime subscription
  const [orgId, setOrgId] = useState<string | null>(null)

  // Realtime seat assignments subscription
  const { assignments: realtimeAssignments, loading: realtimeLoading } = useSeatAssignmentsRealtime(orgId)

  // orgId is now set from seat-config API response (see below)

  // Sync realtime assignments with seats state
  useEffect(() => {
    if (realtimeLoading || !realtimeAssignments) return

    setSeats((prevSeats) => {
      // Get all seat numbers that have assignments
      const assignedSeatNumbers = new Set(realtimeAssignments.keys())

      return prevSeats.map((seat) => {
        const assignment = realtimeAssignments.get(seat.number)
        if (assignment) {
          // Update seat with assignment data, but preserve pass info from initial API load
          return {
            ...seat,
            student_id: assignment.student_id,
            student_name: assignment.student_name,
            status: assignment.status,
            check_in_time: assignment.check_in_time || undefined,
            session_start_time: assignment.session_start_time || undefined,
            // Preserve pass info (realtime doesn't have it)
            // remaining_minutes, pass_type, remaining_days are kept from initial load
          }
        } else if (seat.student_id && !assignedSeatNumbers.has(seat.number)) {
          // Seat had assignment but now removed (deleted from DB)
          return {
            ...seat,
            student_id: null,
            student_name: null,
            status: 'vacant' as const,
            check_in_time: undefined,
          }
        }
        // Keep seat as is (vacant seats without changes)
        return seat
      })
    })
  }, [realtimeAssignments, realtimeLoading])

  // Fetch seat config and assignments on mount
  useEffect(() => {
    const fetchSeatConfigAndAssignments = async () => {
      try {
        // Fetch config and assignments in parallel
        const [configRes, assignmentsRes] = await Promise.all([
          fetch('/api/seat-config', { credentials: 'include' }),
          fetch('/api/seat-assignments', { credentials: 'include' }),
        ])

        const configData = await configRes.json()
        const assignmentsData = await assignmentsRes.json()

        let total = 20
        let types: SeatType[] = []

        if (configRes.ok && configData.totalSeats) {
          total = configData.totalSeats
          types = (configData.seatTypes || []).map((t: any) => ({
            id: t.id || `type-${Date.now()}-${Math.random()}`,
            startNumber: t.startNumber,
            endNumber: t.endNumber,
            typeName: t.typeName,
          }))
          setTotalSeats(total)
          setSeatTypes(types)

          // Set orgId for realtime subscription
          if (configData.orgId) {
            setOrgId(configData.orgId)
          }
        }

        // Initialize seats with assignments
        const initialSeats = initializeSeats(total, types)

        if (assignmentsRes.ok && assignmentsData.assignments) {
          const assignments = assignmentsData.assignments as Array<{
            seatNumber: number
            studentId: string
            studentName: string | null
            studentGrade: string | null
            status: string
            checkInTime: string | null
            sessionStartTime: string | null
            remainingMinutes: number | null
            passType: 'hours' | 'days' | null
            remainingDays: number | null
          }>

          // Apply assignments to seats
          console.log('[Seats] Assignments from API:', assignments)
          assignments.forEach(assignment => {
            const seatIndex = initialSeats.findIndex(s => s.number === assignment.seatNumber)
            if (seatIndex !== -1) {
              initialSeats[seatIndex] = {
                ...initialSeats[seatIndex],
                student_id: assignment.studentId,
                student_name: assignment.studentName,
                status: assignment.status as 'checked_in' | 'checked_out' | 'vacant',
                check_in_time: assignment.checkInTime || undefined,
                session_start_time: assignment.sessionStartTime || undefined,
                remaining_minutes: assignment.remainingMinutes ?? null,
                pass_type: assignment.passType ?? null,
                remaining_days: assignment.remainingDays ?? null,
              }
            }
          })
        }

        setSeats(initialSeats)
      } catch {
        console.error('Failed to fetch seat config/assignments')
      }
    }
    fetchSeatConfigAndAssignments()
  }, [])

  // Fetch students from API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students', { credentials: 'include' })
        const data = await response.json() as { students?: LocalStudent[]; error?: string }
        if (response.ok && data.students) {
          setStudents(data.students)
        }
      } catch {
        console.error('Failed to fetch students')
      }
    }
    fetchStudents()
  }, [])

  // Filter students by search query
  const filteredStudents = students.filter(student =>
    studentSearchQuery === '' ||
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    `${student.grade}학년`.includes(studentSearchQuery)
  )

  // Get assigned student IDs
  const assignedStudentIds = new Set(
    seats.filter(s => s.student_id).map(s => s.student_id)
  )

  // Filter available students (not already assigned)
  const availableStudents = filteredStudents.filter(
    student => !assignedStudentIds.has(student.id) || student.id === selectedSeat?.student_id
  )

  // Statistics
  const vacantSeats = seats.filter(s => s.status === 'vacant').length
  const checkedInSeats = seats.filter(s => s.status === 'checked_in').length
  const checkedOutSeats = seats.filter(s => s.status === 'checked_out').length

  // Realtime status for all seats (optimized: 2 channels for all seats)
  const allStudentIds = seats.filter(s => s.student_id).map(s => s.student_id!)
  const { sleepRecords, outingRecords } = useAllSeatsRealtime(allStudentIds)

  // Subscribe to call_records
  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // Initial fetch
    const fetchCallRecords = async () => {
      const { data, error } = await supabase
        .from('call_records')
        .select('*')
        .eq('date', today)
        .in('status', ['calling', 'acknowledged'])

      if (error) {
        console.error('Error fetching call records:', error)
        return
      }

      if (data) {
        const newMap = new Map<number, CallRecord>()
        data.forEach((record: CallRecord) => {
          newMap.set(record.seat_number, record)
        })
        setCallRecords(newMap)
      }
    }

    fetchCallRecords()

    // Subscribe to changes
    const channel = supabase
      .channel('call-records-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_records',
          filter: `date=eq.${today}`,
        },
        (payload) => {
          console.log('Call record change (seats page):', payload)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as CallRecord
            setCallRecords((prev) => {
              const newMap = new Map(prev)
              if (record.status === 'calling' || record.status === 'acknowledged') {
                newMap.set(record.seat_number, record)
              } else {
                newMap.delete(record.seat_number)
              }
              return newMap
            })
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as CallRecord
            setCallRecords((prev) => {
              const newMap = new Map(prev)
              newMap.delete(record.seat_number)
              return newMap
            })
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Subscribe to manager_calls
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to changes
    const channel = supabase
      .channel('manager-calls-all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'manager_calls',
        },
        (payload) => {
          console.log('📞 [Manager Call] Received:', payload)
          const record = payload.new as any
          setManagerCallAlert({
            seatNumber: record.seat_number,
            studentName: record.student_name || '학생',
          })
        }
      )
      .subscribe((status) => {
        console.log('🔌 [Manager Call] Subscription status:', status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Play alarm when manager call is received
  useEffect(() => {
    if (!managerCallAlert) return

    const interval = setInterval(() => {
      playAlarmBeep()
    }, 2000) // Beep every 2 seconds

    return () => {
      clearInterval(interval)
    }
  }, [managerCallAlert])

  // Play alarm beep
  const playAlarmBeep = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()

      // First beep
      const oscillator1 = context.createOscillator()
      const gainNode1 = context.createGain()

      oscillator1.connect(gainNode1)
      gainNode1.connect(context.destination)

      oscillator1.frequency.value = 800
      oscillator1.type = 'sine'
      gainNode1.gain.setValueAtTime(0.3, context.currentTime)

      oscillator1.start(context.currentTime)
      oscillator1.stop(context.currentTime + 0.2)

      // Second beep after delay
      setTimeout(() => {
        const oscillator2 = context.createOscillator()
        const gainNode2 = context.createGain()

        oscillator2.connect(gainNode2)
        gainNode2.connect(context.destination)

        oscillator2.frequency.value = 800
        oscillator2.type = 'sine'
        gainNode2.gain.setValueAtTime(0.3, context.currentTime)

        oscillator2.start(context.currentTime)
        oscillator2.stop(context.currentTime + 0.2)
      }, 300)
    } catch (err) {
      console.error('Failed to play beep:', err)
    }
  }

  // Handle sleep expiration notification
  const handleSleepExpired = (seatNumber: number, studentName: string) => {
    // Play alarm immediately
    playAlarmBeep()

    // Continue playing alarm every 2 seconds
    const interval = setInterval(() => {
      playAlarmBeep()
    }, 2000)

    setAlarmInterval(interval)

    // Show modal
    setSleepAlertInfo({ seatNumber, studentName })
    setSleepAlertOpen(true)
  }

  // Handle usage time expiration notification
  const handleUsageTimeExpired = (seatNumber: number, studentName: string) => {
    // Play alarm immediately
    playAlarmBeep()

    // Continue playing alarm every 2 seconds
    const interval = setInterval(() => {
      playAlarmBeep()
    }, 2000)

    setUsageTimeAlarmInterval(interval)

    // Show modal
    setUsageTimeAlertInfo({ seatNumber, studentName })
    setUsageTimeAlertOpen(true)
  }

  // Handle closing usage time alert
  const handleCloseUsageTimeAlert = () => {
    // Stop alarm
    if (usageTimeAlarmInterval) {
      clearInterval(usageTimeAlarmInterval)
      setUsageTimeAlarmInterval(null)
    }

    // Close modal
    setUsageTimeAlertOpen(false)
    setUsageTimeAlertInfo(null)
  }

  // Handle closing sleep alert
  const handleCloseSleepAlert = async () => {
    // Stop alarm
    if (alarmInterval) {
      clearInterval(alarmInterval)
      setAlarmInterval(null)
    }

    // Update sleep record status to 'awake' in database
    if (sleepAlertInfo) {
      try {
        const supabase = createClient()
        const today = new Date().toISOString().split('T')[0]

        const { error } = await supabase
          .from('sleep_records')
          .update({
            wake_time: new Date().toISOString(),
            status: 'awake'
          })
          .eq('seat_number', sleepAlertInfo.seatNumber)
          .eq('date', today)
          .eq('status', 'sleeping')

        if (error) {
          console.error('Error updating sleep record:', error)
        }
      } catch (error) {
        console.error('Error waking student:', error)
      }
    }

    // Close modal
    setSleepAlertOpen(false)
  }

  // Set liveScreenUrl on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined' && institutionName) {
      setLiveScreenUrl(`${window.location.origin}/${institutionName}/livescreen/1`)
    }
  }, [institutionName])

  // Handle copying livescreen URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(liveScreenUrl)
      setUrlCopied(true)
      toast({
        title: 'URL 복사 완료',
        description: 'LiveScreen URL이 클립보드에 복사되었습니다.',
      })
      setTimeout(() => setUrlCopied(false), 2000)
    } catch (error) {
      toast({
        title: '복사 실패',
        description: 'URL 복사에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  // Open call modal
  const handleCallStudent = (seatNumber: number, studentId: string, studentName: string) => {
    setCallStudentInfo({ seatNumber, studentId, studentName })
    setCallMessage('카운터로 와주세요')
    setCallModalOpen(true)
  }

  // Send call to student
  const handleSendCall = async () => {
    if (!callStudentInfo) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const supabase = createClient()

      const { error } = await supabase
        .from('call_records')
        .insert({
          student_id: callStudentInfo.studentId,
          seat_number: callStudentInfo.seatNumber,
          date: today,
          call_time: new Date().toISOString(),
          message: callMessage,
          status: 'calling',
        })

      if (error) throw error

      setCallModalOpen(false)
      toast({
        title: '학생 호출',
        description: `${callStudentInfo.seatNumber}번 ${callStudentInfo.studentName} 학생에게 호출을 보냈습니다.`,
      })
    } catch (error) {
      console.error('Error calling student:', error)
      toast({
        title: '호출 실패',
        description: '학생 호출에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  // Clear acknowledged call (to allow new call)
  const handleClearAcknowledgedCall = async (seatNumber: number) => {
    const callRecord = callRecords.get(seatNumber)
    if (!callRecord) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('call_records')
        .delete()
        .eq('id', callRecord.id)

      if (error) throw error

      // Immediately remove from local state
      setCallRecords((prev) => {
        const newMap = new Map(prev)
        newMap.delete(seatNumber)
        return newMap
      })

      toast({
        title: '호출 확인 완료',
        description: '새로운 호출을 보낼 수 있습니다.',
      })
    } catch (error) {
      console.error('Error clearing call record:', error)
      toast({
        title: '오류',
        description: '호출 기록 삭제에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleConfigureTotalSeats = async () => {
    if (tempTotalSeats < 1 || tempTotalSeats > 100) {
      toast({
        title: '잘못된 좌석 수',
        description: '좌석 수는 1~100개 사이여야 합니다.',
        variant: 'destructive',
      })
      return
    }

    // Validate seat types
    for (const type of tempSeatTypes) {
      if (!type.typeName.trim()) {
        toast({
          title: '타입 이름 오류',
          description: '모든 타입 이름을 입력해주세요.',
          variant: 'destructive',
        })
        return
      }
      if (type.startNumber < 1 || type.endNumber > tempTotalSeats || type.startNumber > type.endNumber) {
        toast({
          title: '좌석 범위 오류',
          description: '좌석 범위가 올바르지 않습니다.',
          variant: 'destructive',
        })
        return
      }
    }

    // Save to API
    try {
      const response = await fetch('/api/seat-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          totalSeats: tempTotalSeats,
          seatTypes: tempSeatTypes.map(t => ({
            startNumber: t.startNumber,
            endNumber: t.endNumber,
            typeName: t.typeName,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '저장 실패',
          description: data.error || '좌석 설정 저장에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      // Update local state after successful save
      setTotalSeats(tempTotalSeats)
      setSeatTypes(tempSeatTypes)
      setSeats(initializeSeats(tempTotalSeats, tempSeatTypes))
      setIsConfigDialogOpen(false)

      toast({
        title: '좌석 설정 완료',
        description: `총 ${tempTotalSeats}개의 좌석이 설정되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to save seat config:', error)
      toast({
        title: '저장 실패',
        description: '네트워크 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleAddSeatType = () => {
    const lastType = tempSeatTypes[tempSeatTypes.length - 1]
    const startNumber = lastType ? lastType.endNumber + 1 : 1
    const endNumber = Math.min(startNumber + 9, tempTotalSeats)

    setTempSeatTypes([
      ...tempSeatTypes,
      {
        id: `type-${Date.now()}`,
        startNumber,
        endNumber,
        typeName: '',
      },
    ])
  }

  const handleRemoveSeatType = (id: string) => {
    setTempSeatTypes(tempSeatTypes.filter(type => type.id !== id))
  }

  const handleUpdateSeatType = (id: string, field: keyof SeatType, value: string | number) => {
    setTempSeatTypes(
      tempSeatTypes.map(type =>
        type.id === id ? { ...type, [field]: value } : type
      )
    )
  }

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat)
    setSelectedStudentId(seat.student_id || '')
    setStudentSearchQuery(seat.student_name || '')
    setAssignmentTab('existing')
    setNewStudentName('')
    setNewStudentGrade('')
    setNewStudentSchool('')
    setIsAssignDialogOpen(true)
  }

  const handleAssignStudent = async () => {
    if (!selectedSeat) return

    if (assignmentTab === 'existing') {
      // Existing student assignment
      const student = students.find(s => s.id === selectedStudentId)

      if (!selectedStudentId || !student) {
        toast({
          title: '학생 미선택',
          description: '배정할 학생을 선택해주세요.',
          variant: 'destructive',
        })
        return
      }

      try {
        const response = await fetch('/api/seat-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            seatNumber: selectedSeat.number,
            studentId: selectedStudentId,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          toast({
            title: '배정 실패',
            description: data.error || '좌석 배정에 실패했습니다.',
            variant: 'destructive',
          })
          return
        }

        const updatedSeats = seats.map(seat =>
          seat.id === selectedSeat.id
            ? {
                ...seat,
                student_id: selectedStudentId,
                student_name: student.name,
                status: 'checked_out' as const,
              }
            : seat
        )

        setSeats(updatedSeats)
        setIsAssignDialogOpen(false)

        toast({
          title: '좌석 배정 완료',
          description: `${selectedSeat.number}번 좌석에 ${student.name} 학생이 배정되었습니다.`,
        })
      } catch (error) {
        console.error('Failed to assign student:', error)
        toast({
          title: '배정 실패',
          description: '네트워크 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } else {
      // New student registration and assignment
      if (!newStudentName.trim() || !newStudentGrade || !newStudentSchool.trim() || !newStudentPhone.trim()) {
        toast({
          title: '정보 입력 필요',
          description: '학생 이름, 학년, 학교, 전화번호를 모두 입력해주세요.',
          variant: 'destructive',
        })
        return
      }

      // Calculate total usage minutes
      const usageHours = parseInt(newStudentUsageHours) || 0
      const usageMinutes = parseInt(newStudentUsageMinutes) || 0
      const totalUsageMinutes = usageHours * 60 + usageMinutes

      try {
        // Create student via API
        const response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newStudentName.trim(),
            grade: newStudentGrade,
            school: newStudentSchool.trim(),
            phone: newStudentPhone.trim(),
            remaining_minutes: totalUsageMinutes > 0 ? totalUsageMinutes : null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          toast({
            title: '등록 실패',
            description: data.error || '학생 등록에 실패했습니다.',
            variant: 'destructive',
          })
          return
        }

        const newStudentId = data.student?.id || data.id

        // Add to students state
        setStudents(prev => [...prev, {
          id: newStudentId,
          name: newStudentName.trim(),
          grade: newStudentGrade,
          school: newStudentSchool.trim(),
        }])

        // Assign to seat with usage time
        const assignResponse = await fetch('/api/seat-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            seatNumber: selectedSeat.number,
            studentId: newStudentId,
            allocatedMinutes: totalUsageMinutes > 0 ? totalUsageMinutes : null,
          }),
        })

        const assignData = await assignResponse.json()

        if (!assignResponse.ok) {
          toast({
            title: '배정 실패',
            description: assignData.error || '좌석 배정에 실패했습니다.',
            variant: 'destructive',
          })
          return
        }

        // Update local seats state
        const updatedSeats = seats.map(seat =>
          seat.id === selectedSeat.id
            ? {
                ...seat,
                student_id: newStudentId,
                student_name: newStudentName.trim(),
                status: 'checked_out' as const,
              }
            : seat
        )

        setSeats(updatedSeats)
        setIsAssignDialogOpen(false)

        toast({
          title: '학생 등록 및 배정 완료',
          description: `${newStudentName} 학생이 ${selectedSeat.number}번 좌석에 배정되었습니다.${totalUsageMinutes > 0 ? ` (이용시간: ${usageHours}시간 ${usageMinutes}분)` : ''}`,
        })

        // Reset form
        setNewStudentName('')
        setNewStudentGrade('')
        setNewStudentSchool('')
        setNewStudentPhone('')
        setNewStudentUsageHours('0')
        setNewStudentUsageMinutes('0')
      } catch (error) {
        console.error('Failed to create student:', error)
        toast({
          title: '등록 실패',
          description: '네트워크 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleRemoveStudent = async () => {
    if (!selectedSeat) return

    try {
      const response = await fetch('/api/seat-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seatNumber: selectedSeat.number,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '해제 실패',
          description: data.error || '배정 해제에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      const updatedSeats = seats.map(seat =>
        seat.id === selectedSeat.id
          ? {
              ...seat,
              student_id: null,
              student_name: null,
              status: 'vacant' as const,
            }
          : seat
      )

      setSeats(updatedSeats)
      setIsAssignDialogOpen(false)

      toast({
        title: '좌석 배정 해제',
        description: `${selectedSeat.number}번 좌석 배정이 해제되었습니다.`,
      })
    } catch (error) {
      console.error('Failed to remove student:', error)
      toast({
        title: '해제 실패',
        description: '네트워크 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleAttendance = async (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    if (!seat || !seat.student_id) return

    const newStatus = seat.status === 'checked_in' ? 'checked_out' : 'checked_in'

    try {
      const response = await fetch('/api/seat-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          seatNumber: seat.number,
          status: newStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: '상태 변경 실패',
          description: data.error || '출결 상태 변경에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      const updatedSeats = seats.map(s => {
        if (s.id === seatId && s.student_id) {
          return {
            ...s,
            status: newStatus as Seat['status'],
            check_in_time: newStatus === 'checked_in' ? new Date().toISOString() : undefined
          }
        }
        return s
      })

      setSeats(updatedSeats)

      toast({
        title: '출결 상태 변경',
        description: `${seat.number}번 좌석 - ${seat.student_name} (${newStatus === 'checked_in' ? '등원' : '하원'})`,
      })
    } catch (error) {
      console.error('Failed to toggle attendance:', error)
      toast({
        title: '상태 변경 실패',
        description: '네트워크 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: Seat['status']) => {
    switch (status) {
      case 'checked_in':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <UserCheck className="mr-1 h-3 w-3" />
            등원
          </Badge>
        )
      case 'checked_out':
        return (
          <Badge variant="secondary" className="bg-gray-200 hover:bg-gray-300">
            <UserX className="mr-1 h-3 w-3" />
            하원
          </Badge>
        )
      case 'vacant':
        return (
          <Badge variant="outline">
            미배정
          </Badge>
        )
    }
  }

  const getCardStyle = (status: Seat['status']) => {
    switch (status) {
      case 'checked_in':
        return 'border-green-300 bg-green-50/50'
      case 'checked_out':
        return 'border-gray-300 bg-gray-50/50'
      case 'vacant':
        return 'border-dashed border-gray-300 bg-muted/20'
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">독서실 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            독서실 좌석 배정 및 출결 상태를 관리합니다
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* LiveScreen URL */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
            <span className="text-sm text-muted-foreground hidden md:inline">학생 화면:</span>
            <code className="text-xs sm:text-sm font-mono bg-background px-2 py-1 rounded border">
              {liveScreenUrl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyUrl}
              className="h-7 w-7 p-0"
            >
              {urlCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Button variant="outline" onClick={() => {
            setTempTotalSeats(totalSeats)
            setTempSeatTypes(seatTypes)
            setIsConfigDialogOpen(true)
          }} className="w-full sm:w-auto">
            <Settings2 className="mr-2 h-4 w-4" />
            좌석 설정
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 좌석</CardTitle>
            <Armchair className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSeats}개</div>
            <p className="text-xs text-muted-foreground">독서실 전체</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등원 (공부 중)</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{checkedInSeats}명</div>
            <p className="text-xs text-muted-foreground">현재 자리에 있음</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">하원 (자리 비움)</CardTitle>
            <UserX className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{checkedOutSeats}명</div>
            <p className="text-xs text-muted-foreground">자리 비어있음</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미배정</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vacantSeats}개</div>
            <p className="text-xs text-muted-foreground">배정 가능 좌석</p>
          </CardContent>
        </Card>
      </div>

      {/* Seats Grid */}
      <Card>
        <CardHeader>
          <CardTitle>좌석 배치도</CardTitle>
          <CardDescription>
            좌석을 클릭하여 학생을 배정하거나 출결 상태를 변경하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seats.map((seat) => (
              <SeatCard
                key={seat.id}
                seat={seat}
                sleepRecord={seat.student_id ? sleepRecords.get(seat.student_id) || null : null}
                outingRecord={seat.student_id ? outingRecords.get(seat.student_id) || null : null}
                getCardStyle={getCardStyle}
                getStatusBadge={getStatusBadge}
                handleSeatClick={handleSeatClick}
                handleToggleAttendance={handleToggleAttendance}
                handleCallStudent={handleCallStudent}
                handleSleepExpired={handleSleepExpired}
                handleUsageTimeExpired={handleUsageTimeExpired}
                students={students}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configure Total Seats Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>좌석 수 설정</DialogTitle>
            <DialogDescription>
              독서실 전체 좌석 개수와 타입을 설정합니다 (1~100개)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="total-seats">좌석 개수</Label>
              <Input
                id="total-seats"
                type="number"
                min={1}
                max={100}
                value={tempTotalSeats}
                onChange={(e) => setTempTotalSeats(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ 좌석 수를 변경하면 기존 배정 정보가 초기화됩니다
              </p>
            </div>

            {/* Seat Types Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>좌석 타입 설정 (선택사항)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSeatType}
                >
                  타입 추가
                </Button>
              </div>

              {tempSeatTypes.length > 0 && (
                <div className="space-y-3 border rounded-lg p-3">
                  {tempSeatTypes.map((type, index) => (
                    <div key={type.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">시작 번호</Label>
                          <Input
                            type="number"
                            min={1}
                            max={tempTotalSeats}
                            value={type.startNumber}
                            onChange={(e) =>
                              handleUpdateSeatType(type.id, 'startNumber', parseInt(e.target.value) || 1)
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">종료 번호</Label>
                          <Input
                            type="number"
                            min={1}
                            max={tempTotalSeats}
                            value={type.endNumber}
                            onChange={(e) =>
                              handleUpdateSeatType(type.id, 'endNumber', parseInt(e.target.value) || 1)
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">타입 이름</Label>
                          <Input
                            type="text"
                            placeholder="예: A구역"
                            value={type.typeName}
                            onChange={(e) =>
                              handleUpdateSeatType(type.id, 'typeName', e.target.value)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSeatType(type.id)}
                        className="h-8 w-8 p-0 mt-5"
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                예: 1~10번 "A구역", 11~20번 "B구역"
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfigureTotalSeats}>
              설정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Student Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSeat?.number}번 좌석 관리</DialogTitle>
            <DialogDescription>
              {selectedSeat?.student_name
                ? `현재 배정: ${selectedSeat.student_name}`
                : '학생을 선택하거나 새로 등록하여 좌석을 배정하세요'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={assignmentTab} onValueChange={(v) => setAssignmentTab(v as 'existing' | 'new')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">기존 학생 선택</TabsTrigger>
              <TabsTrigger value="new">신규 학생 등록</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-search">학생 검색</Label>
                <Input
                  id="student-search"
                  placeholder="이름 또는 학년으로 검색..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>학생 선택</Label>
                <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                  {availableStudents.length > 0 ? (
                    availableStudents.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => {
                          setSelectedStudentId(student.id)
                          setStudentSearchQuery(`${student.grade}학년 ${student.name}`)
                        }}
                        className={cn(
                          "p-2 rounded cursor-pointer hover:bg-muted transition-colors text-sm",
                          selectedStudentId === student.id && "bg-primary text-primary-foreground"
                        )}
                      >
                        {student.grade}학년 {student.name}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      {filteredStudents.length === 0
                        ? '검색 결과가 없습니다'
                        : '배정 가능한 학생이 없습니다 (모두 배정됨)'}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-student-name">학생 이름 *</Label>
                <Input
                  id="new-student-name"
                  placeholder="예: 홍길동"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-student-grade">학년 *</Label>
                <Select value={newStudentGrade} onValueChange={setNewStudentGrade}>
                  <SelectTrigger id="new-student-grade">
                    <SelectValue placeholder="학년을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-student-school">학교 *</Label>
                <Input
                  id="new-student-school"
                  placeholder="예: 서울중학교"
                  value={newStudentSchool}
                  onChange={(e) => setNewStudentSchool(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-student-phone">전화번호 *</Label>
                <Input
                  id="new-student-phone"
                  placeholder="예: 010-1234-5678"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                />
              </div>

              {/* 이용시간 설정 */}
              <div className="space-y-2">
                <Label>이용시간 설정 (선택)</Label>
                <div className="flex gap-2 items-center">
                  <Select value={newStudentUsageHours} onValueChange={setNewStudentUsageHours}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="시간" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i}시간
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newStudentUsageMinutes} onValueChange={setNewStudentUsageMinutes}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="분" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 30].map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m}분
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  이용시간을 설정하면 하원 시 자동으로 차감됩니다
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                💡 신규 학생을 등록하고 바로 좌석에 배정합니다
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedSeat?.student_id && assignmentTab === 'existing' && (
              <Button variant="destructive" onClick={handleRemoveStudent} className="sm:mr-auto">
                배정 해제
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAssignStudent}>
              {assignmentTab === 'new'
                ? '등록 및 배정'
                : selectedSeat?.student_id ? '변경' : '배정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sleep Expiration Alert Dialog */}
      <Dialog open={sleepAlertOpen} onOpenChange={(open) => {
        if (!open) handleCloseSleepAlert()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600">⏰ 잠자기 시간 종료</DialogTitle>
            <DialogDescription asChild className="text-lg pt-4">
              <div>
                {sleepAlertInfo && (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      {sleepAlertInfo.seatNumber}번 학생 <span className="text-primary">{sleepAlertInfo.studentName}</span> 깨워주세요
                    </p>
                    <p className="text-sm text-muted-foreground">
                      15분 잠자기 시간이 종료되었습니다.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseSleepAlert} className="w-full">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Time Expiration Alert Dialog */}
      <Dialog open={usageTimeAlertOpen} onOpenChange={(open) => {
        if (!open) handleCloseUsageTimeAlert()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600">⏰ 이용시간 종료</DialogTitle>
            <DialogDescription asChild className="text-lg pt-4">
              <div>
                {usageTimeAlertInfo && (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">
                      {usageTimeAlertInfo.seatNumber}번 좌석 <span className="text-primary">{usageTimeAlertInfo.studentName}</span> 학생
                    </p>
                    <p className="text-sm text-muted-foreground">
                      이용시간이 모두 소진되었습니다.
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseUsageTimeAlert} className="w-full">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Student Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>학생 호출</DialogTitle>
            <DialogDescription>
              {callStudentInfo && (
                <span>
                  {callStudentInfo.seatNumber}번 {callStudentInfo.studentName} 학생에게 보낼 메시지를 입력하세요
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="call-message">메시지</Label>
              <Input
                id="call-message"
                value={callMessage}
                onChange={(e) => setCallMessage(e.target.value)}
                placeholder="카운터로 와주세요"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSendCall}>
              호출하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager Call Alert - Full Screen Red Overlay */}
      {managerCallAlert && (
        <div className="fixed inset-0 z-50 bg-red-600 flex flex-col items-center justify-center">
          <div className="text-white text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold animate-pulse">
                매니저 호출
              </h1>
              <p className="text-3xl md:text-5xl font-semibold">
                {managerCallAlert.seatNumber}번 {managerCallAlert.studentName} 학생이 호출했습니다
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={async () => {
                // Mark as acknowledged in database
                try {
                  const supabase = createClient()
                  const today = new Date().toISOString().split('T')[0]

                  const { error } = await supabase
                    .from('manager_calls')
                    .delete()
                    .eq('seat_number', managerCallAlert.seatNumber)
                    .eq('date', today)
                    .eq('status', 'calling')

                  if (error) throw error

                  setManagerCallAlert(null)

                  toast({
                    title: '호출 확인',
                    description: '매니저 호출이 확인되었습니다.',
                  })
                } catch (error) {
                  console.error('Error acknowledging manager call:', error)
                  toast({
                    title: '오류',
                    description: '호출 확인에 실패했습니다.',
                    variant: 'destructive',
                  })
                }
              }}
              className="text-2xl px-12 py-8 mt-8"
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
