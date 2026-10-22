import { NextResponse } from 'next/server'
export async function GET(){
 const target=process.env.DULCAN_INSTALLER_URL
 if(!target)return NextResponse.json({error:'La descarga se está preparando.'},{status:503})
 try{const url=new URL(target);if(url.protocol!=='https:'||url.username||url.password||!['www.thedulcandesign.com','thedulcandesign.com','github.com','objects.githubusercontent.com'].includes(url.hostname))throw new Error('Invalid destination');return NextResponse.redirect(url,302)}catch{return NextResponse.json({error:'Descarga no disponible.'},{status:503})}
}