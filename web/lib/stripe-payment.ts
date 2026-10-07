export function isSubscriptionRenewalInvoice(billingReason: string | null) {
  return billingReason !== 'subscription_create'
    && Boolean(billingReason?.startsWith('subscription'))
}
