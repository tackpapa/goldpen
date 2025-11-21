'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  navigationItems,
  getFilteredNavigation,
  getInstitutionName,
  setMenuOrder,
  getMenuOrder,
  type BadgeType,
  type NavigationItem,
} from '@/lib/config/navigation'

const BadgeComponent = ({ type, isActive }: { type: BadgeType; isActive: boolean }) => {
  const badgeStyles = {
    '학원용': isActive
      ? 'bg-blue-100 text-blue-700'
      : 'bg-blue-50/50 text-blue-600',
    '독서실': isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-green-50/50 text-green-600',
    '공부방': isActive
      ? 'bg-orange-100 text-orange-700'
      : 'bg-orange-50/50 text-orange-600',
    '강사용': isActive
      ? 'bg-purple-100 text-purple-700'
      : 'bg-purple-50/50 text-purple-600',
  }

  return (
    <span
      className={cn(
        'px-0.5 py-0 text-[10px] font-medium rounded',
        badgeStyles[type]
      )}
    >
      {type}
    </span>
  )
}

interface SortableNavItemProps {
  item: NavigationItem
  isActive: boolean
}

function SortableNavItem({ item, isActive }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2',
        isDragging && 'opacity-50'
      )}
    >
      {/* 드래그 핸들 (Link 밖으로 완전 분리) */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded transition-colors flex items-center"
      >
        <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      {/* 클릭 가능한 Link */}
      <Link
        href={item.href as any}
        className={cn(
          'flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span>{item.name}</span>
          {item.badges && item.badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.badges.map((badge) => (
                <BadgeComponent key={badge} type={badge} isActive={isActive} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(256) // 기본 값 64 * 4 = 256px (w-64)
  const [isResizing, setIsResizing] = useState(false)
  const [organizationName, setOrganizationName] = useState('GoldPen')
  const [organizationLogo, setOrganizationLogo] = useState('')
  const [institutionName, setInstitutionName] = useState('') // hydration mismatch 방지
  const sidebarRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load sidebar width from localStorage and institution name
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedWidth = localStorage.getItem('sidebarWidth')
    if (storedWidth) {
      setSidebarWidth(parseInt(storedWidth, 10))
    }

    // Set institution name on client only to prevent hydration mismatch
    setInstitutionName(getInstitutionName())
  }, [])

  useEffect(() => {
    // Update navigation when menu settings change
    const updateNavigation = () => {
      setNavigation(getFilteredNavigation())
    }

    updateNavigation()

    // Listen for storage changes (menu settings updates)
    window.addEventListener('storage', updateNavigation)
    window.addEventListener('menuSettingsChanged', updateNavigation)

    return () => {
      window.removeEventListener('storage', updateNavigation)
      window.removeEventListener('menuSettingsChanged', updateNavigation)
    }
  }, [])

  // Load organization settings
  useEffect(() => {
    const loadOrganizationSettings = () => {
      const name = localStorage.getItem('organization_name')
      const logo = localStorage.getItem('organization_logo')

      if (name) setOrganizationName(name)
      if (logo) setOrganizationLogo(logo)
    }

    loadOrganizationSettings()

    // Listen for organization settings changes
    window.addEventListener('organizationSettingsChanged', loadOrganizationSettings)

    return () => {
      window.removeEventListener('organizationSettingsChanged', loadOrganizationSettings)
    }
  }, [])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    setNavigation((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newOrder = arrayMove(items, oldIndex, newIndex)

      // Save new order to localStorage
      setMenuOrder(newOrder.map((item) => item.id))

      return newOrder
    })
  }

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const minWidth = 200
      const maxWidth = 400
      const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth)

      setSidebarWidth(newWidth)
      localStorage.setItem('sidebarWidth', newWidth.toString())
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return (
    <div
      ref={sidebarRef}
      className="hidden lg:flex h-full flex-col border-r bg-muted/10 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Logo and Organization Name */}
      <div className="px-4 py-6 border-b">
        <Link href={institutionName ? `/${institutionName}/overview` : '#'} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {organizationLogo ? (
            <img
              src={organizationLogo}
              alt={organizationName}
              className="h-10 w-10 object-contain rounded-lg"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                {organizationName.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold text-lg leading-tight">{organizationName}</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={navigation.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {navigation.map((item) => {
              const isActive = pathname?.startsWith(item.href)
              return <SortableNavItem key={item.id} item={item} isActive={isActive} />
            })}
          </SortableContext>
        </DndContext>
      </nav>

      {/* Resize handle */}
      <div
        className={cn(
          'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors',
          isResizing && 'bg-primary/40'
        )}
        onMouseDown={() => setIsResizing(true)}
      />
    </div>
  )
}
