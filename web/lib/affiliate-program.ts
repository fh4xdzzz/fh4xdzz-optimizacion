export const AFFILIATE_COOKIE = 'td_affiliate_ref'
export const AFFILIATE_VISITOR_COOKIE = 'td_affiliate_visitor'
export const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export function normalizeAffiliateCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}

export function calculateAffiliateCommission(revenue: number, rate: number) {
  const safeRevenue = Number.isFinite(revenue) ? Math.max(0, revenue) : 0
  const safeRate = Number.isFinite(rate) ? Math.min(50, Math.max(0, rate)) : 0
  return Number((safeRevenue * safeRate / 100).toFixed(2))
}

