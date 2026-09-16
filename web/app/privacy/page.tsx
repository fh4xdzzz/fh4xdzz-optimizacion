import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Política de Privacidad</h1>
          <p className="text-xl text-muted mb-8">
            Última actualización: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">1. Información que Recopilamos</h2>
              <p className="text-muted">
                Recopilamos información personal que nos proporcionas voluntariamente, incluyendo nombre, email, y otros datos de contacto necesarios para brindar nuestros servicios.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">2. Uso de la Información</h2>
              <p className="text-muted">
                Utilizamos tu información para proporcionar, mantener y mejorar nuestros servicios, procesar pagos, comunicarnos contigo, y cumplir con obligaciones legales.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">3. Compartir de Información</h2>
              <p className="text-muted">
                No compartimos tu información personal con terceros, excepto cuando es necesario para proporcionar nuestros servicios, cumplir con la ley, o proteger nuestros derechos.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">4. Seguridad de Datos</h2>
              <p className="text-muted">
                Implementamos medidas de seguridad para proteger tu información contra acceso no autorizado, alteración o destrucción. Utilizamos Supabase para almacenar datos de forma segura.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">5. Tus Derechos</h2>
              <p className="text-muted">
                Tienes derecho a acceder, corregir o eliminar tu información personal. También puedes optar por no recibir comunicaciones de marketing.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">6. Cookies</h2>
              <p className="text-muted">
                Utilizamos cookies para mejorar tu experiencia en nuestro sitio. Puedes configurar tu navegador para rechazar cookies, pero esto puede afectar la funcionalidad del sitio.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">7. Contacto</h2>
              <p className="text-muted">
                Si tienes preguntas sobre esta política de privacidad, contáctanos en thedulcandesign@gmail.com
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
