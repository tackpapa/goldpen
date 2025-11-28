'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetWrapperProps {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  onRemove?: () => void
  className?: string
  headerAction?: ReactNode
  isDragging?: boolean
}

export function WidgetWrapper({
  title,
  description,
  icon,
  children,
  onRemove,
  className,
  headerAction,
  isDragging,
}: WidgetWrapperProps) {
  return (
    <Card className={cn('group relative', isDragging && 'opacity-50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3 flex-1">
          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {headerAction}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
