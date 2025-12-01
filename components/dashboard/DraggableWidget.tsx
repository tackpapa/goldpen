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

  const isFullType = fullTypes.includes(widget.type)

  // 데이터가 비어 있으면 강제로 컴팩트 높이(row-span-1)로 축소
  const isEmptyData = (() => {
    if (!data) return true
    switch (widget.type) {
      case 'students-grade-distribution':
        return data.gradeDistribution.length === 0
      case 'consultations-conversion':
        return data.conversionData.length === 0
      case 'classes-capacity':
        return data.classCapacity.length === 0
      case 'exams-recent':
        return data.recentExams.length === 0
      case 'homework-submission':
        return data.homeworkSubmission.length === 0
      case 'billing-revenue-trend':
        return data.revenueData.length === 0
      case 'billing-expense-category':
        return data.expenseCategory.length === 0
      case 'attendance-weekly':
        return data.attendanceData.length === 0
      case 'attendance-alerts':
        return data.attendanceAlerts.length === 0
      case 'lessons-recent':
        return data.recentLessons.length === 0
      case 'schedule-today':
        return data.todayClasses.length === 0
      case 'rooms-usage':
        return data.roomUsage.length === 0
      case 'seats-realtime':
        return data.seatStatus.total === 0
      case 'expenses-trend':
        return data.expenseTrend.length === 0
      case 'recent-activities':
        return data.recentActivities.length === 0
      case 'announcements':
        return data.announcements.length === 0
      default:
        return false
    }
  })()

  const isFull = isFullType && !isEmptyData
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
