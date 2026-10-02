'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, X } from 'lucide-react'

type Alert = { id: string; name: string; service: string; minutes: number }

export default function RecentActivityAlert() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/recent-activity', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : { alerts: [] })
      .then(payload => { if (active && Array.isArray(payload.alerts)) setAlerts(payload.alerts) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!alerts.length || dismissed) return
    const show = window.setTimeout(() => setVisible(true), 1800)
    const hide = window.setTimeout(() => setVisible(false), 9000)
    const rotate = window.setInterval(() => { setVisible(false); setIndex(current => (current + 1) % alerts.length); window.setTimeout(() => setVisible(true), 500) }, 14000)
    return () => { window.clearTimeout(show); window.clearTimeout(hide); window.clearInterval(rotate) }
  }, [alerts, dismissed])

  if (!visible || !alerts.length || dismissed) return null
  const alert = alerts[index % alerts.length]
  return <aside role="status" aria-live="polite" className="recent-activity-alert fixed bottom-5 left-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-red-400/50 bg-[#120d12]/95 p-3 shadow-2xl shadow-red-950/40 backdrop-blur-xl sm:left-6">
    <div className="flex items-start gap-3"><div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-red-200"><Bell className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-red-200">Actividad reciente</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /></div><p className="mt-1 truncate text-sm font-bold text-white">{alert.name} realizó un pedido</p><p className="mt-1 text-xs text-white/65"><span className="font-semibold text-red-300">{alert.service}</span> · hace {alert.minutes} {alert.minutes === 1 ? 'minuto' : 'minutos'}</p></div><button aria-label="Cerrar alerta" onClick={() => { setDismissed(true); setVisible(false) }} className="rounded-lg p-1 text-white/50 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
    <div className="recent-activity-alert__line" />
  </aside>
}
