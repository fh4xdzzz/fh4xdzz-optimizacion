import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentSuccessPage() {
  return <div className="min-h-screen bg-background"><Navbar /><section className="px-4 pb-20 pt-32">
    <div className="container mx-auto max-w-2xl"><Card className="border-green-500/50"><CardHeader>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl text-green-400">✓</div>
      <CardTitle className="text-3xl">¡Pago recibido!</CardTitle><CardDescription>Tu contratación fue confirmada de forma segura.</CardDescription>
    </CardHeader><CardContent className="space-y-5"><p>Estamos creando tu pedido y notificando al equipo. Normalmente aparecerá en pocos segundos.</p>
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm sm:grid-cols-3"><span>1. Pago confirmado</span><span>2. Revisión del equipo</span><span>3. Coordinamos contigo</span></div>
      <div className="flex flex-wrap gap-3"><Link href="/pedidos" className="inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">Ver mi pedido</Link><Link href="/servicios" className="inline-flex rounded-lg border border-border px-5 py-3 font-semibold">Volver a servicios</Link></div>
    </CardContent></Card></div>
  </section><Footer /></div>
}
