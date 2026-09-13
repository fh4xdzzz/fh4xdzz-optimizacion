/**
 * Discord Integration Service
 * Servicio server-side para comunicación segura con Discord
 */

interface DiscordEvent {
  event_id: string
  event_type: string
  created_at: string
  organization_id: string
  payload: Record<string, any>
}

interface DiscordConfig {
  webhookUrl: string
  webhookSecret: string
  botApiUrl: string
  botApiSecret: string
  notificationChannelId?: string
}

class DiscordIntegrationService {
  private config: DiscordConfig

  constructor() {
    this.config = {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      webhookSecret: process.env.DISCORD_WEBHOOK_SECRET || '',
      botApiUrl: process.env.DISCORD_BOT_API_URL || '',
      botApiSecret: process.env.DISCORD_BOT_API_SECRET || '',
      notificationChannelId: process.env.DISCORD_NOTIFICATION_CHANNEL_ID || ''
    }
  }

  /**
   * Enviar evento a Discord de forma segura
   */
  async sendDiscordEvent(event: DiscordEvent): Promise<boolean> {
    try {
      if (!this.config.webhookUrl || !this.config.webhookSecret) {
        console.warn('Discord webhook no configurado')
        return false
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.webhookSecret}`
        },
        body: JSON.stringify(event)
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Error enviando evento a Discord:', error)
        return false
      }

      console.log(`✅ Evento ${event.event_type} enviado a Discord`)
      return true
    } catch (error) {
      console.error('Error en sendDiscordEvent:', error)
      return false
    }
  }

  /**
   * Notificar nuevo pedido
   */
  async notifyNewOrder(orderData: {
    order_id: string
    order_number: string
    service_name: string
    customer_name: string
    customer_email: string
    status: string
    description?: string
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `order_${orderData.order_id}_${Date.now()}`,
      event_type: 'order.created',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        order_id: orderData.order_id,
        order_number: orderData.order_number,
        service_name: orderData.service_name,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        status: orderData.status,
        description: orderData.description
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar pedido pagado
   */
  async notifyOrderPaid(orderData: {
    order_id: string
    order_number: string
    service_name: string
    customer_name: string
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `order_paid_${orderData.order_id}_${Date.now()}`,
      event_type: 'order.paid',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        order_id: orderData.order_id,
        order_number: orderData.order_number,
        service_name: orderData.service_name,
        customer_name: orderData.customer_name
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar pedido completado
   */
  async notifyOrderCompleted(orderData: {
    order_id: string
    order_number: string
    service_name: string
    customer_name: string
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `order_completed_${orderData.order_id}_${Date.now()}`,
      event_type: 'order.completed',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        order_id: orderData.order_id,
        order_number: orderData.order_number,
        service_name: orderData.service_name,
        customer_name: orderData.customer_name
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar nuevo ticket
   */
  async notifyNewTicket(ticketData: {
    ticket_id: string
    customer_name: string
    category: string
    subject: string
    description: string
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `ticket_${ticketData.ticket_id}_${Date.now()}`,
      event_type: 'ticket.created',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        ticket_id: ticketData.ticket_id,
        customer_name: ticketData.customer_name,
        category: ticketData.category,
        subject: ticketData.subject,
        description: ticketData.description
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar mensaje en ticket
   */
  async notifyTicketMessage(ticketData: {
    ticket_id: string
    customer_name: string
    message: string
    sender: 'customer' | 'staff'
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `ticket_message_${ticketData.ticket_id}_${Date.now()}`,
      event_type: 'ticket.message_created',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        ticket_id: ticketData.ticket_id,
        customer_name: ticketData.customer_name,
        message: ticketData.message,
        sender: ticketData.sender
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar nuevo usuario
   */
  async notifyNewUser(userData: {
    user_id: string
    email: string
    full_name?: string
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `user_${userData.user_id}_${Date.now()}`,
      event_type: 'user.created',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        user_id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Notificar alerta del sistema
   */
  async notifySystemAlert(alertData: {
    level: 'info' | 'warning' | 'error' | 'critical'
    message: string
    origin: string
    technical_info?: Record<string, any>
  }): Promise<boolean> {
    const event: DiscordEvent = {
      event_id: `alert_${alertData.level}_${Date.now()}`,
      event_type: 'system.alert',
      created_at: new Date().toISOString(),
      organization_id: 'thedulcandesign',
      payload: {
        level: alertData.level,
        message: alertData.message,
        origin: alertData.origin,
        technical_info: alertData.technical_info
      }
    }

    return this.sendDiscordEvent(event)
  }

  /**
   * Verificar configuración
   */
  isConfigured(): boolean {
    return !!(
      this.config.webhookUrl &&
      this.config.webhookSecret &&
      this.config.botApiUrl &&
      this.config.botApiSecret
    )
  }

  /**
   * Obtener configuración (sin secretos)
   */
  getConfigInfo() {
    return {
      webhookUrl: this.config.webhookUrl ? 'Configurado' : 'No configurado',
      botApiUrl: this.config.botApiUrl ? 'Configurado' : 'No configurado',
      notificationChannelId: this.config.notificationChannelId || 'No configurado'
    }
  }
}

// Singleton instance
let discordServiceInstance: DiscordIntegrationService | null = null

export function getDiscordService(): DiscordIntegrationService {
  if (!discordServiceInstance) {
    discordServiceInstance = new DiscordIntegrationService()
  }
  return discordServiceInstance
}

export default DiscordIntegrationService
