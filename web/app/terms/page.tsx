import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Términos de Servicio</h1>
          <p className="text-xl text-muted mb-8">
            Última actualización: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">1. Aceptación de Términos</h2>
              <p className="text-muted">
                Al acceder y utilizar los servicios de TheDulcanDesign, aceptas cumplir con estos términos de servicio y todas las leyes y regulaciones aplicables.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">2. Servicios</h2>
              <p className="text-muted">
                TheDulcanDesign ofrece servicios de optimización y configuración para streaming, gaming y soporte técnico. Nos reservamos el derecho de modificar, suspender o discontinuar cualquier servicio en cualquier momento sin previo aviso.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">3. Pagos y Reembolsos</h2>
              <p className="text-muted">
                Todos los pagos se procesan a través de plataformas seguras. Los reembolsos están sujetos a nuestra política de reembolsos y se evalúan caso por caso.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">4. Propiedad Intelectual</h2>
              <p className="text-muted">
                Todo el contenido, incluyendo pero no limitado a texto, gráficos, logos, imágenes y software, es propiedad de TheDulcanDesign o sus licenciantes y está protegido por leyes de propiedad intelectual.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">5. Limitación de Responsabilidad</h2>
              <p className="text-muted">
                TheDulcanDesign no será responsable por ningún daño indirecto, incidental, especial o consecuente que resulte del uso o incapacidad de usar nuestros servicios.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">6. Modificaciones</h2>
              <p className="text-muted">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor tan pronto como se publiquen en este sitio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
