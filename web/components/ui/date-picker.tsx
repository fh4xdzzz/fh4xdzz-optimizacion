'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  includeTime?: boolean
  placeholder?: string
  className?: string
}

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const pad = (value: number) => String(value).padStart(2, '0')
const toDateValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function DatePicker({ id, value, onChange, min, includeTime = false, placeholder = 'Seleccionar fecha', className }: Props) {
  const selectedDate = value.split('T')[0]
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date())
  const [draftDate, setDraftDate] = useState(selectedDate)
  const [time, setTime] = useState(value.split('T')[1]?.slice(0, 5) || '12:00')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])

  const days = useMemo(() => {
    const year = view.getFullYear()
    const month = view.getMonth()
    const leading = (new Date(year, month, 1).getDay() + 6) % 7
    const count = new Date(year, month + 1, 0).getDate()
    return [...Array(leading).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1))]
  }, [view])

  const display = selectedDate
    ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`)) + (includeTime ? ` · ${value.split('T')[1]?.slice(0, 5) || time}` : '')
    : placeholder

  const selectDay = (date: Date) => {
    const next = toDateValue(date)
    if (min && next < min) return
    setDraftDate(next)
    if (!includeTime) { onChange(next); setOpen(false) }
  }

  return <div ref={root} className={cn('relative', className)}>
    <button id={id} type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-left transition hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary">
      <span className={selectedDate ? 'font-medium text-foreground' : 'text-muted'}>{display}</span>
      <CalendarDays className="h-5 w-5 text-primary" />
    </button>
    {open && <div role="dialog" aria-label="Seleccionar fecha" className="absolute right-0 z-[120] mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-primary/30 bg-[#11111b] p-4 shadow-2xl shadow-black/60">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="rounded-xl border border-white/10 p-2 hover:border-primary/50 hover:bg-primary/10"><ChevronLeft className="h-4 w-4" /></button>
        <strong className="capitalize">{months[view.getMonth()]} {view.getFullYear()}</strong>
        <button type="button" aria-label="Mes siguiente" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="rounded-xl border border-white/10 p-2 hover:border-primary/50 hover:bg-primary/10"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">{weekdays.map(day => <span key={day} className="py-1 text-xs font-bold text-muted">{day}</span>)}{days.map((date, index) => date ? <button key={date.toISOString()} type="button" disabled={Boolean(min && toDateValue(date) < min)} onClick={() => selectDay(date)} className={cn('aspect-square rounded-lg text-sm transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-20', draftDate === toDateValue(date) && 'bg-primary font-bold text-white shadow-lg shadow-primary/25')}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}</div>
      {includeTime && <div className="mt-4 border-t border-white/10 pt-4"><label className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" />Hora de entrega</label><input type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-primary" /><button type="button" disabled={!draftDate} onClick={() => { onChange(`${draftDate}T${time}`); setOpen(false) }} className="mt-3 h-11 w-full rounded-xl bg-primary font-bold text-white transition hover:brightness-110 disabled:opacity-50">Aplicar fecha y hora</button></div>}
      <button type="button" onClick={() => { onChange(''); setDraftDate(''); setOpen(false) }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted hover:text-white"><X className="h-3.5 w-3.5" />Dejar sin fecha</button>
    </div>}
  </div>
}
