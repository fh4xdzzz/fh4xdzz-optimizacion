import { Metadata } from 'next'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Términos de Servicio - TheDulcanDesign',
  description: 'Términos y condiciones de servicio de TheDulcanDesign'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-center">Términos de Servicio</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">1. Aceptación de Términos</h2>
              <p className="text-muted-foreground">
                Al acceder y utilizar los servicios de TheDulcanDesign, aceptas estos términos de servicio. 
                Si no estás de acuerdo con estos términos, por favor no utilices nuestros servicios.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">2. Servicios Ofrecidos</h2>
              <p className="text-muted-foreground mb-4">
                TheDulcanDesign ofrece los siguientes servicios:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Configuración y optimización de OBS para streaming</li>
                <li>Optimización de Windows para gaming</li>
                <li>Soporte técnico para PC y hardware</li>
                <li>Configuración de audio y video para streaming</li>
                <li>Asesoría en configuración de bitrate y encoder</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">3. Responsabilidades del Usuario</h2>
              <p className="text-muted-foreground mb-4">
                Como usuario, eres responsable de:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Proporcionar información precisa y veraz</li>
                <li>Mantener tus credenciales de cuenta seguras</li>
                <li>No utilizar nuestros servicios para actividades ilegales</li>
                <li>Respetar las directrices proporcionadas por nuestro equipo</li>
                <li>Realizar los pages correspondientes a tiempo</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">4. Precios y Pagos</h2>
              <p className="text-muted-foreground mb-4">
                Nuestros precios son los siguientes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Configuración OBS: $25 USD</li>
                <li>Optimización PC: $30 USD</li>
                <li>Soporte técnico: $20 USD/hora</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Los pagos se realizan a través de plataformas seguras. Una vez iniciado el servicio, 
                no se realizarán reembolsos salvo en casos excepcionales.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">5. Propiedad Intelectual</h2>
              <p className="text-muted-foreground">
                Todo el contenido de TheDulcanDesign, incluyendo texto, gráficos, logotipos, 
                imágenes y software, es propiedad exclusiva de TheDulcanDesign y está protegido 
                por las leyes de propiedad intelectual.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">6. Limitación de Responsabilidad</h2>
              <p className="text-muted-foreground">
                TheDulcanDesign no se hace responsable por cualquier daño directo, indirecto, 
                incidental o consecuente que pueda resultar del uso de nuestros servicios. 
                Nos esforzamos por proporcionar servicios de alta calidad, pero no garantizamos 
                resultados específicos.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">7. Modificaciones de los Términos</h2>
              <p className="text-muted-foreground">
                TheDulcanDesign se reserva el derecho de modificar estos términos en cualquier momento. 
                Las modificaciones entrarán en vigor inmediatamente después de su publicación. 
                Se recomienda revisar estos términos periódicamente.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">8. Contacto</h2>
              <p className="text-muted-foreground">
                Para cualquier pregunta sobre estos términos de servicio, puedes contactarnos a través de:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Email: support@thedulcandesign.com</li>
                <li>Discord: Nuestro servidor de Discord</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm text-muted-foreground">
                Última actualización: {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
