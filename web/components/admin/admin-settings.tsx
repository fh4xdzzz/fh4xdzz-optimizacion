'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationStore } from '@/lib/notifications-store'
import { DEFAULT_DISCORD_INVITE_URL, resolveDiscordInviteUrl } from '@/lib/site-config'

type Settings = {
  business_info: { name: string; email: string; phone: string; address: string; discord: string }
  social_links: { discord: string; twitter: string; youtube: string; instagram: string }
  contact_form: { enabled: boolean; recaptcha_enabled: boolean }
  payment_settings: { currency: 'USD' | 'EUR' | 'MXN' | 'COP'; paypal_enabled: boolean; stripe_enabled: boolean }
}

const defaults: Settings = {
  business_info: { name: 'TheDulcanDesign', email: 'thedulcandesign@gmail.com', phone: '', address: '', discord: DEFAULT_DISCORD_INVITE_URL },
  social_links: { discord: DEFAULT_DISCORD_INVITE_URL, twitter: '', youtube: '', instagram: '' },
  contact_form: { enabled: true, recaptcha_enabled: false },
  payment_settings: { currency: 'USD', paypal_enabled: false, stripe_enabled: false },
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { success, error: notifyError } = useNotificationStore()

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No se pudo cargar la configuración')
        const discord = resolveDiscordInviteUrl(
          body.settings?.social_links?.discord,
          body.settings?.business_info?.discord,
        )
        setSettings({
          ...defaults,
          ...body.settings,
          business_info: { ...defaults.business_info, ...body.settings?.business_info, discord },
          social_links: { ...defaults.social_links, ...body.settings?.social_links, discord },
          contact_form: { ...defaults.contact_form, ...body.settings?.contact_form },
          payment_settings: { ...defaults.payment_settings, ...body.settings?.payment_settings },
        })
      })
      .catch((err) => notifyError(err.message))
      .finally(() => setLoading(false))
  }, [notifyError])

  const save = async () => {
    setSaving(true)
    try {
      const discord = settings.business_info.discord.trim().replace(/\/$/, '')
      const normalizedSettings = {
        ...settings,
        business_info: { ...settings.business_info, discord },
        social_links: { ...settings.social_links, discord },
      }
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedSettings),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo guardar')
      setSettings(normalizedSettings)
      success('Configuración guardada correctamente')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted">Cargando configuración...</p>

  const inputClass = 'w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Información del Negocio</CardTitle><CardDescription>Configura la información básica de tu negocio</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>Nombre del negocio<input className={inputClass} value={settings.business_info.name} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, name: e.target.value } }))} /></label>
            <label>Email de contacto<input type="email" className={inputClass} value={settings.business_info.email} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, email: e.target.value } }))} /></label>
            <label>Teléfono<input className={inputClass} value={settings.business_info.phone} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, phone: e.target.value } }))} /></label>
            <label>Dirección<input className={inputClass} value={settings.business_info.address} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, address: e.target.value } }))} /></label>
          </div>
          <label>Enlace de invitación de Discord<input type="url" className={inputClass} value={settings.business_info.discord} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, discord: e.target.value }, social_links: { ...s.social_links, discord: e.target.value } }))} /><span className="mt-1 block text-sm text-muted">Este único enlace se usa en la barra superior, el menú móvil, el pie de página y las páginas de servicios.</span></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Redes Sociales</CardTitle><CardDescription>Enlaces públicos de la marca</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['twitter', 'youtube', 'instagram'] as const).map((key) => (
            <label key={key} className="capitalize">{key}<input type="url" className={inputClass} value={settings.social_links[key]} onChange={(e) => setSettings(s => ({ ...s, social_links: { ...s.social_links, [key]: e.target.value } }))} /></label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contacto y Pagos</CardTitle><CardDescription>Activa funciones públicas y métodos de pago</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between">Habilitar formulario<input type="checkbox" checked={settings.contact_form.enabled} onChange={(e) => setSettings(s => ({ ...s, contact_form: { ...s.contact_form, enabled: e.target.checked } }))} /></label>
          <label className="flex items-center justify-between">Habilitar reCAPTCHA<input type="checkbox" checked={settings.contact_form.recaptcha_enabled} onChange={(e) => setSettings(s => ({ ...s, contact_form: { ...s.contact_form, recaptcha_enabled: e.target.checked } }))} /></label>
          <label>Moneda<select className={inputClass} value={settings.payment_settings.currency} onChange={(e) => setSettings(s => ({ ...s, payment_settings: { ...s.payment_settings, currency: e.target.value as Settings['payment_settings']['currency'] } }))}><option value="USD">USD</option><option value="EUR">EUR</option><option value="MXN">MXN</option><option value="COP">COP</option></select></label>
          <label className="flex items-center justify-between">Habilitar Stripe<input type="checkbox" checked={settings.payment_settings.stripe_enabled} onChange={(e) => setSettings(s => ({ ...s, payment_settings: { ...s.payment_settings, stripe_enabled: e.target.checked } }))} /></label>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar todos los cambios'}</Button>
    </div>
  )
}
