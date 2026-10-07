import { describe, expect, it } from 'vitest'
import { calculateAffiliateCommission, normalizeAffiliateCode } from '@/lib/affiliate-program'

describe('affiliate program', () => {
  it('normalizes creator codes without spaces or symbols', () => {
    expect(normalizeAffiliateCode(' floppy_zzz! ')).toBe('FLOPPYZZZ')
  })

  it('calculates money with two decimals', () => {
    expect(calculateAffiliateCommission(42.49, 10)).toBe(4.25)
  })

  it('clamps invalid rates and negative revenue', () => {
    expect(calculateAffiliateCommission(-10, 80)).toBe(0)
    expect(calculateAffiliateCommission(100, 80)).toBe(50)
  })
})
