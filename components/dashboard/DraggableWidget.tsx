'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Widget, WidgetType, widgetSizeClasses } from '@/lib/types/widget'
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

  const fullTypes: WidgetType[] = [
    'students-grade-distribution',
    'consultations-conversion',
    'classes-capacity',
    'exams-recent',
    'homework-submission',
    'billing-revenue-trend',
    'billing-expense-category',
    'attendance-weekly',
    'attendance-alerts',
    'lessons-recent',
    'schedule-today',
    'rooms-usage',
    'seats-realtime',
    'expenses-trend',
    'recent-activities',
    'announcements',
  ]

  const isFull = fullTypes.includes(widget.type)
  const rowSpanClass = isFull ? 'row-span-2' : 'row-span-1'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${widgetSizeClasses[widget.size]} ${rowSpanClass} relative group h-full`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1/2 -translate-x-1/2 top-2 z-10 flex items-center gap-1 cursor-move opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-2 py-1 rounded-full shadow-sm border border-border/60"
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
