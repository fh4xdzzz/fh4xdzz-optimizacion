import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'
import { DULCAN_PRODUCT, decryptLicenseKey, encryptLicenseKey, escapeLicenseHtml, generateLicenseKey, hashLicenseKey, licenseLiveMode, normalizeLicenseKey } from './dulcan-license-crypto'

export function licenseAdmin() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, secret=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!secret) throw new Error('Licencias no configuradas')
  return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
}
export function licenseSiteOrigin() {
  const value=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://www.thedulcandesign.com')
  if(value.protocol!=='https:'&&process.env.NODE_ENV==='production') throw new Error('Sitio de licencias requiere HTTPS')
  return value.origin
}
export function sameLicenseOrigin(origin: string|null) {
  try{return origin!==null&&new URL(origin).origin===licenseSiteOrigin()}catch{return false}
}
export type SoftwareLicense = {id:string;purchase_id:string;user_id:string;product_id:string;key_ciphertext:string;status:string;livemode:boolean;device_hash:string|null;email_sent_at:string|null;created_at:string}
export type SoftwarePurchase = {id:string;user_id:string;product_id:string;email:string;customer_name:string;stripe_session_id:string;payment_intent_id:string|null;amount_cents:number;currency:string;livemode:boolean;status:string}
function stripeId(value:string|{id:string}|null):string|null{return typeof value==='string'?value:value?.id||null}

export async function emailSoftwareLicense(db:SupabaseClient,license:SoftwareLicense,purchase:SoftwarePurchase) {
  if(license.email_sent_at||license.status!=='active')return
  if(!process.env.RESEND_API_KEY)throw new Error('Correo de licencias no configurado')
  const key=decryptLicenseKey(license.key_ciphertext)
  const origin=licenseSiteOrigin()
  const message=`Hola ${purchase.customer_name||'cliente'}, tu key de Dulcan Optimizer es: ${key}\nLicencia permanente para 1 PC, sin cuotas. Actívala en Licencia dentro del programa. Requiere conexión al activar y verificar como máximo cada 30 días; puedes usarlo sin conexión entre verificaciones.\nDescarga y recupera tu key en ${origin}/dashboard/keys`
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`dulcan-license-${license.id}`},
    body:JSON.stringify({from:process.env.EMAIL_FROM||'TheDulcanDesign <soporte@thedulcandesign.com>',to:[purchase.email],subject:'Tu key de Dulcan Optimizer está lista',text:message,
      html:`<!doctype html><html lang="es"><body style="background:#090b12;color:#eee;font:16px/1.6 Arial;padding:32px"><div style="max-width:600px;margin:auto;background:#151522;border:1px solid #3c355e;border-radius:18px;padding:28px"><p style="color:#45ddc0">THE DULCAN DESIGN</p><h1>Tu Dulcan Optimizer está listo</h1><p>Hola ${escapeLicenseHtml(purchase.customer_name||'cliente')}, recibimos tu pago.</p><p style="padding:16px;background:#252039;color:#c6bfff;font-weight:bold;overflow-wrap:anywhere">${escapeLicenseHtml(key)}</p><p>Licencia permanente para <b>1 PC</b>, sin cuotas. Pega esta key en <b>Licencia</b> dentro del programa.</p><p>Necesitas conexión para activar y verificar la licencia al menos cada 30 días; funciona sin conexión entre verificaciones. El historial de recuperación permanece disponible.</p><a href="${origin}/dashboard/keys" style="display:block;padding:14px;background:#7060ed;color:white;text-align:center;border-radius:10px">Descargar y ver mis licencias</a></div></body></html>`})
  })
  if(!response.ok)throw new Error('No se pudo entregar el correo de licencia')
  const {error}=await db.from('software_licenses').update({email_sent_at:new Date().toISOString()}).eq('id',license.id)
  if(error)throw new Error('No se pudo registrar la entrega de licencia')
}

