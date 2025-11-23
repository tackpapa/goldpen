'use client'

export const runtime = 'edge'


import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Cloud, CloudRain, Sun, Unlock, Maximize2, Clock, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  name: string
  logo_url: string | null
}

export default function LiveAttendancePage() {
  const params = useParams()
  const institutionName = params.institutionname as string

  const [mounted, setMounted] = useState(false)
  const [organization, setOrganization] = useState<Organization>({
    name: params.institutionname as string,
    logo_url: null,
  })
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [temperature, setTemperature] = useState('--°')
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('cloudy')
  const [weatherDescription, setWeatherDescription] = useState('날씨 정보 로딩 중...')
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [audioAllowed, setAudioAllowed] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeName, setWelcomeName] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // 풀스크린 프롬프트 제거
  // const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)

  // Track attendance status: { studentId: 'checked_in' | 'checked_out' }
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'checked_in' | 'checked_out'>>({})
  const [seatAssignments, setSeatAssignments] = useState<Array<{ seatNumber: number; studentId: string; studentCode: string; studentName: string; status: string; sessionStartTime?: string; remainingMinutes?: number }>>([])
  const [isLoading, setIsLoading] = useState(false)

  // Usage time expired alerts
  // 사용시간 만료 모달 제거
  // const [usageTimeExpiredOpen, setUsageTimeExpiredOpen] = useState(false)
  // const [expiredStudentInfo, setExpiredStudentInfo] = useState<{ seatNumber: number; studentName: string } | null>(null)
  // const [usageAlarmInterval, setUsageAlarmInterval] = useState<NodeJS.Timeout | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)

  // Alarm sound 제거
  const playAlarmBeep = useCallback(() => {}, [])

  // Fix hydration error by only rendering time on client
  useEffect(() => {
    setMounted(true)
    updateDateTime()
    const timer = setInterval(updateDateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Detect iOS device and mobile/tablet on mount (client-side only)
  useEffect(() => {
    const checkIsIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOSDevice(checkIsIOS)
  }, [])

  // Check if device is mobile or tablet (not PC)
  const isMobileOrTablet = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent)
  }

  // 3초마다 풀스크린 상태 체크해서 모달 표시 (iOS만)
  useEffect(() => {
    if (!isIOSDevice) return

    return () => {}
  }, [isIOSDevice])

  // Auto-enter fullscreen every 2 seconds if not in fullscreen (Mobile/Tablet only, excluding iOS)
  useEffect(() => {
    // iOS/iPad는 모달로 처리하므로 자동 진입 건너뜀
    if (isIOSDevice) return

    // PC는 자동 풀스크린 진입 안 함
    if (!isMobileOrTablet()) return

    const checkAndEnterFullscreen = async () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      if (!isInFullscreen && containerRef.current) {
        try {
          const element = containerRef.current as any
          if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen()
          }
        } catch (error) {
          // Silently fail - requires user interaction
        }
      }
    }

    checkAndEnterFullscreen()
    const interval = setInterval(checkAndEnterFullscreen, 2000)

    return () => clearInterval(interval)
  }, [isIOSDevice])

  // 🚀 사용자 터치/클릭 시 풀스크린 재진입 시도 (Mobile/Tablet only)
  useEffect(() => {
    if (isIOSDevice || !isMobileOrTablet()) return

    const handleUserInteraction = async () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      // 풀스크린이 아닐 때만 재진입 시도
      if (!isInFullscreen && containerRef.current) {
        try {
          const element = containerRef.current as any
          if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen()
          }
        } catch (error) {
          // Silently fail
        }
      }
    }

    // 터치와 클릭 이벤트 모두 감지
    document.addEventListener('touchstart', handleUserInteraction, { passive: true })
    document.addEventListener('click', handleUserInteraction)

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('click', handleUserInteraction)
    }
  }, [isIOSDevice])

  // Fullscreen state tracking (webkit 지원)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )
      setIsFullscreen(isInFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleEnterFullscreen = async () => {
    try {
      if (containerRef.current) {
        const element = containerRef.current as any
        const isCurrentlyInFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).webkitCurrentFullScreenElement
        )

        if (!isCurrentlyInFullscreen) {
          // Try webkit version first (iPad)
          if (typeof element.webkitRequestFullscreen === 'function') {
            await element.webkitRequestFullscreen()
          }
          // Then try standard
          else if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen()
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleUnlock = async () => {
    try {
      const isCurrentlyInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      if (isCurrentlyInFullscreen) {
        if (typeof (document as any).webkitExitFullscreen === 'function') {
          await (document as any).webkitExitFullscreen()
        } else if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen()
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Handle fullscreen prompt (iOS/iPad only)
  const handleEnterFullscreenFromPrompt = async (_e?: React.MouseEvent | React.TouchEvent) => {
    return
  }

  // 날씨: 30분 간격, 기본은 서울, 사용자 제스처(버튼) 후 지오로케이션 사용
  useEffect(() => {
    const fetchWeather = async (coords?: { lat: number; lon: number }) => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || ''
        if (!apiKey) throw new Error('NO_API_KEY')

        const url = coords
          ? `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`
          : `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${apiKey}&units=metric&lang=kr`

        const response = await fetch(url)
        if (!response.ok) throw new Error('weather fetch fail')
        const data = await response.json()
        setTemperature(`${Math.round(data.main.temp)}°`)
        setWeatherDescription(data.weather?.[0]?.description || '날씨 정보')
        const condition = data.weather?.[0]?.main
        if (condition === 'Clear') setWeather('sunny')
        else if (['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)) setWeather('rainy')
        else setWeather('cloudy')
      } catch (err) {
        setTemperature('--°')
        setWeather('cloudy')
        setWeatherDescription('날씨 정보 없음')
      }
    }

    // 최초 1회 (서울)
    fetchWeather()
    const weatherInterval = setInterval(() => fetchWeather(geoCoords || undefined), 30 * 60 * 1000)
    return () => clearInterval(weatherInterval)
  }, [geoCoords])

  const requestGeolocation = () => {
    if (!('geolocation' in navigator)) {
      setWeatherDescription('위치 정보를 사용할 수 없습니다')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      },
      () => {
        setWeatherDescription('위치 권한 거부됨')
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 5000 }
    )
  }

  // Fetch seat assignments with student codes
  useEffect(() => {
    const fetchSeatAssignments = async () => {
      try {
        const response = await fetch('/api/seat-assignments', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          // Also fetch student codes
          const studentsResponse = await fetch('/api/students', { credentials: 'include' })
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json()
            const studentCodeMap: Record<string, string> = {}
            const studentMinutesMap: Record<string, number> = {}
            studentsData.students?.forEach((s: any) => {
              if (s.student_code) studentCodeMap[s.id] = s.student_code
              if (s.seatsremainingtime != null) studentMinutesMap[s.id] = s.seatsremainingtime
            })

            const assignmentsWithCodes = data.assignments?.map((a: any) => ({
              seatNumber: a.seatNumber,
              studentId: a.studentId,
              studentCode: studentCodeMap[a.studentId] || '',
              studentName: a.studentName || '',
              status: a.status,
              sessionStartTime: a.sessionStartTime,
              remainingMinutes: a.remainingMinutes ?? studentMinutesMap[a.studentId] ?? null,
            })) || []

            setSeatAssignments(assignmentsWithCodes)

            // Initialize attendance status from assignments
            const statusMap: Record<string, 'checked_in' | 'checked_out'> = {}
            assignmentsWithCodes.forEach((a: any) => {
              if (a.studentCode && (a.status === 'checked_in' || a.status === 'checked_out')) {
                statusMap[a.studentCode] = a.status
              }
            })
            setAttendanceStatus(statusMap)
          }
        }
      } catch (error) {
        console.error('Failed to fetch seat assignments:', error)
      }
    }

    fetchSeatAssignments()
  }, [])

  // 사용시간 만료 체크/모달 제거
  // useEffect(() => { ... }, [])
  // const handleCloseUsageTimeExpired = () => { ... }

  // 기관 정보 로드 (로고 포함) - 실패해도 기본 이름 유지
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(`/api/organizations/${institutionName}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.organization) {
          setOrganization((prev) => ({
            name: data.organization.name || prev.name,
            logo_url: data.organization.logo_url ?? prev.logo_url,
          }))
        }
      } catch (e) {
        // ignore errors, keep defaults
      }
    }
    if (institutionName) fetchOrg()
  }, [institutionName])

  const updateDateTime = () => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    const dayOfWeek = days[now.getDay()]

    setCurrentDate(`${month}월 ${day}일 ${dayOfWeek}요일`)

    // 12-hour format with AM/PM
    let hours = now.getHours()
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const hoursStr = String(hours).padStart(2, '0')
    setCurrentTime(`${hoursStr}:${minutes}`)
  }

  const handleNumberClick = (num: string) => {
    if (studentId.length < 4) {
      setStudentId(studentId + num)
    }
  }

  const handleClear = () => {
    setStudentId('')
  }

  const handleCheckInOut = async () => {
    if (studentId.length !== 4 || isLoading) {
      return
    }

    // Find student by code from seat assignments
    const assignment = seatAssignments.find(a => a.studentCode === studentId)

    if (assignment) {
      setIsLoading(true)
      try {
        // Fetch current status from DB to ensure accuracy
        const statusResponse = await fetch('/api/seat-assignments', { credentials: 'include' })
        const statusData = await statusResponse.json()
        const currentAssignment = statusData.assignments?.find((a: any) => a.seatNumber === assignment.seatNumber)
        const currentStatus = currentAssignment?.status || 'checked_out'
        const newStatus = currentStatus === 'checked_in' ? 'checked_out' : 'checked_in'

        // Call API to update status
        const response = await fetch('/api/seat-assignments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            seatNumber: assignment.seatNumber,
            status: newStatus,
          }),
        })

        if (response.ok) {
          // Update local state
          setAttendanceStatus(prev => ({
            ...prev,
            [studentId]: newStatus,
          }))

          setWelcomeName(assignment.studentName)
          setWelcomeMessage(newStatus === 'checked_in' ? '오늘도 열공하세요!' : '안녕히 가세요!')
          setShowWelcome(true)

          setTimeout(() => {
            setShowWelcome(false)
            setStudentId('')
          }, 3000)
        } else {
          console.error('Failed to update attendance')
          setStudentId('')
        }
      } catch (error) {
        console.error('Error updating attendance:', error)
        setStudentId('')
      } finally {
        setIsLoading(false)
      }
    } else {
      // 학생을 찾지 못한 경우 (좌석 배정 안됨)
      setStudentId('')
    }
  }

  const WeatherIcon = () => {
    switch (weather) {
      case 'sunny':
        return <Sun className="w-12 h-12 text-yellow-300" />
      case 'cloudy':
        return <Cloud className="w-12 h-12 text-white/90" />
      case 'rainy':
        return <CloudRain className="w-12 h-12 text-blue-200" />
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div ref={containerRef} className="h-screen flex bg-white overflow-hidden">
      {/* Left Panel - Blue Background */}
      <div className="w-1/2 flex flex-col items-center justify-center p-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

        {/* Welcome Message - Full Screen Overlay */}
        {showWelcome && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 z-50">
            <div className="text-center">
              <p className="text-7xl font-bold leading-relaxed">
                {welcomeName}님<br />{welcomeMessage}
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 w-full max-w-md">
          {/* Institution Logo and Name */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-blue-500">
                  {organization.name ? organization.name.substring(0, 2).toUpperCase() : 'GP'}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{organization.name || institutionName}</h1>
          </div>

          {/* Date */}
          <div className="text-center mb-8">
            <p className="text-2xl font-medium mb-2">{currentDate}</p>
          </div>

          {/* Time */}
          <div className="text-center mb-12">
            <p className="text-9xl font-bold tracking-tight">{currentTime}</p>
          </div>

          {/* Weather */}
          <div className="flex items-center justify-center gap-4">
            <WeatherIcon />
            <span className="text-5xl font-semibold">{temperature}</span>
            <span className="text-2xl font-light">{weatherDescription}</span>
          </div>
        </div>

        {/* Fullscreen Controls - Bottom Left */}
        <div className="absolute bottom-4 left-4">
          {!isFullscreen ? (
            <button
              onClick={handleEnterFullscreen}
              className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all duration-200 border border-white/20 shadow-lg"
              title="전체화면 모드"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleUnlock}
              className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all duration-200 border border-white/20 shadow-lg"
              title="잠금 해제 (전체화면 종료)"
            >
              <Unlock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Panel - White Background */}
      <div className="w-1/2 flex flex-col items-center justify-center p-16 bg-gray-50 overflow-hidden">
        <div className="w-full max-w-lg">
          {/* Display */}
          <div className="flex gap-6 justify-center mb-12">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-5xl font-bold text-white">
                  {studentId[i] || ''}
                </span>
              </div>
            ))}
          </div>

          {/* Number Keypad */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-20 text-4xl font-bold bg-white hover:bg-gray-100 text-gray-800 border-2 border-gray-200 rounded-2xl shadow-sm transition-all hover:scale-105 hover:shadow-md"
                disabled={studentId.length >= 4}
              >
                {num}
              </Button>
            ))}
            <Button
              onClick={handleClear}
              className="h-20 text-xl font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-200 rounded-2xl shadow-sm transition-all hover:scale-105"
            >
              초기화
            </Button>
            <Button
              onClick={() => handleNumberClick('0')}
              className="h-20 text-4xl font-bold bg-white hover:bg-gray-100 text-gray-800 border-2 border-gray-200 rounded-2xl shadow-sm transition-all hover:scale-105 hover:shadow-md"
              disabled={studentId.length >= 4}
            >
              0
            </Button>
            <div />
          </div>

          {/* Check In/Out Button */}
          <Button
            onClick={handleCheckInOut}
            className="w-full h-24 text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={studentId.length !== 4}
          >
            등·하원
          </Button>
        </div>
      </div>

    </div>
  )
}
