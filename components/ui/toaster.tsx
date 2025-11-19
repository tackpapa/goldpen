"use client"

import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // 풀스크린 모드에서도 토스트가 보이도록 container 동적 업데이트 (webkit 지원)
    const updateContainer = () => {
      const fullscreenElement = (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      ) as HTMLElement
      setContainer(fullscreenElement || document.body)
    }

    updateContainer()
    document.addEventListener('fullscreenchange', updateContainer)
    document.addEventListener('webkitfullscreenchange', updateContainer)
    return () => {
      document.removeEventListener('fullscreenchange', updateContainer)
      document.removeEventListener('webkitfullscreenchange', updateContainer)
    }
  }, [])

  if (!container) return null

  return createPortal(
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>,
    container
  )
}
