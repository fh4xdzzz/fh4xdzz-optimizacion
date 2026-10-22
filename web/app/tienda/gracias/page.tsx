import StoreThanksClient from './store-thanks-client'

export default async function StoreThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams
  return <StoreThanksClient sessionId={params.session_id} />
}
