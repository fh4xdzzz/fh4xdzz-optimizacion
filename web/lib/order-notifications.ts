type OrderNotificationKind =
  | 'paid'
  | 'assigned'
  | 'status_changed'
  | 'waiting_client'
  | 'completed'
  | 'cancelled'
  | 'deliverable_ready'

interface OrderEmailData {
  kind: OrderNotificationKind
  eventId: string
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  serviceName: string
  status?: string
  note?: string
  estimatedCompletion?: string | null
  assignedName?: string | null
}

const statusLabels: Record<string, string> = {
  reviewing: 'En revisión',
  in_progress: 'En progreso',
  waiting_client: 'Esperando tu respuesta',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] || character)
}

function formatDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Santo_Domingo',
  }).format(date)
}

function getCopy(data: OrderEmailData) {
  const status = statusLabels[data.status || ''] || 'Actualizado'
  switch (data.kind) {
    case 'paid':
      return {
        subject: `Pago confirmado · ${data.orderNumber}`,
        eyebrow: 'Pago confirmado',
        title: 'Tu pedido ya está en revisión',
        message: 'Recibimos tu pago correctamente. Nuestro equipo revisará los detalles y comenzará a trabajar en tu servicio.',
      }
    case 'assigned':
      return {
        subject: `Especialista asignado · ${data.orderNumber}`,
        eyebrow: 'Tu pedido avanzó',
        title: 'Ya tienes un especialista asignado',
        message: data.assignedName
          ? `${data.assignedName} estará a cargo de tu servicio.`
          : 'Nuestro equipo ya asignó un especialista a tu servicio.',
      }
    case 'waiting_client':
      return {
        subject: `Necesitamos tu respuesta · ${data.orderNumber}`,
        eyebrow: 'Acción requerida',
        title: 'Necesitamos información para continuar',
        message: 'Tu pedido está en espera de tu respuesta. Abre el seguimiento privado para revisar el mensaje del equipo.',
      }
    case 'completed':
      return {
        subject: `Pedido completado · ${data.orderNumber}`,
        eyebrow: 'Trabajo finalizado',
        title: 'Tu servicio está listo',
        message: 'El equipo marcó tu pedido como completado. Puedes revisar el resultado y escribirnos desde tu área privada si necesitas ayuda.',
      }
    case 'cancelled':
      return {
        subject: `Actualización de tu pedido · ${data.orderNumber}`,
        eyebrow: 'Pedido actualizado',
        title: 'Tu pedido fue cancelado',
        message: 'El estado de tu pedido cambió a cancelado. Si tienes alguna pregunta, abre el soporte privado para que podamos ayudarte.',
      }
    case 'deliverable_ready':
      return {
        subject: `Nueva entrega disponible · ${data.orderNumber}`,
        eyebrow: 'Archivo listo para descargar',
        title: 'Tienes una nueva entrega privada',
        message: 'El equipo agregó un archivo a tu pedido. Inicia sesión para descargarlo de forma segura desde tu área privada.',
      }
    default:
      return {
        subject: `Pedido ${status.toLowerCase()} · ${data.orderNumber}`,
        eyebrow: 'Actualización de pedido',
        title: `Tu pedido está ${status.toLowerCase()}`,
        message: 'Hay una nueva actualización en tu servicio. Consulta los detalles en el seguimiento privado de tu cuenta.',
      }
  }
}

export async function sendOrderNotificationEmail(data: OrderEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !data.customerEmail) {
    console.warn('[order-email] Resend o correo del cliente no configurado')
    return false
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.thedulcandesign.com').replace(/\/$/, '')
  const from = process.env.EMAIL_FROM || 'TheDulcanDesign <soporte@thedulcandesign.com>'
  const logoUrl = `${siteUrl}/thedulcandesign-icon.png`
  const copy = getCopy(data)
  const estimated = formatDate(data.estimatedCompletion)
  const note = data.note?.trim()
  const safeName = escapeHtml(data.customerName || 'cliente')
  const safeService = escapeHtml(data.serviceName || 'Servicio')
  const safeOrderNumber = escapeHtml(data.orderNumber)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `tdd-${data.eventId}`.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [data.customerEmail],
      subject: copy.subject,
      html: `<!doctype html>
<html lang="es"><body style="margin:0;background:#07070b;color:#f8fafc;font-family:Arial,sans-serif">
  <div style="padding:40px 16px">
    <div style="max-width:600px;margin:0 auto;border:1px solid #29283d;border-radius:20px;overflow:hidden;background:#12121a">
      <div style="padding:30px;background:linear-gradient(135deg,#17172b,#292052)">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;border-collapse:collapse">
          <tr>
            <td style="width:58px;vertical-align:middle">
              <img src="${logoUrl}" width="52" height="52" alt="TheDulcanDesign" style="display:block;width:52px;height:52px;border:0;border-radius:14px;object-fit:cover" />
            </td>
            <td style="padding-left:12px;vertical-align:middle;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.2px">TheDulcanDesign</td>
          </tr>
        </table>
        <div style="color:#9b87f5;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">TheDulcanDesign · ${escapeHtml(copy.eyebrow)}</div>
        <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:#fff">${escapeHtml(copy.title)}</h1>
        <p style="margin:0;color:#c7c5d8;line-height:1.65">Hola ${safeName}, ${escapeHtml(copy.message)}</p>
      </div>
      <div style="padding:28px 30px">
        <div style="padding:18px;border-radius:14px;background:#191925;border:1px solid #303047">
          <div style="font-size:12px;color:#8d8ba3;text-transform:uppercase">Pedido</div>
          <div style="margin-top:5px;font-size:18px;font-weight:700;color:#fff">${safeOrderNumber}</div>
          <div style="margin-top:12px;color:#c7c5d8">${safeService}</div>
          ${data.status ? `<div style="margin-top:10px;color:#a99af5">Estado: ${escapeHtml(statusLabels[data.status] || data.status)}</div>` : ''}
          ${estimated ? `<div style="margin-top:10px;color:#c7c5d8">Fecha estimada: ${escapeHtml(estimated)}</div>` : ''}
          ${note ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid #303047;color:#e4e2ed;line-height:1.55">${escapeHtml(note)}</div>` : ''}
        </div>
        <a href="${siteUrl}/pedidos" style="display:block;margin-top:22px;padding:14px 20px;border-radius:12px;background:#6757f5;color:#fff;text-align:center;text-decoration:none;font-weight:700">${data.kind === 'deliverable_ready' ? 'Ver y descargar entrega' : 'Ver seguimiento privado'}</a>
        <p style="margin:22px 0 0;color:#858298;font-size:12px;line-height:1.5">Este mensaje contiene información privada de tu pedido. No compartas este correo.</p>
      </div>
    </div>
  </div>
</body></html>`,
    }),
  })

  if (!response.ok) {
    console.error('[order-email] No se pudo enviar', response.status, await response.text())
    return false
  }

  return true
}
