import { NextRequest,NextResponse } from 'next/server'
import { activationScope,hashLicenseKey,licenseSigningReady,licenseLiveMode,normalizeLicenseKey,signLicenseToken } from '@/lib/dulcan-license-crypto'
import { licenseAdmin } from '@/lib/dulcan-license-service'
export const runtime='nodejs'
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'no-store'}
  if(!licenseSigningReady())return NextResponse.json({code:'service_unavailable'},{status:503,headers})
  try{
    const db=licenseAdmin()
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
    const ipLimit=await db.rpc('consume_dulcan_activation_limit',{p_scope:activationScope('ip',ip),p_limit:30})
    if(ipLimit.error)throw new Error('Rate store unavailable')
    if(!ipLimit.data)return NextResponse.json({code:'rate_limited'},{status:429,headers:{...headers,'Retry-After':'60'}})
    const text=await request.text();if(Buffer.byteLength(text)>8192)return NextResponse.json({code:'invalid_request'},{status:400,headers})
    let body:{key?:unknown;deviceHash?:unknown};try{body=JSON.parse(text)}catch{return NextResponse.json({code:'invalid_request'},{status:400,headers})}
    if(!body||typeof body.deviceHash!=='string'||!/^[a-f0-9]{64}$/.test(body.deviceHash))return NextResponse.json({code:'invalid_request'},{status:400,headers})
    let key:string;try{key=normalizeLicenseKey(body.key)}catch{return NextResponse.json({code:'license_unavailable'},{status:403,headers})}
    const hash=hashLicenseKey(key)
    const keyLimit=await db.rpc('consume_dulcan_activation_limit',{p_scope:activationScope('key',hash),p_limit:10})
    if(keyLimit.error)throw new Error('Rate store unavailable')
    if(!keyLimit.data)return NextResponse.json({code:'rate_limited'},{status:429,headers:{...headers,'Retry-After':'60'}})
    const {data,error}=await db.rpc('activate_dulcan_license',{p_key_hash:hash,p_device_hash:body.deviceHash,p_live:licenseLiveMode()})
    if(error)throw new Error('Activation unavailable')
    const state=data?.[0]
    if(state?.result==='device_limit')return NextResponse.json({code:'device_limit'},{status:409,headers})
    if(state?.result!=='active')return NextResponse.json({code:'license_unavailable'},{status:403,headers})
    const token=signLicenseToken(state.license_id,body.deviceHash,licenseLiveMode())
    return NextResponse.json({token,keyId:'dulcan-license-v1'},{headers})
  }catch{return NextResponse.json({code:'service_unavailable'},{status:503,headers})}
}