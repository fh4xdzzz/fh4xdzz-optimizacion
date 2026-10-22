import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export const metadata: Metadata = {
  title: 'Términos de servicio | TheDulcanDesign',
  description: 'Condiciones aplicables a servicios, suscripciones y compras realizadas en TheDulcanDesign.',
}

const sections = [
  {
    title: '1. Aceptación y alcance',
    paragraphs: [
      'Estos términos regulan el acceso a TheDulcanDesign y la contratación de servicios, suscripciones y productos ofrecidos en el sitio. Al realizar un pedido, iniciar una suscripción o completar una compra como invitado, confirmas que has leído y aceptas estas condiciones.',
      'Si compras en nombre de una empresa, canal o equipo, declaras que tienes autorización para vincularlo a estos términos. Los derechos obligatorios que te correspondan como consumidor conforme a la legislación aplicable no quedan limitados por este documento.',
    ],
  },
  {
    title: '2. Servicios y productos',
    paragraphs: ['La oferta puede incluir servicios técnicos y creativos, así como productos digitales o físicos. La descripción, el alcance, el precio, la modalidad de pago y el tiempo estimado aplicables son los mostrados antes de confirmar cada compra.'],
    items: [
      'Configuración y optimización de OBS, streaming, Windows y equipos.',
      'Diseño visual, overlays, alertas, edición de video y recursos para creadores.',
      'Creación o configuración de páginas web, servidores y bots de Discord.',
      'Soporte técnico, asesoría y otros servicios personalizados.',
      'Productos digitales descargables y, cuando se indiquen, productos físicos.',
    ],
  },
  {
    title: '3. Cuentas y compras como invitado',
    paragraphs: [
      'Algunas funciones requieren una cuenta vinculada con Discord. La tienda también puede permitir compras como invitado, para las que solicitamos el nombre y correo necesarios para confirmar y entregar el pedido.',
      'Debes proporcionar información completa y correcta, mantener seguras tus credenciales y avisarnos si detectas un uso no autorizado. No somos responsables de retrasos causados por un correo, dirección o información de contacto incorrectos.',
    ],
  },
  {
    title: '4. Pedidos, diagnóstico y alcance',
    paragraphs: [
      'El pedido solo se considera confirmado después de que el procesador de pagos confirme el cobro. Las respuestas del formulario, archivos y mensajes del cliente forman parte del alcance solicitado. Podemos pedir información adicional antes de comenzar.',
      'Los cambios que excedan la descripción comprada podrán requerir un nuevo presupuesto, ampliar el plazo o contratar otro servicio. Los plazos son estimados y pueden variar por la complejidad, la disponibilidad del cliente, revisiones solicitadas o incidencias de terceros.',
    ],
  },
  {
    title: '5. Precios, pagos e impuestos',
    paragraphs: [
      'Este documento no establece precios fijos para servicios concretos. Las tarifas anteriores que pudieran aparecer en copias guardadas, resultados de buscadores o publicaciones antiguas dejan de ser válidas cuando difieren del catálogo actual. Siempre prevalecen el precio y la modalidad de pago mostrados en la página del servicio y en el resumen final antes de pagar.',
      'Los precios se muestran en dólares estadounidenses (USD), salvo que se indique otra moneda. Antes de pagar verás el subtotal, los descuentos aplicados, los cargos recurrentes y el total estimado. Los impuestos o conversiones de moneda pueden depender de tu ubicación y método de pago.',
      'Los pagos son procesados por Stripe. TheDulcanDesign no almacena los datos completos de tu tarjeta. Stripe actúa como procesador de pagos y no como vendedor del producto o servicio contratado.',
    ],
  },
  {
    title: '6. Cupones, paquetes y promociones',
    paragraphs: ['Los cupones y descuentos están sujetos a sus fechas, compra mínima, servicios elegibles y límite de usos. Deben aplicarse antes de pagar, no son canjeables por dinero y no pueden combinarse salvo indicación expresa. Podemos cancelar promociones usadas de forma fraudulenta o contraria a sus condiciones.'],
  },
  {
    title: '7. Suscripciones',
    paragraphs: [
      'Cuando un servicio se indique como suscripción, el resumen de compra mostrará el cargo inicial, si existe, y el importe de renovación. Al confirmar autorizas cobros automáticos con la periodicidad indicada hasta que canceles.',
      'Puedes solicitar la cancelación antes de la siguiente renovación. La cancelación evita cargos futuros y, salvo que la ley aplicable disponga otra cosa, el servicio continúa hasta terminar el período ya pagado. La falta de uso no cancela automáticamente la suscripción. Cualquier cambio de precio se comunicará antes de aplicarse a una renovación futura.',
    ],
  },
  {
    title: '8. Servicios remotos y responsabilidades del cliente',
    paragraphs: [
      'Al contratar una configuración remota autorizas el acceso temporal a tu equipo únicamente para realizar el trabajo acordado. Debes permanecer disponible cuando sea necesario, guardar una copia de seguridad de tus archivos importantes y cerrar información privada que no sea necesaria para el servicio.',
      'No solicitamos contraseñas bancarias ni códigos de pago. Puedes finalizar la sesión remota en cualquier momento. Al terminar, eres responsable de cerrar o desinstalar la herramienta de acceso remoto si no deseas conservarla.',
      'El rendimiento depende del hardware, conexión, controladores, software y plataformas de terceros. Trabajaremos con cuidado y explicaremos los cambios relevantes, pero no garantizamos resultados que excedan las capacidades técnicas del equipo o de servicios externos.',
    ],
  },
  {
    title: '9. Entrega de productos digitales y físicos',
    paragraphs: [
      'Los productos digitales se entregan mediante la página de confirmación, correo electrónico o un enlace privado. Algunos enlaces pueden caducar o tener límites de descarga por seguridad. Debes descargar y respaldar tus archivos dentro del período indicado.',
      'Las compras digitales conceden una licencia personal o comercial limitada según la descripción del producto; no transfieren la propiedad intelectual. No puedes revender, redistribuir, compartir públicamente ni presentar los archivos originales como propios, salvo autorización expresa.',
      'Para productos físicos, debes proporcionar una dirección válida. Los gastos, zonas de entrega y tiempos estimados se mostrarán cuando correspondan. Los retrasos del transportista o aduanas que estén fuera de nuestro control no constituyen una fecha garantizada.',
    ],
  },
  {
    title: '10. Cancelaciones, reembolsos y problemas con una compra',
    paragraphs: [
      'Si necesitas cancelar, contáctanos cuanto antes. Evaluaremos el reembolso según el estado del pedido, el trabajo ya realizado, los recursos personalizados preparados y la legislación aplicable.',
      'En productos digitales, el acceso o la descarga puede limitar la posibilidad de reembolso, excepto cuando el archivo sea defectuoso, no corresponda a lo anunciado o exista un derecho obligatorio aplicable. Primero intentaremos reemplazar o corregir archivos dañados. Para productos físicos, las devoluciones y sus posibles excepciones se informarán según el producto y la normativa aplicable.',
      'Los reembolsos aprobados se envían normalmente al método de pago original. Los tiempos de acreditación dependen de Stripe, del banco y de la red de pago.',
    ],
  },
  {
    title: '11. Revisiones y colaboración',
    paragraphs: [
      'Las revisiones incluidas serán las indicadas en la descripción o propuesta. Debes revisar las entregas y comunicar errores o cambios dentro de un plazo razonable. La falta de respuesta puede pausar el pedido y modificar la fecha estimada.',
      'Las solicitudes de una dirección creativa nueva, funciones adicionales o cambios posteriores a la aprobación pueden cotizarse por separado.',
    ],
  },
  {
    title: '12. Materiales del cliente y propiedad intelectual',
    paragraphs: [
      'Conservas los derechos sobre los materiales que nos entregues. Nos otorgas permiso limitado para usarlos únicamente al preparar, revisar y entregar el pedido. Declaras que tienes autorización para utilizar esos materiales y que no infringen derechos de terceros.',
      'TheDulcanDesign conserva los derechos sobre su sitio, marca, procesos, plantillas, código y recursos preexistentes. Los derechos o licencias sobre el resultado final se determinan por la descripción del servicio o producto. Las licencias de fuentes, música, complementos y otros recursos de terceros siguen sujetas a sus propias condiciones.',
    ],
  },
  {
    title: '13. Uso aceptable',
    paragraphs: ['No puedes utilizar la plataforma, el soporte o las entregas para fraude, acceso no autorizado, malware, acoso, suplantación, infracciones de propiedad intelectual o cualquier actividad ilegal. Podemos rechazar o cancelar pedidos que impliquen riesgos de seguridad, contenido prohibido o información engañosa.'],
  },
  {
    title: '14. Comunicaciones y soporte',
    paragraphs: ['Aceptas recibir mensajes operativos relacionados con pagos, pedidos, entregas, soporte y seguridad por correo, Discord o dentro de la plataforma. Estas comunicaciones no son publicidad. Las conversaciones y archivos de soporte pueden conservarse para atender el pedido y mantener un historial de servicio.'],
  },
  {
    title: '15. Disponibilidad y limitación de responsabilidad',
    paragraphs: [
      'Podemos realizar mantenimiento, corregir errores o interrumpir temporalmente funciones. No garantizamos que el sitio o servicios de terceros estén disponibles sin interrupciones.',
      'En la medida permitida por la ley, no respondemos por pérdidas indirectas, pérdida de datos que no hayan sido respaldados, interrupciones de plataformas externas ni daños derivados de configuraciones modificadas posteriormente por el cliente o terceros. Nada de esta sección excluye responsabilidades que legalmente no puedan limitarse.',
    ],
  },
  {
    title: '16. Privacidad',
    paragraphs: ['El tratamiento de datos personales se explica en nuestra Política de privacidad. Al utilizar el sitio reconoces que Stripe, Supabase, Discord y otros proveedores necesarios pueden tratar información conforme a sus propias políticas y a la finalidad del servicio.'],
  },
  {
    title: '17. Suspensión y terminación',
    paragraphs: ['Podemos limitar cuentas, cancelar pedidos o suspender soporte ante fraude, contracargos abusivos, amenazas, incumplimientos de estos términos o riesgos para clientes, trabajadores o sistemas. Cuando sea posible, explicaremos la medida y cualquier efecto sobre importes ya pagados.'],
  },
  {
    title: '18. Cambios y solución de conflictos',
    paragraphs: [
      'Podemos actualizar estos términos para reflejar cambios del sitio, proveedores o requisitos legales. La fecha de la última actualización aparecerá al final. Los cambios no alterarán retroactivamente una compra ya confirmada salvo que sean necesarios por ley o seguridad.',
      'Si existe un problema, escríbenos primero para intentar resolverlo de buena fe. Se aplicarán las leyes y tribunales que correspondan según las normas obligatorias de jurisdicción y protección al consumidor aplicables al caso.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-24 pt-32">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-primary">Información legal</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Términos de servicio</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted">Condiciones claras para servicios profesionales, suscripciones y compras realizadas en la tienda de TheDulcanDesign.</p>
          <p className="mt-4 text-sm text-muted">Última actualización: 18 de octubre de 2026</p>
        </header>

        <div className="mx-auto mt-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-card/70 p-5 lg:sticky lg:top-28">
            <p className="font-bold">Accesos rápidos</p>
            <nav className="mt-4 space-y-2 text-sm">
              <a href="#pagos" className="block text-muted transition hover:text-primary">Pagos y suscripciones</a>
              <a href="#remoto" className="block text-muted transition hover:text-primary">Servicios remotos</a>
              <a href="#entregas" className="block text-muted transition hover:text-primary">Entregas y descargas</a>
              <a href="#reembolsos" className="block text-muted transition hover:text-primary">Cancelaciones y reembolsos</a>
              <Link href="/privacy" className="block text-muted transition hover:text-primary">Política de privacidad</Link>
            </nav>
          </aside>

          <div className="space-y-5">
            {sections.map((section, index) => {
              const id = index === 4 ? 'pagos' : index === 7 ? 'remoto' : index === 8 ? 'entregas' : index === 9 ? 'reembolsos' : undefined
              return <section id={id} key={section.title} className="scroll-mt-28 rounded-2xl border border-white/10 bg-card/75 p-6 sm:p-7">
                <h2 className="text-xl font-bold sm:text-2xl">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted sm:text-base">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items && <ul className="list-disc space-y-2 pl-5">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                </div>
              </section>
            })}

            <section className="rounded-2xl border border-primary/25 bg-primary/10 p-6 sm:p-7">
              <h2 className="text-xl font-bold sm:text-2xl">19. Contacto</h2>
              <p className="mt-4 leading-7 text-muted">Para preguntas, cancelaciones o problemas relacionados con una compra, escribe a <a className="font-semibold text-primary hover:underline" href="mailto:thedulcandesign@gmail.com">thedulcandesign@gmail.com</a> o utiliza el soporte disponible en la página.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
