'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserAccount, UserRole } from '@/lib/types/permissions'

interface UseUserAccountsOptions {
  orgSlug?: string
}

interface UserAccountInput {
  username: string
  password: string
  name: string
  role: UserRole
}

// API Response types
interface AccountsResponse {
  accounts?: Array<{
    id: string
    username: string
    name: string
    role: string
    is_active: boolean
    created_at: string
  }>
  error?: string
}

interface AccountResponse {
  account?: {
    id: string
    username: string
    name: string
    role: string
    is_active: boolean
    created_at?: string
  }
  success?: boolean
  error?: string
}

export function useUserAccounts(options: UseUserAccountsOptions = {}) {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/user-accounts?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json() as AccountsResponse
        throw new Error(data.error || '계정 조회 실패')
      }

      const data = await res.json() as AccountsResponse
      const mapped = (data.accounts || []).map((acc) => ({
        id: acc.id,
        username: acc.username,
        name: acc.name,
        role: acc.role as UserRole,
        is_active: acc.is_active,
        createdAt: acc.created_at
      }))
      setAccounts(mapped)
    } catch (err: any) {
      setError(err.message)
      console.error('[useUserAccounts] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [options.orgSlug])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = async (data: UserAccountInput): Promise<UserAccount | null> => {
    try {
      const res = await fetch('/api/settings/user-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const result = await res.json() as AccountResponse
        throw new Error(result.error || '계정 추가 실패')
      }

      const result = await res.json() as AccountResponse
      await fetchAccounts()
      if (result.account) {
        return {
          id: result.account.id,
          username: result.account.username,
          name: result.account.name,
          role: result.account.role as UserRole,
          is_active: result.account.is_active,
          createdAt: result.account.created_at || ''
        }
      }
      return null
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const updateAccount = async (id: string, data: Partial<UserAccountInput & { is_active?: boolean }>): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/user-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...data })
      })

      if (!res.ok) {
        const result = await res.json() as AccountResponse
        throw new Error(result.error || '계정 수정 실패')
      }

      await fetchAccounts()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const deleteAccount = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/settings/user-accounts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!res.ok) {
        const result = await res.json() as AccountResponse
        throw new Error(result.error || '계정 삭제 실패')
      }

      await fetchAccounts()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const verifyLogin = async (
    username: string,
    password: string,
    orgSlug?: string
  ): Promise<UserAccount | null> => {
    try {
      const res = await fetch('/api/settings/user-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, orgSlug })
      })

      if (!res.ok) {
        const result = await res.json() as AccountResponse
        throw new Error(result.error || '로그인 실패')
      }

      const result = await res.json() as AccountResponse
      if (result.account) {
        return {
          id: result.account.id,
          username: result.account.username,
          name: result.account.name,
          role: result.account.role as UserRole,
          is_active: result.account.is_active,
          createdAt: ''
        }
      }
      return null
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const isUsernameTaken = (username: string, excludeId?: string): boolean => {
    return accounts.some(acc =>
      acc.username === username && acc.id !== excludeId
    )
  }

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    verifyLogin,
    isUsernameTaken
  }
}