export async function fulfillSoftwareCheckout(db:SupabaseClient,eventCheckout:Stripe.Checkout.Session,eventLive:boolean):Promise<SoftwarePurchase|null>{
  const stripe=getStripe();if(!stripe)throw new Error('Stripe no configurado')
  // Re-read the payment: older completion events must not re-grant a refunded purchase.
  const checkout=await stripe.checkout.sessions.retrieve(eventCheckout.id,{expand:['payment_intent.latest_charge']})
  const purchaseId=checkout.metadata?.purchase_id
  const mixed = checkout.metadata?.checkout_flow === 'cart_v1'
  if((checkout.metadata?.checkout_flow!=='dulcan_license_v1'&&!mixed)||!purchaseId||checkout.mode!=='payment'||checkout.payment_status!=='paid')return null
  if(eventLive!==licenseLiveMode()||checkout.livemode!==eventLive)throw new Error('Entorno del pago no coincide')
  const {data:purchase,error}=await db.from('software_purchases').select('*').eq('id',purchaseId).maybeSingle()
  if(error||!purchase)throw new Error('Compra de software no encontrada')
  if(purchase.user_id!==checkout.metadata?.user_id||purchase.stripe_session_id!==checkout.id||purchase.product_id!==DULCAN_PRODUCT||purchase.currency!==checkout.currency||purchase.livemode!==eventLive)throw new Error('El pago no coincide con la compra')
  if (mixed) {
    if (!checkout.metadata?.cart_id) throw new Error('Carrito de licencia no encontrado')
    const { data: cart, error: cartError } = await db.from('checkout_carts').select('user_id,stripe_session_id,total,items').eq('id', checkout.metadata.cart_id).maybeSingle()
    const licenseItems = Array.isArray(cart?.items) ? cart.items.filter((item: { kind?: string }) => item.kind === 'license') : []
    if (cartError || !cart || cart.user_id !== purchase.user_id || cart.stripe_session_id !== checkout.id || Math.round(Number(cart.total) * 100) !== checkout.amount_total || Number(checkout.amount_total) < purchase.amount_cents || licenseItems.length !== 1 || licenseItems[0].id !== DULCAN_PRODUCT || Math.round(Number(licenseItems[0].price) * 100) !== purchase.amount_cents) throw new Error('El pago no coincide con el carrito de licencia')
  } else if (purchase.amount_cents !== checkout.amount_total) throw new Error('El pago no coincide con la compra')
  const intent=checkout.payment_intent
  if(!intent||typeof intent==='string'||intent.status!=='succeeded')throw new Error('No se confirmó el pago de software')
  const charge=intent.latest_charge
  if(charge&&typeof charge!=='string'&&charge.refunded){
    const {error:refundError}=await db.rpc('revoke_dulcan_payment',{p_payment_intent:intent.id});if(refundError)throw new Error('No se pudo registrar el reembolso de software')
  }
  const key=generateLicenseKey()
  const {data:issued,error:issueError}=await db.rpc('issue_dulcan_license',{
    p_purchase_id:purchase.id,p_session_id:checkout.id,p_payment_intent:intent.id,p_paid_amount:purchase.amount_cents,p_currency:checkout.currency,p_live:eventLive,
    p_key_hash:hashLicenseKey(key),p_key_ciphertext:encryptLicenseKey(key),
  })
  if(issueError)throw new Error('No se pudo emitir la licencia de software')
  const license=(issued as SoftwareLicense[]|null)?.[0]
  if(!license)return null
  await emailSoftwareLicense(db,license,purchase as SoftwarePurchase)
  return {...purchase,payment_intent_id:intent.id} as SoftwarePurchase
}
export async function revokeRefundedSoftware(db:SupabaseClient,charge:Stripe.Charge){
  if(!charge.refunded||charge.amount_refunded<charge.amount)return
  const id=stripeId(charge.payment_intent);if(!id)return
  const {error}=await db.rpc('revoke_dulcan_payment',{p_payment_intent:id})
  if(error)throw new Error('No se pudo registrar el reembolso de software')
}
export function displaySoftwareKey(value:string){return normalizeLicenseKey(decryptLicenseKey(value))}
