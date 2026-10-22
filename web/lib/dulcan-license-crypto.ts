import { createCipheriv, createDecipheriv, createHash, createHmac, createPrivateKey, randomBytes, sign } from 'node:crypto'
export const DULCAN_PRODUCT = 'dulcan-optimizer'
export const LICENSE_LEASE_SECONDS = 30 * 24 * 60 * 60
export function normalizeLicenseKey(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Key inválida')
  const key = value.trim().toUpperCase()
  if (!/^DULCAN-(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/.test(key)) throw new Error('Key inválida')
  return key
}
export function generateLicenseKey(): string {
  return `DULCAN-${randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g)!.join('-')}`
}
export function hashLicenseKey(key: string): string { return createHash('sha256').update(normalizeLicenseKey(key)).digest('hex') }
function encryptionKey(secret = process.env.DULCAN_LICENSE_ENCRYPTION_KEY): Buffer {
  if (!secret || !/^[A-Za-z0-9+/]{43}=$/.test(secret)) throw new Error('Cifrado de licencias no configurado')
  const key = Buffer.from(secret, 'base64')
  if (key.length !== 32) throw new Error('Cifrado de licencias no configurado')
  return key
}
export function encryptLicenseKey(key: string, secret?: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(normalizeLicenseKey(key), 'utf8'), cipher.final()])
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),ciphertext.toString('base64url')].join('.')
}
export function decryptLicenseKey(value: string, secret?: string): string {
  const [version, iv, tag, ciphertext, extra] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !ciphertext || extra || value.length > 500) throw new Error('Licencia almacenada inválida')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), Buffer.from(iv,'base64url'))
  decipher.setAuthTag(Buffer.from(tag,'base64url'))
  return normalizeLicenseKey(Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64url')),decipher.final()]).toString('utf8'))
}
export function activationScope(kind: string, value: string, secret = process.env.DULCAN_LICENSE_RATE_SALT): string {
  if (!secret || secret.length < 32) throw new Error('Protección de activación no configurada')
  return createHmac('sha256',secret).update(`${kind}|${value}`).digest('hex')
}
let cachedSigningKey: {pem:string;key:ReturnType<typeof createPrivateKey>}|undefined
function signingKey(privatePem = process.env.DULCAN_LICENSE_PRIVATE_KEY){
 if(!privatePem)throw new Error('Firma de licencias no configurada')
 if(cachedSigningKey?.pem===privatePem)return cachedSigningKey.key
 const key=createPrivateKey(privatePem.replace(/\\n/g,'\n'))
 if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength||0)<3072)throw new Error('Clave de firma no válida')
 cachedSigningKey={pem:privatePem,key};return key
}
export function signLicenseToken(licenseId: string, deviceHash: string, live: boolean, issuedAt = Math.floor(Date.now()/1000), privatePem = process.env.DULCAN_LICENSE_PRIVATE_KEY): string {
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(licenseId)||!/^[a-f0-9]{64}$/.test(deviceHash))throw new Error('Datos de licencia no válidos')
 const payload=Buffer.from(JSON.stringify({v:1,product:DULCAN_PRODUCT,licenseId,deviceHash,entitlement:'permanent',mode:live?'live':'test',issuedAt,expiresAt:issuedAt+LICENSE_LEASE_SECONDS}))
 return `${payload.toString('base64url')}.${sign('RSA-SHA256',payload,signingKey(privatePem)).toString('base64url')}`
}
export function licenseSigningReady():boolean{
 try{if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return false;signingKey();activationScope('config','check');return true}catch{return false}
}
export function licenseConfigurationReady(): boolean {
 try{return process.env.DULCAN_LICENSE_ENABLED==='true'&&Boolean(process.env.RESEND_API_KEY)&&Boolean(process.env.STRIPE_SECRET_KEY)&&licenseSigningReady()&&encryptionKey().length===32}catch{return false}
}
export function licenseLiveMode(): boolean { return process.env.DULCAN_LICENSE_MODE !== 'test' }
export function escapeLicenseHtml(value: string): string { return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }