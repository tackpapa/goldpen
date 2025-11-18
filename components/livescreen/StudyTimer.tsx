'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface StudyTimerProps {
  onTimeUpdate?: (seconds: number) => void
}

export function StudyTimer({ onTimeUpdate }: StudyTimerProps) {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1
          onTimeUpdate?.(newSeconds)
          return newSeconds
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, onTimeUpdate])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(secs).padStart(2, '0'),
    }
  }

  const { hours, minutes, seconds: secs } = formatTime(seconds)

  const handleToggle = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSeconds(0)
    onTimeUpdate?.(0)
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">공부 시간</p>
          <div className="flex items-center justify-center gap-2 font-mono">
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-bold text-primary">
                {hours}
              </span>
              <span className="text-xs text-muted-foreground mt-1">시간</span>
            </div>
            <span className="text-4xl md:text-5xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-bold text-primary">
                {minutes}
              </span>
              <span className="text-xs text-muted-foreground mt-1">분</span>
            </div>
            <span className="text-4xl md:text-5xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-bold text-primary">
                {secs}
              </span>
              <span className="text-xs text-muted-foreground mt-1">초</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            size="lg"
            onClick={handleToggle}
            className="min-w-[120px]"
            variant={isRunning ? 'secondary' : 'default'}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                일시정지
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                시작
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleReset}
            className="min-w-[100px]"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            초기화
          </Button>
        </div>
      </div>
    </Card>
  )
}
