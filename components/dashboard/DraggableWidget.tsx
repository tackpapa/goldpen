'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Widget, widgetSizeClasses } from '@/lib/types/widget'
import { WidgetData } from '@/lib/types/widget-data'
import { WidgetRenderer } from './WidgetRenderer'
import { GripVertical } from 'lucide-react'

interface DraggableWidgetProps {
  widget: Widget
  onRemove: () => void
  currentTime: Date
  data?: WidgetData
}

export function DraggableWidget({ widget, onRemove, currentTime, data }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${widgetSizeClasses[widget.size]} relative group`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-move opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 p-1 rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Widget Content */}
      <WidgetRenderer
        widget={widget}
        onRemove={onRemove}
        currentTime={currentTime}
        data={data}
      />
    </div>
  )
}
