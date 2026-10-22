// @vitest-environment node
import {beforeAll,beforeEach,describe,it,expect,vi} from 'vitest'
import {generateKeyPairSync,verify} from 'node:crypto'
import {NextRequest} from 'next/server'
const mocked=vi.hoisted(()=>({rpc:vi.fn()}))
vi.mock('@/lib/dulcan-license-service',()=>({licenseAdmin:()=>({rpc:mocked.rpc})}))
import {POST} from '@/app/api/dulcan/activate/route'
import {generateLicenseKey} from '@/lib/dulcan-license-crypto'
let publicPem:string
beforeAll(()=>{const pair=generateKeyPairSync('rsa',{modulusLength:3072,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});publicPem=pair.publicKey;process.env.DULCAN_LICENSE_PRIVATE_KEY=pair.privateKey;process.env.DULCAN_LICENSE_RATE_SALT='r'.repeat(64);process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';process.env.DULCAN_LICENSE_MODE='live'})
beforeEach(()=>{mocked.rpc.mockReset();mocked.rpc.mockImplementation(async(name:string)=>name==='consume_dulcan_activation_limit'?{data:true,error:null}:{data:[{license_id:'11111111-2222-4333-8444-555555555555',result:'active'}],error:null})})
function request(body:string){return new NextRequest('https://www.thedulcandesign.com/api/dulcan/activate',{method:'POST',body,headers:{'content-type':'application/json','x-forwarded-for':'203.0.113.1'}})}
const body=()=>JSON.stringify({key:generateLicenseKey(),deviceHash:'a'.repeat(64),clientVersion:'0.5.0'})
describe('public desktop activation endpoint',()=>{
 it('activates without website cookies and returns a signed token for that PC',async()=>{const response=await POST(request(body())),data=await response.json();expect(response.status).toBe(200);expect(data.keyId).toBe('dulcan-license-v1');expect(response.headers.get('cache-control')).toBe('no-store');const [payload,signature]=data.token.split('.');expect(verify('RSA-SHA256',Buffer.from(payload,'base64url'),publicPem,Buffer.from(signature,'base64url'))).toBe(true);expect(JSON.parse(Buffer.from(payload,'base64url').toString()).deviceHash).toBe('a'.repeat(64))})
 it('applies IP throttling even before invalid JSON is processed',async()=>{mocked.rpc.mockResolvedValue({data:false,error:null});const response=await POST(request('invalid JSON'));expect(response.status).toBe(429);expect(mocked.rpc).toHaveBeenCalledTimes(1);expect(mocked.rpc.mock.calls[0][1].p_limit).toBe(30);expect(response.headers.get('retry-after')).toBe('60')})
 it('rejects malformed keys without disclosing details or creating a lease',async()=>{const response=await POST(request(JSON.stringify({key:'bad',deviceHash:'a'.repeat(64)})));expect(response.status).toBe(403);expect(await response.json()).toEqual({code:'license_unavailable'});expect(mocked.rpc).toHaveBeenCalledTimes(1)})
 it('rejects a second PC and does not return a token',async()=>{mocked.rpc.mockImplementation(async(name:string)=>name==='consume_dulcan_activation_limit'?{data:true,error:null}:{data:[{result:'device_limit'}],error:null});const response=await POST(request(body()));expect(response.status).toBe(409);expect(await response.json()).toEqual({code:'device_limit'})})
 it('rejects unknown/revoked licenses',async()=>{mocked.rpc.mockImplementation(async(name:string)=>name==='consume_dulcan_activation_limit'?{data:true,error:null}:{data:[{result:'unavailable'}],error:null});expect((await POST(request(body()))).status).toBe(403)})
 it('does not treat database failure as a valid license',async()=>{mocked.rpc.mockResolvedValue({data:null,error:{message:'internal fixture'}});const response=await POST(request(body()));expect(response.status).toBe(503);expect(await response.text()).not.toContain('internal fixture')})
 it('limits each key separately without storing raw IP or key in rate counters',async()=>{await POST(request(body()));const calls=mocked.rpc.mock.calls.filter(c=>c[0]==='consume_dulcan_activation_limit');expect(calls.map(c=>c[1].p_limit)).toEqual([30,10]);for(const c of calls)expect(c[1].p_scope).toMatch(/^[a-f0-9]{64}$/)})
})
