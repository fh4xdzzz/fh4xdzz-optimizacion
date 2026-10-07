export type PricedService = {
  id: string
  price: number | string
}

export type ServicePackage = {
  id: string
  discount_percent: number | string
  service_package_items?: Array<{ service_id: string }> | null
}

export type CouponKind = 'percent' | 'fixed'

const roundMoney = (value: number) => Number(value.toFixed(2))

export function calculateBestPackageDiscount(
  services: PricedService[],
  packages: ServicePackage[],
) {
  const prices = new Map(services.map((service) => [service.id, Number(service.price)]))

  return packages.reduce<{ packageId: string | null; discount: number }>((best, pack) => {
    const packageIds = [...new Set((pack.service_package_items || []).map((item) => item.service_id))]
    if (packageIds.length < 2 || !packageIds.every((id) => prices.has(id))) return best

    const eligibleSubtotal = packageIds.reduce((sum, id) => sum + (prices.get(id) || 0), 0)
    const discount = roundMoney(eligibleSubtotal * Number(pack.discount_percent) / 100)
    return discount > best.discount ? { packageId: pack.id, discount } : best
  }, { packageId: null, discount: 0 })
}

export function calculateCouponDiscount(
  base: number,
  kind: CouponKind,
  value: number | string,
) {
  const numericValue = Number(value)
  const rawDiscount = kind === 'percent' ? base * numericValue / 100 : numericValue
  return roundMoney(Math.min(Math.max(0, rawDiscount), Math.max(0, base - 0.5)))
}

export function formatCouponLabel(kind: CouponKind, value: number | string) {
  const amount = Number(value)
  return kind === 'percent'
    ? `${amount}% de descuento aplicado`
    : `$${amount.toFixed(2)} de descuento aplicado`
}
