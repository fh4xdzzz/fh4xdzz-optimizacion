type ResultDeliveryPreviewProps = {
  index: number
  accent: string
  compact?: boolean
}

export function ResultDeliveryPreview({ index, accent, compact = false }: ResultDeliveryPreviewProps) {
  if (index === 0) {
    const metrics = [
      { label: 'Resolución', shortLabel: 'Salida', value: '1080p' },
      { label: 'Fotogramas', shortLabel: 'Fluidez', value: '60 FPS' },
      { label: 'Bitrate', shortLabel: 'Bitrate', value: '6000' },
    ]

    return (
      <div className={`${compact ? 'mt-4' : 'mt-6'} grid grid-cols-3 gap-2.5`} aria-label="Vista de configuración de OBS">
        {metrics.map(({ label, shortLabel, value }) => (
          <div key={label} className={`rounded-xl border border-white/10 bg-white/[.045] ${compact ? 'p-2.5' : 'p-4'}`}>
            <p className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider text-muted`}>{compact ? shortLabel : label}</p>
            <p className={`${compact ? 'mt-1.5 text-xs' : 'mt-3 text-xl'} font-black text-white`}>{value}</p>
            {!compact && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full w-[86%] rounded-full bg-gradient-to-r ${accent}`} /></div>}
          </div>
        ))}
        {!compact && (
          <div className="col-span-3 flex items-center justify-between rounded-xl border border-emerald-400/15 bg-emerald-400/[.07] px-4 py-3">
            <span className="text-xs font-semibold text-emerald-200">Salida estable y lista para transmitir</span>
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Activo</span>
          </div>
        )}
      </div>
    )
  }

  if (index === 1) {
    return (
      <div className={`${compact ? 'mt-3 min-h-20 grid-cols-[.68fr_1.32fr] gap-2' : 'mt-6 min-h-36 grid-cols-[.72fr_1.28fr] gap-3'} grid`} aria-label="Vista de flujo de streaming">
        <div className={`${compact ? 'space-y-1 p-2' : 'space-y-2 p-3'} rounded-xl border border-white/10 bg-white/[.035]`}>
          <p className="px-1 text-[8px] font-bold uppercase tracking-wider text-muted">Escenas</p>
          {(compact ? ['Inicio', 'En vivo'] : ['Inicio', 'En vivo', 'Pausa']).map((scene, sceneIndex) => <div key={scene} className={`rounded-md font-semibold ${compact ? 'px-2 py-1 text-[8px]' : 'px-3 py-2 text-[11px]'} ${sceneIndex === 1 ? 'bg-primary/20 text-white ring-1 ring-primary/40' : 'bg-white/[.04] text-muted'}`}>{scene}</div>)}
        </div>
        <div className={`${compact ? 'p-2' : 'p-4'} relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#1b1e33] to-[#0a0c13]`}>
          <span className={`${compact ? 'right-2 top-2 text-[7px]' : 'right-3 top-3 text-[9px]'} absolute flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-1 font-bold text-red-300`}><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> EN VIVO</span>
          <div className={`${compact ? 'mt-6 p-2' : 'mt-7 p-3'} rounded-lg border border-white/10 bg-primary/10 text-center`}><p className={`${compact ? 'text-[8px]' : 'text-xs'} font-black uppercase tracking-wider`}>Tu contenido</p>{!compact && <p className="mt-1 text-[9px] text-muted">Escena principal preparada</p>}</div>
          {!compact && (
            <div className="absolute inset-x-4 bottom-4 flex items-end gap-1" aria-hidden="true">
              {[35, 62, 48, 82, 68, 44, 74, 54, 88, 60].map((height, barIndex) => (
                <span
                  key={barIndex}
                  className={`flex-1 rounded-full bg-gradient-to-t ${accent}`}
                  style={{ height: `${Math.max(8, height / 3)}px` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${compact ? 'mt-3' : 'mt-6'} overflow-hidden rounded-xl border border-white/10 bg-[#f7f8fc] text-[#121522]`} aria-label="Vista de página web profesional">
      <div className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} flex items-center gap-1.5 border-b border-black/10 bg-white`} aria-hidden="true"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="ml-2 h-2 flex-1 rounded-full bg-slate-100" /></div>
      <div className={compact ? 'p-2.5' : 'p-4'}>
        <div className="flex items-center justify-between"><span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-black`}>TU MARCA</span><div className="flex gap-2" aria-hidden="true"><span className="h-1.5 w-6 rounded-full bg-slate-300" /><span className="h-1.5 w-6 rounded-full bg-slate-300" /><span className="h-1.5 w-6 rounded-full bg-slate-300" /></div></div>
        <div className={`${compact ? 'mt-2 gap-2' : 'mt-5 gap-4'} grid grid-cols-[1.1fr_.9fr] items-center`}>
          <div><p className={`${compact ? 'text-[10px]' : 'text-lg'} font-black leading-tight`}>Una web clara para presentar tu trabajo</p>{!compact && <p className="mt-2 text-[9px] leading-relaxed text-slate-500">Diseño adaptable, información ordenada y acciones fáciles de encontrar.</p>}<span className={`${compact ? 'mt-2 px-2 py-1 text-[7px]' : 'mt-3 px-3 py-2 text-[9px]'} inline-flex rounded-md bg-gradient-to-r ${accent} font-bold text-white`}>Conocer servicios</span></div>
          <div className={`${compact ? 'h-14 p-1.5' : 'h-24 p-3'} rounded-xl bg-gradient-to-br ${accent}`}><div className="h-full rounded-lg border border-white/25 bg-white/15" /></div>
        </div>
        {!compact && <div className="mt-3 grid grid-cols-3 gap-2">{['Servicios', 'Proceso', 'Contacto'].map((item) => <div key={item} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-[8px] font-bold text-slate-500">{item}</div>)}</div>}
      </div>
    </div>
  )
}
