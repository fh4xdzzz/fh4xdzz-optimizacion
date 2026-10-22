'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, LoaderCircle, PackagePlus, Pencil, RefreshCw, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StoreOrder, StoreProduct } from '@/lib/store-types'

type FormState = {
  id?: number
  name: string
  description: string
  category: string
  price: string
  image_url: string
  product_type: 'digital' | 'physical'
  inventory_count: string
  is_active: boolean
  is_featured: boolean
}

const emptyForm: FormState = { name: '', description: '', category: 'Digital', price: '', image_url: '', product_type: 'digital', inventory_count: '', is_active: true, is_featured: false }
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const date = (value: string) => new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function StoreManager() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/owner/products', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la tienda.')
      setProducts(payload.products || [])
      setOrders(payload.orders || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la tienda.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0)
    return () => clearTimeout(timer)
  }, [load])

  const edit = (product: StoreProduct) => setForm({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: String(product.price),
    image_url: product.image_url || '',
    product_type: product.product_type,
    inventory_count: product.inventory_count == null ? '' : String(product.inventory_count),
    is_active: product.is_active,
    is_featured: product.is_featured,
  })

  const uploadImage = async (file?: File) => {
    if (!file) return
    setUploading(true); setError('')
    try {
      const data = new FormData(); data.append('file', file)
      const response = await fetch('/api/owner/products/image', { method: 'POST', body: data })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo subir la imagen.')
      setForm((current) => ({ ...current, image_url: payload.url }))
      setMessage('Imagen subida correctamente.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo subir la imagen.') }
    finally { setUploading(false) }
  }

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const price = Number(form.price)
      const inventory = form.inventory_count.trim() === '' ? null : Number(form.inventory_count)
      const response = await fetch('/api/owner/products', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}), name: form.name, description: form.description,
          category: form.category, price, image_url: form.image_url || null, product_type: form.product_type,
          inventory_count: inventory, is_active: form.is_active, is_featured: form.is_featured,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el producto.')
      setForm(emptyForm)
      setMessage(form.id ? 'Producto actualizado.' : 'Producto publicado en la tienda.')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el producto.') }
    finally { setSaving(false) }
  }

  const toggle = async (product: StoreProduct) => {
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/owner/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        id: product.id, name: product.name, description: product.description, category: product.category,
        price: Number(product.price), image_url: product.image_url, product_type: product.product_type,
        inventory_count: product.inventory_count, is_active: !product.is_active, is_featured: product.is_featured,
      }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el producto.')
      setProducts((current) => current.map((item) => item.id === product.id ? payload.product : item))
      setMessage(product.is_active ? 'Producto ocultado de la tienda.' : 'Producto publicado nuevamente.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el producto.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border border-white/10 bg-card/75 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-2xl font-black"><PackagePlus className="h-6 w-6 text-primary" />Publicar producto</h2><p className="mt-1 text-sm text-muted">Los clientes podrán comprarlo sin iniciar sesión.</p></div>{form.id && <Button variant="outline" onClick={() => setForm(emptyForm)}>Crear uno nuevo</Button>}</div>
      {error && <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{message && <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      <form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Nombre<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 font-normal outline-none focus:border-primary" /></label>
        <label className="text-sm font-semibold">Categoría<input required minLength={2} maxLength={60} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 font-normal outline-none focus:border-primary" placeholder="Plantillas, Equipos, Recursos…" /></label>
        <label className="text-sm font-semibold md:col-span-2">Descripción<textarea required minLength={10} maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-4 font-normal outline-none focus:border-primary" /></label>
        <label className="text-sm font-semibold">Precio en USD<input required type="number" min="0.50" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 font-normal outline-none focus:border-primary" /></label>
        <label className="text-sm font-semibold">Tipo<select value={form.product_type} onChange={(event) => setForm({ ...form, product_type: event.target.value as 'digital' | 'physical' })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-background px-4 font-normal outline-none focus:border-primary"><option value="digital">Producto digital</option><option value="physical">Producto físico</option></select></label>
        <label className="text-sm font-semibold">Inventario <span className="font-normal text-muted">(vacío = ilimitado)</span><input type="number" min="0" step="1" value={form.inventory_count} onChange={(event) => setForm({ ...form, inventory_count: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 font-normal outline-none focus:border-primary" /></label>
        <div><p className="text-sm font-semibold">Imagen del producto</p><label className="mt-2 flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => void uploadImage(event.target.files?.[0])} />{uploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{uploading ? 'Subiendo…' : form.image_url ? 'Cambiar imagen' : 'Subir imagen'}</label></div>
        {form.image_url && <div className="relative h-48 overflow-hidden rounded-2xl border border-white/10 md:col-span-2"><Image src={form.image_url} alt="Vista previa" fill unoptimized className="object-cover" /></div>}
        <div className="flex flex-wrap gap-5 md:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Publicado</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Destacado</label></div>
        <Button type="submit" size="lg" disabled={saving || uploading} className="md:col-span-2">{saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Publicar producto'}</Button>
      </form>
    </section>

    <section className="overflow-hidden rounded-3xl border border-white/10 bg-card/75"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="text-xl font-bold">Productos</h2><p className="text-sm text-muted">{products.length} productos creados</p></div><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div><div className="divide-y divide-white/[.07]">{products.map((product) => <div key={product.id} className="grid gap-4 p-5 md:grid-cols-[72px_1fr_auto] md:items-center"><div className="relative h-16 overflow-hidden rounded-xl bg-primary/10">{product.image_url ? <Image src={product.image_url} alt="" fill unoptimized className="object-cover" /> : null}</div><div><div className="flex flex-wrap items-center gap-2"><b>{product.name}</b>{product.is_featured && <span className="rounded-full bg-primary/15 px-2 py-1 text-xs text-primary">Destacado</span>}{!product.is_active && <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-muted">Oculto</span>}</div><p className="mt-1 text-sm text-muted">{product.category} · {money(Number(product.price))} · {product.inventory_count == null ? 'Inventario ilimitado' : `${product.inventory_count} disponibles`}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => edit(product)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button variant="outline" size="sm" disabled={saving} onClick={() => void toggle(product)}>{product.is_active ? 'Ocultar' : 'Publicar'}</Button></div></div>)}{!products.length && !loading && <div className="p-10 text-center text-muted">Todavía no has publicado productos.</div>}</div></section>

    <section className="overflow-hidden rounded-3xl border border-white/10 bg-card/75"><div className="border-b border-white/10 p-5"><h2 className="flex items-center gap-2 text-xl font-bold"><ShoppingBag className="h-5 w-5 text-primary" />Compras de la tienda</h2><p className="text-sm text-muted">{orders.length} compras registradas</p></div><div className="divide-y divide-white/[.07]">{orders.map((order) => <div key={order.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><b className="font-mono text-primary">{order.order_number}</b><span className={`rounded-full px-2 py-1 text-xs ${order.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-muted'}`}>{order.status}</span></div><p className="mt-1 text-sm">{order.customer_name} · {order.customer_email}</p><p className="text-xs text-muted">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')} · {date(order.created_at)}</p></div><b className="text-xl text-emerald-300">{money(Number(order.total))}</b></div>)}{!orders.length && !loading && <div className="p-10 text-center text-muted">Las compras aparecerán aquí cuando un cliente pague.</div>}</div></section>
  </div>
}
