import type { ExpenseCategory } from '@/lib/types/database'

const STORAGE_KEY = 'expense_categories'

/**
 * Expense Categories Manager
 * localStorage 기반 지출 항목 관리
 */
export const expenseCategoryManager = {
  /**
   * 모든 지출 항목 가져오기
   */
  getCategories(): ExpenseCategory[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // 기본 제공 없이 비워둠 (사용자가 직접 추가)
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return []
      }

      const categories = JSON.parse(stored) as ExpenseCategory[]
      return categories.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error('Failed to load expense categories:', error)
      return []
    }
  },

  /**
   * 활성화된 지출 항목만 가져오기
   */
  getActiveCategories(): ExpenseCategory[] {
    return this.getCategories().filter(cat => cat.is_active)
  },

  /** 저장소 전체 덮어쓰기 */
  setCategories(categories: ExpenseCategory[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  },

  /**
   * 기본 지출 항목으로 초기화
   */
  initializeDefaultCategories(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
  },

  /**
   * 새 지출 항목 추가
   */
  addCategory(data: { name: string; description?: string; color?: string }): ExpenseCategory {
    const categories = this.getCategories()
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0

    const newCategory: ExpenseCategory = {
      id: `expense-cat-${Date.now()}`,
      name: data.name,
      description: data.description,
      color: data.color || '#6b7280', // 기본 회색
      is_active: true,
      order: maxOrder + 1,
      created_at: new Date().toISOString(),
    }

    const updatedCategories = [...categories, newCategory]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCategories))

    return newCategory
  },

  /**
   * 지출 항목 수정
   */
  updateCategory(id: string, data: Partial<ExpenseCategory>): void {
    const categories = this.getCategories()
    const updatedCategories = categories.map(cat =>
      cat.id === id ? { ...cat, ...data } : cat
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCategories))
  },

  /**
   * 지출 항목 삭제
   */
  deleteCategory(id: string): void {
    const categories = this.getCategories()
    const filteredCategories = categories.filter(cat => cat.id !== id)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCategories))
  },

  /**
   * 지출 항목 순서 변경
   */
  reorderCategories(categoryIds: string[]): void {
    const categories = this.getCategories()
    const reorderedCategories = categoryIds.map((id, index) => {
      const category = categories.find(cat => cat.id === id)
      return category ? { ...category, order: index + 1 } : null
    }).filter((cat): cat is ExpenseCategory => cat !== null)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reorderedCategories))
  },

  /**
   * 지출 항목 활성화/비활성화 토글
   */
  toggleCategory(id: string): void {
    const categories = this.getCategories()
    const updatedCategories = categories.map(cat =>
      cat.id === id ? { ...cat, is_active: !cat.is_active } : cat
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCategories))
  },

  /**
   * 항목명 중복 체크
   */
  isNameDuplicate(name: string, excludeId?: string): boolean {
    const categories = this.getCategories()
    return categories.some(cat =>
      cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
    )
  },

  /**
   * 모든 데이터 초기화 (기본값으로)
   */
  reset(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
    this.initializeDefaultCategories()
  },
}
