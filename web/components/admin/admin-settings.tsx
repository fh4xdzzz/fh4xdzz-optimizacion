'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationStore } from '@/lib/notifications-store'

type Settings = {
  business_info: { name: string; email: string; phone: string; address: string; discord: string }
  social_links: { discord: string; twitter: string; youtube: string; instagram: string }
  contact_form: { enabled: boolean; recaptcha_enabled: boolean }
  payment_settings: { currency: 'USD' | 'EUR' | 'MXN' | 'COP'; paypal_enabled: boolean; stripe_enabled: boolean }
}

type OptimizerRelease = {
  id: string
  version: string
  file_name: string
  file_size: number
  sha256: string
  release_notes: string | null
  is_active: boolean
  created_at: string
}

const defaults: Settings = {
  business_info: { name: 'TheDulcanDesign', email: 'thedulcandesign@gmail.com', phone: '', address: '', discord: 'https://discord.gg/DXkEXrYRvM' },
  social_links: { discord: 'https://discord.gg/DXkEXrYRvM', twitter: '', youtube: '', instagram: '' },
  contact_form: { enabled: true, recaptcha_enabled: false },
  payment_settings: { currency: 'USD', paypal_enabled: false, stripe_enabled: false },
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [releases, setReleases] = useState<OptimizerRelease[]>([])
  const [releaseFile, setReleaseFile] = useState<File | null>(null)
  const [releaseVersion, setReleaseVersion] = useState('1.1.0')
  const [releaseNotes, setReleaseNotes] = useState('Integración segura con pedidos y envío privado de diagnósticos.')
  const [uploadingRelease, setUploadingRelease] = useState(false)
  const { success, error: notifyError } = useNotificationStore()

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No se pudo cargar la configuración')
        setSettings({
          ...defaults,
          ...body.settings,
          business_info: { ...defaults.business_info, ...body.settings?.business_info },
          social_links: { ...defaults.social_links, ...body.settings?.social_links },
          contact_form: { ...defaults.contact_form, ...body.settings?.contact_form },
          payment_settings: { ...defaults.payment_settings, ...body.settings?.payment_settings },
        })
      })
      .catch((err) => notifyError(err.message))
      .finally(() => setLoading(false))
  }, [notifyError])

  useEffect(() => {
    fetch('/api/admin/optimizer/releases', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'No se pudieron cargar las versiones')
        setReleases(body.releases || [])
      })
      .catch(err => notifyError(err.message))
  }, [notifyError])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo guardar')
      success('Configuración guardada correctamente')
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const uploadRelease = async () => {
    if (!releaseFile || uploadingRelease) return
    setUploadingRelease(true)
    try {
      const form = new FormData()
      form.set('file', releaseFile)
      form.set('version', releaseVersion)
      form.set('notes', releaseNotes)
      const response = await fetch('/api/admin/optimizer/releases', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo publicar la versión')
      setReleases(current => [body.release, ...current.map(item => ({ ...item, is_active: false }))])
      setReleaseFile(null)
      success(`Dulcan Optimizer ${releaseVersion} publicado`)
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'No se pudo publicar la versión')
    } finally {
      setUploadingRelease(false)
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
          <label>Enlace de Discord<input type="url" className={inputClass} value={settings.business_info.discord} onChange={(e) => setSettings(s => ({ ...s, business_info: { ...s.business_info, discord: e.target.value } }))} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Redes Sociales</CardTitle><CardDescription>Enlaces públicos de la marca</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['discord', 'twitter', 'youtube', 'instagram'] as const).map((key) => (
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

      <Card className="border-cyan-400/25">
        <CardHeader><CardTitle>Dulcan Optimizer</CardTitle><CardDescription>Publica el instalador privado que podrán descargar los clientes con pedidos pagados.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <label>Versión<input className={inputClass} value={releaseVersion} onChange={event => setReleaseVersion(event.target.value)} placeholder="1.1.0" /></label>
            <label>Instalador .exe<input type="file" accept=".exe" onChange={event => setReleaseFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-white" /></label>
          </div>
          <label>Notas de esta versión<textarea className={`${inputClass} min-h-24`} maxLength={2000} value={releaseNotes} onChange={event => setReleaseNotes(event.target.value)} /></label>
          <Button onClick={uploadRelease} disabled={!releaseFile || uploadingRelease}>{uploadingRelease ? 'Publicando instalador…' : 'Publicar versión privada'}</Button>
          <div className="space-y-2 border-t border-white/10 pt-4">
            {releases.map(release => <div key={release.id} className="flex flex-col justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center"><div><p className="font-medium">Dulcan Optimizer {release.version}</p><p className="mt-1 text-xs text-muted">{(release.file_size / 1024 / 1024).toFixed(1)} MB · SHA-256 {release.sha256.slice(0, 12)}…</p></div><span className={`w-fit rounded-full border px-3 py-1 text-xs ${release.is_active ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 text-muted'}`}>{release.is_active ? 'Versión activa' : 'Anterior'}</span></div>)}
            {releases.length === 0 && <p className="text-sm text-muted">Todavía no hay un instalador publicado.</p>}
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar todos los cambios'}</Button>
    </div>
  )
}
