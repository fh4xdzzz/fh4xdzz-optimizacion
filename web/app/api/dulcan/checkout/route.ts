import { NextRequest,NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getServerSession } from '@/lib/auth-server'
import { getStripe } from '@/lib/stripe-server'
import { DULCAN_PRODUCT,activationScope,licenseConfigurationReady,licenseLiveMode } from '@/lib/dulcan-license-crypto'
import { licenseAdmin,licenseSiteOrigin,sameLicenseOrigin } from '@/lib/dulcan-license-service'
export const runtime='nodejs'
export async function POST(request:NextRequest){
  if(!sameLicenseOrigin(request.headers.get('origin')))return NextResponse.json({error:'Origen no válido'},{status:403})
  const session=await getServerSession();if(!session)return NextResponse.json({error:'Inicia sesión para comprar.'},{status:401})
  if(!licenseConfigurationReady())return NextResponse.json({error:'Las ventas de licencias todavía no están habilitadas.'},{status:503})
  try{
    const stripe=getStripe()!,db=licenseAdmin()
    if(stripe===null||licenseLiveMode()!==/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY||''))throw new Error('Entorno de Stripe no coincide')
    const {data:product,error}=await db.from('software_products').select('id,name,amount_cents,currency,active').eq('id',DULCAN_PRODUCT).maybeSingle()
    if(error||!product?.active)return NextResponse.json({error:'La licencia no está disponible.'},{status:503})
    const throttle=await db.rpc('consume_dulcan_activation_limit',{p_scope:activationScope('checkout-user',session.user.id),p_limit:5})
    if(throttle.error)throw new Error('Checkout limit unavailable')
    if(!throttle.data)return NextResponse.json({error:'Espera un minuto antes de iniciar otra compra.'},{status:429})
    const purchaseId=randomUUID()
    const {error:purchaseError}=await db.from('software_purchases').insert({id:purchaseId,user_id:session.user.id,product_id:product.id,email:session.user.email,customer_name:session.user.full_name||'Cliente',amount_cents:product.amount_cents,currency:product.currency,livemode:licenseLiveMode()})
    if(purchaseError)throw new Error('No se pudo preparar la compra')
    const origin=licenseSiteOrigin()
    const checkout=await stripe.checkout.sessions.create({
      mode:'payment',payment_method_types:['card'],customer_email:session.user.email,client_reference_id:session.user.id,
      metadata:{checkout_flow:'dulcan_license_v1',purchase_id:purchaseId,user_id:session.user.id},
      line_items:[{quantity:1,price_data:{currency:product.currency,unit_amount:product.amount_cents,product_data:{name:product.name,description:'Pago único. Licencia permanente para 1 PC. Activación y verificación online cada 30 días; sin cuotas.'}}}],
      success_url:`${origin}/mis-licencias?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/dulcan-optimizer?cancelled=1`,
    },{idempotencyKey:`dulcan-purchase-${purchaseId}`})
    const {error:bindError}=await db.from('software_purchases').update({stripe_session_id:checkout.id}).eq('id',purchaseId).is('stripe_session_id',null)
    if(bindError||!checkout.url)throw new Error('No se pudo preparar el enlace de pago')
    return NextResponse.json({url:checkout.url},{headers:{'Cache-Control':'no-store'}})
  }catch{return NextResponse.json({error:'No se pudo preparar la compra. Inténtalo de nuevo.'},{status:503})}
}