import type { RevenueCategory } from '@/lib/types/database'

const STORAGE_KEY = 'revenue_categories'

/**
 * Revenue Categories Manager
 * localStorage 기반 수입 항목 관리
 */
export const revenueCategoryManager = {
  /**
   * 모든 수입 항목 가져오기
   */
  getCategories(): RevenueCategory[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // 기본 제공 없이 비워둠 (사용자가 직접 추가)
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
        return []
      }

      const categories = JSON.parse(stored) as RevenueCategory[]
      return categories.sort((a, b) => a.order - b.order)
    } catch (error) {
      console.error('Failed to load revenue categories:', error)
      return []
    }
  },

  /**
   * 활성화된 수입 항목만 가져오기
   */
  getActiveCategories(): RevenueCategory[] {
    return this.getCategories().filter(cat => cat.is_active)
  },

  /**
   * ID로 특정 항목 가져오기
   */
  getCategoryById(id: string): RevenueCategory | undefined {
    return this.getCategories().find(cat => cat.id === id)
  },

  /** 저장소 전체 덮어쓰기 */
  setCategories(categories: RevenueCategory[]): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  },

  /**
   * 기본 수입 항목으로 초기화
   */
  initializeDefaultCategories(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
  },

  /**
   * 새 수입 항목 추가
   */
  addCategory(data: { name: string; description?: string }): RevenueCategory {
    const categories = this.getCategories()
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0

    const newCategory: RevenueCategory = {
      id: `revenue-cat-${Date.now()}`,
      name: data.name,
      description: data.description,
      is_active: true,
      order: maxOrder + 1,
      created_at: new Date().toISOString(),
    }

    const updatedCategories = [...categories, newCategory]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCategories))

    return newCategory
  },

  /**
   * 수입 항목 수정
   */
  updateCategory(id: string, data: Partial<RevenueCategory>): void {
    const categories = this.getCategories()
    const updatedCategories = categories.map(cat =>
      cat.id === id ? { ...cat, ...data } : cat
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCategories))
  },

  /**
   * 수입 항목 삭제
   */
  deleteCategory(id: string): void {
    const categories = this.getCategories()
    const filteredCategories = categories.filter(cat => cat.id !== id)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCategories))
  },

  /**
   * 수입 항목 순서 변경
   */
  reorderCategories(categoryIds: string[]): void {
    const categories = this.getCategories()
    const reorderedCategories = categoryIds.map((id, index) => {
      const category = categories.find(cat => cat.id === id)
      return category ? { ...category, order: index + 1 } : null
    }).filter((cat): cat is RevenueCategory => cat !== null)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reorderedCategories))
  },

  /**
   * 수입 항목 활성화/비활성화 토글
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
