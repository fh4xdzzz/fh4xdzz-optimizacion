'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { normalizeAffiliateCode } from '@/lib/affiliate-program'

export default function ReferralTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ref = normalizeAffiliateCode(searchParams.get('ref') || '')

  useEffect(() => {
    if (ref.length < 3) return
    const referrerHost = (() => {
      try { return document.referrer ? new URL(document.referrer).hostname : null } catch { return null }
    })()
    void fetch('/api/referrals/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: ref, landingPath: pathname, referrerHost }),
      keepalive: true,
    })
  }, [pathname, ref])

  return null
}

