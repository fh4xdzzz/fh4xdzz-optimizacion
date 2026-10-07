'use client'

import type { ReactNode } from 'react'

export type ControlPanelNavItem<T extends string> = {
  id: T
  label: string
  description: string
  icon: ReactNode
  count?: number
}

export default function ControlPanelNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: ControlPanelNavItem<T>[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <nav aria-label="Secciones del panel" className="sticky top-20 z-30 mb-8 rounded-2xl border border-white/10 bg-[#0c0e15]/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map(item => {
          const selected = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onChange(item.id)}
              className={`group flex min-w-[170px] flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition duration-200 ${selected ? 'border-primary/60 bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/20' : 'border-transparent bg-white/[.025] text-white/70 hover:border-white/10 hover:bg-white/[.06] hover:text-white'}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-white/15' : 'bg-primary/10 text-primary group-hover:bg-primary/15'}`}>{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold"><span className="truncate">{item.label}</span>{item.count !== undefined && <span className={`rounded-full px-2 py-0.5 text-[11px] ${selected ? 'bg-white/15' : 'bg-white/[.07]'}`}>{item.count}</span>}</span>
                <span className={`mt-0.5 block truncate text-[11px] ${selected ? 'text-white/75' : 'text-white/40'}`}>{item.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
