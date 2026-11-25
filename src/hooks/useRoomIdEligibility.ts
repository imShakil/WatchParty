import { useEffect, useState } from 'react'
import { checkRoomIdEligibility } from '@/services/firebaseService'
import { validateRoomIdFormat } from '@/utils/roomValidation'
import { getHostSession } from '@/utils/sessionUtils'

export interface EligibilityState {
  status: 'idle' | 'checking' | 'eligible' | 'invalid'
  message?: string
}

interface AsyncEligibilityResult {
  slug: string
  eligible: boolean
  reason?: string
  isOwnedPermanent?: boolean
}

/**
 * Shared debounced Room ID eligibility & collision checker for host creation forms.
 */
export function useRoomIdEligibility(rawSlug: string): EligibilityState {
  const slug = rawSlug.trim().toLowerCase()
  const format = slug ? validateRoomIdFormat(slug) : { valid: true }
  const [asyncResult, setAsyncResult] = useState<AsyncEligibilityResult | null>(null)

  useEffect(() => {
    if (!slug || !format.valid) return

    let cancelled = false
    const timer = setTimeout(() => {
      const hasOwnership = Boolean(getHostSession(slug))
      void checkRoomIdEligibility(slug, hasOwnership, false).then((res) => {
        if (cancelled) return
        setAsyncResult({
          slug,
          eligible: res.eligible,
          reason: res.reason,
          isOwnedPermanent: res.isOwnedPermanent,
        })
      })
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slug, format.valid])

  if (!slug) {
    return { status: 'idle' }
  }

  if (!format.valid) {
    return { status: 'invalid', message: format.reason }
  }

  if (asyncResult && asyncResult.slug === slug) {
    return asyncResult.eligible
      ? {
          status: 'eligible',
          message: asyncResult.isOwnedPermanent
            ? 'Your permanent room (ready to resume)'
            : 'Available',
        }
      : { status: 'invalid', message: asyncResult.reason || 'Room ID unavailable.' }
  }

  return { status: 'checking', message: 'Checking availability...' }
}
