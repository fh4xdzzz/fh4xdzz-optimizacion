import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'

export default function ServiceNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-20 pt-32 text-center">
        <h1 className="mb-4 text-4xl font-bold">Servicio no encontrado</h1>
        <p className="mb-8 text-muted">El servicio que buscas no existe o ya no está disponible.</p>
        <Button variant="primary" href="/servicios">Volver a Servicios</Button>
      </main>
      <Footer />
    </div>
  )
}
