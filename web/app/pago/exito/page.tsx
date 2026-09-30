import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentSuccessPage() {
  return <div className="min-h-screen bg-background"><Navbar /><section className="px-4 pb-20 pt-32">
    <div className="container mx-auto max-w-2xl"><Card className="border-green-500/50"><CardHeader>
      <CardTitle>¡Pago recibido!</CardTitle><CardDescription>Stripe está confirmando el pago de forma segura.</CardDescription>
    </CardHeader><CardContent className="space-y-4"><p>Tu pedido se actualizará automáticamente. Esto normalmente tarda sólo unos segundos.</p>
      <Link href="/pedidos" className="inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Ver mis pedidos</Link>
    </CardContent></Card></div>
  </section><Footer /></div>
}
