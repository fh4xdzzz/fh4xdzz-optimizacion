import { describe, expect, it } from 'vitest'
import { isSubscriptionRenewalInvoice } from '@/lib/stripe-payment'

describe('Stripe payment classification', () => {
  it('does not count the initial subscription invoice twice', () => {
    expect(isSubscriptionRenewalInvoice('subscription_create')).toBe(false)
  })

  it.each(['subscription_cycle', 'subscription_update', 'subscription_threshold'])(
    'counts %s as subscription revenue after checkout',
    (reason) => expect(isSubscriptionRenewalInvoice(reason)).toBe(true),
  )

  it('ignores invoices unrelated to subscriptions', () => {
    expect(isSubscriptionRenewalInvoice('manual')).toBe(false)
    expect(isSubscriptionRenewalInvoice(null)).toBe(false)
  })
})
