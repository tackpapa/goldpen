'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ExpenseCategory } from '@/lib/types/database'

interface UseExpenseCategoriesOptions {
  orgSlug?: string
}

interface ExpenseCategoryInput {
  name: string
  description?: string
  color?: string
}

// API Response types
interface CategoriesResponse {
  categories?: Array<{
    id: string
    name: string
    description?: string
    color?: string
    is_active: boolean
    display_order: number
    created_at: string
  }>
  error?: string
}

interface CategoryResponse {
  category?: {
    id: string
    name: string
    description?: string
    color?: string
    is_active: boolean
    display_order: number
    created_at: string
  }
  success?: boolean
  error?: string
}

export function useExpenseCategories(options: UseExpenseCategoriesOptions = {}) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/expense-categories?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json() as CategoriesResponse
        throw new Error(data.error || '카테고리 조회 실패')
      }

      const data = await res.json() as CategoriesResponse
      const mapped = (data.categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color || '#6b7280', // 기본 색상
        is_active: cat.is_active,
        order: cat.display_order,
        created_at: cat.created_at
      }))
      setCategories(mapped)
    } catch (err: any) {
      setError(err.message)
      console.error('[useExpenseCategories] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [options.orgSlug])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = async (data: ExpenseCategoryInput): Promise<ExpenseCategory | null> => {
    try {
      const res = await fetch('/api/settings/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const result = await res.json() as CategoryResponse
        throw new Error(result.error || '카테고리 추가 실패')
      }

      const result = await res.json() as CategoryResponse
      await fetchCategories()
      if (result.category) {
        return {
          id: result.category.id,
          name: result.category.name,
          description: result.category.description,
          color: result.category.color || '#6b7280',
          is_active: result.category.is_active,
          order: result.category.display_order,
          created_at: result.category.created_at
        }
      }
      return null
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const updateCategory = async (id: string, data: Partial<ExpenseCategory>): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/expense-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...data })
      })

      if (!res.ok) {
        const result = await res.json() as CategoryResponse
        throw new Error(result.error || '카테고리 수정 실패')
      }

      await fetchCategories()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/settings/expense-categories?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!res.ok) {
        const result = await res.json() as CategoryResponse
        throw new Error(result.error || '카테고리 삭제 실패')
      }

      await fetchCategories()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const toggleCategory = async (id: string): Promise<boolean> => {
    const category = categories.find(c => c.id === id)
    if (!category) return false
    return updateCategory(id, { is_active: !category.is_active })
  }

  const reorderCategories = async (orderedIds: string[]): Promise<boolean> => {
    try {
      const reordered = orderedIds.map((id, index) => {
        const cat = categories.find(c => c.id === id)
        return cat ? { ...cat, order: index } : null
      }).filter(Boolean)

      const res = await fetch('/api/settings/expense-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ categories: reordered })
      })

      if (!res.ok) {
        const result = await res.json() as CategoryResponse
        throw new Error(result.error || '순서 변경 실패')
      }

      await fetchCategories()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const getActiveCategories = () => categories.filter(c => c.is_active)

  const isNameDuplicate = (name: string, excludeId?: string) => {
    return categories.some(c =>
      c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId
    )
  }

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategory,
    reorderCategories,
    getActiveCategories,
    isNameDuplicate
  }
}
