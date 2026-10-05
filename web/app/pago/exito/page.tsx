import PaymentSuccessClient from './payment-success-client'

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; cart?: string }> }) {
  const params = await searchParams
  return <PaymentSuccessClient sessionId={params.session_id} isCart={params.cart === '1'} />
}
