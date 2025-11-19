'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Cloud, CloudRain, Sun, Unlock, Maximize2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Mock organization data (in real app, fetch from Supabase)
const mockOrganization = {
  name: 'ClassFlow 학원',
  logo_url: '/logo.png', // placeholder
}

export default function LiveAttendancePage() {
  const params = useParams()
  const institutionName = params.institutionname as string

  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [temperature, setTemperature] = useState('--°')
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('cloudy')
  const [weatherDescription, setWeatherDescription] = useState('날씨 정보 로딩 중...')
  const [studentId, setStudentId] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeName, setWelcomeName] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)

  // Track attendance status: { studentId: 'checked_in' | 'checked_out' }
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, 'checked_in' | 'checked_out'>>({})

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

    // iOS/iPad면 모달 표시
    if (checkIsIOS) {
      setFullscreenPromptOpen(true)
    }
  }, [])

  // Check if device is mobile or tablet (not PC)
  const isMobileOrTablet = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent)
  }

  // Auto-enter fullscreen every 5 seconds if not in fullscreen (Mobile/Tablet only, excluding iOS)
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
          // Silently fail
        }
      }
    }

    checkAndEnterFullscreen()
    const interval = setInterval(checkAndEnterFullscreen, 5000)

    return () => clearInterval(interval)
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
  const handleEnterFullscreenFromPrompt = async () => {
    setFullscreenPromptOpen(false)
    await handleEnterFullscreen()
  }

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Try to get user's location
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords

              // OpenWeatherMap API (무료 tier)
              // API Key는 환경 변수로 관리하는 것이 좋습니다
              const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE'

              try {
                const response = await fetch(
                  `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=kr`
                )

                if (!response.ok) {
                  throw new Error('Weather API failed')
                }

                const data = await response.json()

                // Set temperature
                setTemperature(`${Math.round(data.main.temp)}°`)

                // Map weather condition to our types
                const condition = data.weather[0].main
                const description = data.weather[0].description

                setWeatherDescription(description)

                if (condition === 'Clear') {
                  setWeather('sunny')
                } else if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
                  setWeather('rainy')
                } else {
                  setWeather('cloudy')
                }
              } catch (error) {
                console.error('Failed to fetch weather:', error)
                // Fallback to default values
                setTemperature('--°')
                setWeatherDescription('날씨 정보 없음')
              }
            },
            (error) => {
              console.error('Geolocation error:', error)
              // Fallback: Use Seoul coordinates
              fetchWeatherByCity('Seoul')
            }
          )
        } else {
          // Geolocation not available, use default city
          fetchWeatherByCity('Seoul')
        }
      } catch (error) {
        console.error('Weather fetch error:', error)
      }
    }

    const fetchWeatherByCity = async (city: string) => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'YOUR_API_KEY_HERE'
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`
        )

        if (!response.ok) {
          throw new Error('Weather API failed')
        }

        const data = await response.json()

        setTemperature(`${Math.round(data.main.temp)}°`)

        const condition = data.weather[0].main
        const description = data.weather[0].description

        setWeatherDescription(description)

        if (condition === 'Clear') {
          setWeather('sunny')
        } else if (condition === 'Rain' || condition === 'Drizzle' || condition === 'Thunderstorm') {
          setWeather('rainy')
        } else {
          setWeather('cloudy')
        }
      } catch (error) {
        console.error('Failed to fetch weather by city:', error)
        setTemperature('--°')
        setWeatherDescription('날씨 정보 없음')
      }
    }

    fetchWeather()

    // Refresh weather every 30 minutes
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000)

    return () => clearInterval(weatherInterval)
  }, [])

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
    if (studentId.length !== 4) {
      return
    }

    // In real app: call API to check in/out
    const mockStudents = [
      { id: '1234', name: '김민준' },
      { id: '5678', name: '이서연' },
      { id: '9012', name: '박준호' },
    ]

    const student = mockStudents.find(s => s.id === studentId)

    if (student) {
      // Check current status
      const currentStatus = attendanceStatus[studentId]

      // Toggle status
      if (currentStatus === 'checked_in') {
        // 이미 등원 상태 -> 하원 처리
        setAttendanceStatus(prev => ({
          ...prev,
          [studentId]: 'checked_out'
        }))
        setWelcomeName(student.name)
        setWelcomeMessage('안녕히 가세요!')
        setShowWelcome(true)
      } else {
        // 미등원 또는 하원 상태 -> 등원 처리
        setAttendanceStatus(prev => ({
          ...prev,
          [studentId]: 'checked_in'
        }))
        setWelcomeName(student.name)
        setWelcomeMessage('오늘도 열공하세요!')
        setShowWelcome(true)
      }

      setTimeout(() => {
        setShowWelcome(false)
        setStudentId('')
      }, 3000)
    } else {
      // 학생을 찾지 못한 경우
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
      {/* Fullscreen Prompt Modal */}
      <Dialog open={fullscreenPromptOpen} onOpenChange={setFullscreenPromptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-2xl">풀스크린 모드</DialogTitle>
            <DialogDescription className="text-base pt-2">
              최적의 학습 환경을 위해 풀스크린 모드를 켜주세요
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleEnterFullscreenFromPrompt}
              className="w-full h-16 text-lg font-semibold"
            >
              풀스크린 켜기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-blue-500">CF</span>
            </div>
            <h1 className="text-3xl font-bold">{mockOrganization.name}</h1>
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
