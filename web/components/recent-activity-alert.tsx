'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

type Alert = { id: string; name: string; service: string; createdAt: string }

function relativeTime(createdAt: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`

  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'día' : 'días'}`
}

export default function RecentActivityAlert() {
  const pathname = usePathname()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const isPublicMarketingPage = ['/', '/servicios', '/resultados'].includes(pathname)

  useEffect(() => {
    let active = true
    const refreshAlerts = () => {
      fetch('/api/public/recent-activity', { cache: 'no-store' })
        .then(response => response.ok ? response.json() : { alerts: [] })
        .then(payload => {
          if (!active || !Array.isArray(payload.alerts)) return
          setAlerts(current => JSON.stringify(current) === JSON.stringify(payload.alerts) ? current : payload.alerts)
        })
        .catch(() => undefined)
    }

    refreshAlerts()
    const refresh = window.setInterval(refreshAlerts, 30000)
    return () => {
      active = false
      window.clearInterval(refresh)
    }
  }, [])

  useEffect(() => {
    if (!alerts.length || dismissed || !isPublicMarketingPage) return

    let lastIndex = -1
    let queue: number[] = []
    let hideTimer: number | undefined

    const refillQueue = () => {
      queue = alerts.map((_, index) => index)
      for (let index = queue.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[queue[index], queue[randomIndex]] = [queue[randomIndex], queue[index]]
      }
      if (queue.length > 1 && queue[0] === lastIndex) {
        ;[queue[0], queue[1]] = [queue[1], queue[0]]
      }
    }

    const showNext = () => {
      if (!queue.length) refillQueue()
      const nextIndex = queue.shift() ?? 0
      lastIndex = nextIndex
      setCurrentIndex(nextIndex)
      setVisible(true)
      if (hideTimer) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setVisible(false), 9000)
    }

    const initialShow = window.setTimeout(showNext, 2500)
    const rotation = window.setInterval(showNext, 15000)
    return () => {
      window.clearTimeout(initialShow)
      window.clearInterval(rotation)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [alerts, dismissed, isPublicMarketingPage])

  if (!visible || !alerts.length || dismissed || !isPublicMarketingPage) return null
  const alert = alerts[currentIndex] || alerts[0]
  return <aside role="status" aria-live="polite" className="recent-activity-alert fixed bottom-5 left-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-indigo-400/30 bg-gradient-to-br from-[#111322]/95 via-[#121426]/95 to-[#191337]/95 p-3 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:left-6">
    <div className="pointer-events-none absolute inset-x-12 -top-12 h-24 rounded-full bg-indigo-500/20 blur-3xl" />
    <div className="relative flex items-start gap-3"><div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-300 shadow-inner shadow-indigo-400/10"><Bell className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Actividad reciente</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /></div><p className="mt-1 truncate text-sm font-bold text-white">{alert.name} realizó un pedido</p><p className="mt-1 text-xs text-white/60"><span className="font-semibold text-violet-300">{alert.service}</span> · hace {relativeTime(alert.createdAt)}</p></div><button aria-label="Cerrar alerta" onClick={() => { setDismissed(true); setVisible(false) }} className="rounded-lg p-1 text-white/40 transition hover:bg-indigo-400/10 hover:text-white"><X className="h-4 w-4" /></button></div>
    <div className="recent-activity-alert__line" />
  </aside>
}
