import { NextRequest,NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { displaySoftwareKey,licenseAdmin } from '@/lib/dulcan-license-service'
export const runtime='nodejs'
export async function GET(request:NextRequest){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'}
  const session=await getServerSession();if(!session)return NextResponse.json({error:'Inicia sesión para ver tus keys.'},{status:401,headers})
  try{
    const {data,error}=await licenseAdmin().from('software_licenses').select('id,key_ciphertext,status,device_hash,created_at,purchase_id').eq('user_id',session.user.id).order('created_at',{ascending:false})
    if(error)throw new Error('License lookup unavailable')
    let purchase=null
    const sessionId=request.nextUrl.searchParams.get('session_id')
    if(sessionId&&/^cs_[A-Za-z0-9_]{1,200}$/.test(sessionId)){const found=await licenseAdmin().from('software_purchases').select('id,status').eq('stripe_session_id',sessionId).eq('user_id',session.user.id).maybeSingle();if(found.error)throw new Error('Purchase unavailable');purchase=found.data}
    return NextResponse.json({purchase,licenses:(data||[]).map(row=>({id:row.id,key:displaySoftwareKey(row.key_ciphertext),status:row.status,activated:Boolean(row.device_hash),createdAt:row.created_at,purchaseId:row.purchase_id}))},{headers})
  }catch{return NextResponse.json({error:'No pudimos cargar tus licencias.'},{status:503,headers})}
}