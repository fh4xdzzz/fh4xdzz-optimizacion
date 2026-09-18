import { Metadata } from 'next'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Política de Privacidad - TheDulcanDesign',
  description: 'Política de privacidad de TheDulcanDesign'
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-center">Política de Privacidad</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">1. Introducción</h2>
              <p className="text-muted-foreground">
                TheDulcanDesign se compromete a proteger la privacidad de sus usuarios. 
                Esta política de privacidad explica cómo recopilamos, utilizamos y protegemos 
                tu información personal.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">2. Información que Recopilamos</h2>
              <p className="text-muted-foreground mb-4">
                Recopilamos la siguiente información:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Información de cuenta:</strong> Nombre, email, nombre de usuario</li>
                <li><strong>Información de Discord:</strong> ID de Discord, nombre de usuario, avatar</li>
                <li><strong>Información de servicio:</strong> Historial de chat, tickets de soporte, pedidos</li>
                <li><strong>Información de pago:</strong> Información de pago procesada a través de plataformas seguras</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">3. Cómo Utilizamos tu Información</h2>
              <p className="text-muted-foreground mb-4">
                Utilizamos tu información para:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Proporcionar nuestros servicios de optimización y soporte</li>
                <li>Procesar pedidos y pagos</li>
                <li>Comunicarnos contigo sobre tus pedidos y soporte</li>
                <li>Mejorar nuestros servicios</li>
                <li>Enviar notificaciones importantes</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">4. Compartición de Información</h2>
              <p className="text-muted-foreground mb-4">
                No compartimos tu información personal con terceros, excepto:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Con proveedores de servicios necesarios para operar nuestra plataforma</li>
                <li>Cuando sea requerido por ley</li>
                <li>Para proteger nuestros derechos o los de nuestros usuarios</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">5. Discord Bot</h2>
              <p className="text-muted-foreground mb-4">
                Nuestro bot de Discord recopila la siguiente información:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>ID de Discord, nombre de usuario, avatar</li>
                <li>Historial de comandos utilizados</li>
                <li>Información de servidores donde está activo el bot</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Esta información se utiliza exclusivamente para proporcionar el servicio del bot 
                y mejorar nuestra asistencia. No vendemos ni compartimos esta información con terceros.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">6. Seguridad de Datos</h2>
              <p className="text-muted-foreground">
                Implementamos medidas de seguridad robustas para proteger tu información:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Encriptación de datos en tránsito y en reposo</li>
                <li>Autenticación segura mediante OAuth de Discord</li>
                <li>Acceso restringido a datos sensibles</li>
                <li>Auditorías de seguridad regulares</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">7. Tus Derechos</h2>
              <p className="text-muted-foreground mb-4">
                Tienes derecho a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Acceder a tu información personal</li>
                <li>Corregir información inexacta</li>
                <li>Eliminar tu cuenta y datos personales</li>
                <li>Optar de recibir comunicaciones de marketing</li>
                <li>Exportar tus datos</li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">8. Cookies</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies para mejorar tu experiencia en nuestro sitio web. 
                Puedes configurar tu navegador para rechazar cookies, pero esto puede afectar 
                la funcionalidad del sitio.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">9. Cambios a esta Política</h2>
              <p className="text-muted-foreground">
                Podemos actualizar esta política de privacidad periódicamente. Te notificaremos 
                de cambios importantes mediante correo electrónico o mediante un aviso en nuestro sitio web.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">10. Contacto</h2>
              <p className="text-muted-foreground mb-4">
                Si tienes preguntas sobre esta política de privacidad o tus datos personales, 
                contáctanos a través de:
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
