'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DoorOpen, X } from 'lucide-react'

interface OutingScreenProps {
  outingTime: string
  reason: string
  onReturn: () => void
}

export function OutingScreen({ outingTime, reason, onReturn }: OutingScreenProps) {
  const [mounted, setMounted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(outingTime).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000)
      setElapsedSeconds(elapsed)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [outingTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-500 to-blue-700 flex flex-col items-center justify-center">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onReturn}
        className="absolute top-4 right-4 h-12 w-12 text-white hover:bg-white/20"
      >
        <X className="h-8 w-8" />
      </Button>

      {/* Outing Icon */}
      <div className="mb-8">
        <DoorOpen className="h-24 w-24 md:h-32 md:w-32 text-white animate-pulse" />
      </div>

      {/* Status */}
      <div className="text-center">
        <p className="text-white/90 text-2xl md:text-3xl font-medium mb-4">
          외출 중
        </p>
        <div className="text-white text-[120px] md:text-[180px] font-bold tracking-wider leading-none">
          {formatTime(elapsedSeconds)}
        </div>
        <p className="text-white/80 text-xl md:text-2xl mt-6">
          외출 시간
        </p>
      </div>

      {/* Return Button */}
      <Button
        onClick={onReturn}
        className="mt-4 h-16 px-12 text-xl bg-white text-blue-600 hover:bg-white/90"
      >
        복귀하기
      </Button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-1000 ease-linear"
          style={{
            width: `${Math.min((elapsedSeconds / 3600) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  )
}
