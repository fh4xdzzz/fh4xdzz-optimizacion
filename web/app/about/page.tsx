import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Sobre Nosotros</h1>
          <p className="text-xl text-muted mb-8">
            Conoce al equipo detrás de TheDulcanDesign
          </p>

          <div className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Nuestra Misión</h2>
              <p className="text-muted">
                En TheDulcanDesign, nos dedicamos a brindar servicios profesionales de optimización y configuración para streaming, gaming y soporte técnico. Nuestro objetivo es ayudarte a obtener el mejor rendimiento de tu equipo y contenido.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Nuestra Visión</h2>
              <p className="text-muted">
                Ser la referencia número uno en servicios de optimización técnica para creadores de contenido y gamers, ofreciendo soluciones personalizadas y soporte de calidad.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Nuestros Valores</h2>
              <ul className="space-y-2 text-muted">
                <li>• Calidad y profesionalismo en cada servicio</li>
                <li>• Atención personalizada para cada cliente</li>
                <li>• Innovación constante en nuestras soluciones</li>
                <li>• Compromiso con la satisfacción del cliente</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
