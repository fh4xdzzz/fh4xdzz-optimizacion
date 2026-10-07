import { describe, expect, it } from 'vitest'
import { calculateBestPackageDiscount, calculateCouponDiscount, formatCouponLabel } from '@/lib/store-pricing'

describe('store pricing', () => {
  it('applies a package only to the services included in that package', () => {
    const result = calculateBestPackageDiscount([
      { id: 'a', price: 50 },
      { id: 'b', price: 20 },
      { id: 'extra', price: 100 },
    ], [{
      id: 'pack',
      discount_percent: 10,
      service_package_items: [{ service_id: 'a' }, { service_id: 'b' }],
    }])

    expect(result).toEqual({ packageId: 'pack', discount: 7 })
  })

  it('chooses the package that saves the most money', () => {
    const result = calculateBestPackageDiscount([
      { id: 'a', price: 100 },
      { id: 'b', price: 100 },
      { id: 'c', price: 20 },
    ], [
      { id: 'small', discount_percent: 50, service_package_items: [{ service_id: 'b' }, { service_id: 'c' }] },
      { id: 'large', discount_percent: 35, service_package_items: [{ service_id: 'a' }, { service_id: 'b' }] },
    ])

    expect(result).toEqual({ packageId: 'large', discount: 70 })
  })

  it('caps fixed and percentage coupons at a fifty-cent minimum charge', () => {
    expect(calculateCouponDiscount(10, 'fixed', 50)).toBe(9.5)
    expect(calculateCouponDiscount(10, 'percent', 100)).toBe(9.5)
  })

  it('formats fixed coupon labels without a percentage sign', () => {
    expect(formatCouponLabel('fixed', 5)).toBe('$5.00 de descuento aplicado')
    expect(formatCouponLabel('percent', 15)).toBe('15% de descuento aplicado')
  })
})
