/**
 * 대시보드 페이지별 SWR 훅
 */

import useSWR from 'swr'
import { fetcher, swrConfig } from './fetcher'

// 학생 목록
export function useStudents() {
  const { data, error, isLoading, mutate } = useSWR<{ students: any[]; count: number }>(
    '/api/students',
    fetcher,
    swrConfig
  )
  return {
    students: data?.students || [],
    count: data?.count || 0,
    isLoading,
    error,
    refresh: mutate,
  }
}

// 선생님 목록
export function useTeachers() {
  const { data, error, isLoading, mutate } = useSWR<{ teachers: any[] }>(
    '/api/teachers',
    fetcher,
    swrConfig
  )
  return {
    teachers: data?.teachers || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 선생님 개요 (overview 포함)
export function useTeachersOverview() {
  const { data, error, isLoading, mutate } = useSWR<{ teachers: any[] }>(
    '/api/teachers/overview',
    fetcher,
    swrConfig
  )
  return {
    teachers: data?.teachers || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 반 목록
export function useClasses() {
  const { data, error, isLoading, mutate } = useSWR<{ classes: any[] }>(
    '/api/classes',
    fetcher,
    swrConfig
  )
  return {
    classes: data?.classes || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 시험 목록
export function useExams() {
  const { data, error, isLoading, mutate } = useSWR<{ exams: any[]; scores: Record<string, any[]> }>(
    '/api/exams',
    fetcher,
    swrConfig
  )
  return {
    exams: data?.exams || [],
    scores: data?.scores || {},
    isLoading,
    error,
    refresh: mutate,
  }
}

// 상담 목록
export function useConsultations() {
  const { data, error, isLoading, mutate } = useSWR<{ consultations: any[] }>(
    '/api/consultations',
    fetcher,
    swrConfig
  )
  return {
    consultations: data?.consultations || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 출결 목록
export function useAttendance(date?: string) {
  const url = date ? `/api/attendance?date=${date}` : '/api/attendance'
  const { data, error, isLoading, mutate } = useSWR<{ attendance: any[] }>(
    url,
    fetcher,
    swrConfig
  )
  return {
    attendance: data?.attendance || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 일정 목록
export function useSchedules() {
  const { data, error, isLoading, mutate } = useSWR<{ schedules: any[] }>(
    '/api/schedules',
    fetcher,
    swrConfig
  )
  return {
    schedules: data?.schedules || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 수업 목록
export function useLessons() {
  const { data, error, isLoading, mutate } = useSWR<{ lessons: any[] }>(
    '/api/lessons',
    fetcher,
    swrConfig
  )
  return {
    lessons: data?.lessons || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 숙제 목록
export function useHomework() {
  const { data, error, isLoading, mutate } = useSWR<{ homework: any[] }>(
    '/api/homework',
    fetcher,
    swrConfig
  )
  return {
    homework: data?.homework || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 청구 목록
export function useBilling() {
  const { data, error, isLoading, mutate } = useSWR<{ billings: any[] }>(
    '/api/billing',
    fetcher,
    swrConfig
  )
  return {
    billings: data?.billings || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 지출 목록
export function useExpenses() {
  const { data, error, isLoading, mutate } = useSWR<{ expenses: any[] }>(
    '/api/expenses',
    fetcher,
    swrConfig
  )
  return {
    expenses: data?.expenses || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 강의실 목록
export function useRooms() {
  const { data, error, isLoading, mutate } = useSWR<{ rooms: any[] }>(
    '/api/rooms',
    fetcher,
    swrConfig
  )
  return {
    rooms: data?.rooms || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 반-학생 등록 목록
export function useClassEnrollments() {
  const { data, error, isLoading, mutate } = useSWR<{ enrollments: any[] }>(
    '/api/class-enrollments',
    fetcher,
    swrConfig
  )
  return {
    enrollments: data?.enrollments || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// 대시보드 개요 데이터
export function useOverview() {
  const { data, error, isLoading, mutate } = useSWR<any>(
    '/api/overview',
    fetcher,
    swrConfig
  )
  return {
    overview: data || null,
    isLoading,
    error,
    refresh: mutate,
  }
}

// 설정 데이터
export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<{ settings: any }>(
    '/api/settings',
    fetcher,
    swrConfig
  )
  return {
    settings: data?.settings || null,
    isLoading,
    error,
    refresh: mutate,
  }
}
