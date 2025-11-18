'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MoonStar, X } from 'lucide-react'

interface SleepTimerProps {
  remainingSeconds: number
  onWakeUp: () => void
}

export function SleepTimer({ remainingSeconds, onWakeUp }: SleepTimerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-red-500 to-red-700 flex flex-col items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onWakeUp}
        className="absolute top-4 right-4 h-12 w-12 text-white hover:bg-white/20"
      >
        <X className="h-8 w-8" />
      </Button>

      {/* Sleep Icon */}
      <div className="mb-8">
        <MoonStar className="h-24 w-24 md:h-32 md:w-32 text-white animate-pulse" />
      </div>

      {/* Countdown Timer */}
      <div className="text-center">
        <p className="text-white/90 text-2xl md:text-3xl font-medium mb-4">
          잠자기 시간
        </p>
        <div className="text-white text-[120px] md:text-[180px] font-bold tracking-wider leading-none">
          {formatTime(remainingSeconds)}
        </div>
        <p className="text-white/80 text-xl md:text-2xl mt-6">
          {remainingSeconds > 0 ? '남은 시간' : '기상 시간입니다!'}
        </p>
      </div>

      {/* Wake Up Button */}
      <Button
        onClick={onWakeUp}
        className="mt-12 h-16 px-12 text-xl bg-white text-red-600 hover:bg-white/90"
      >
        기상하기
      </Button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-1000 ease-linear"
          style={{
            width: `${((15 * 60 - remainingSeconds) / (15 * 60)) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
