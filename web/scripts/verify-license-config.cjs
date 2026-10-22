const { createHash, createPrivateKey, createPublicKey } = require('node:crypto')

// This public fingerprint must match the key pinned in Dulcan Optimizer 0.5.0.
const expectedFingerprint = 'a07f9579dbb70dfa3293e94afb335408881463428e7fb94e61ce1bfe7c9ed1f5'

if (process.env.VERCEL_ENV === 'production') {
  try {
    const key = createPrivateKey((process.env.DULCAN_LICENSE_PRIVATE_KEY || '').replace(/\\n/g, '\n'))
    const fingerprint = createHash('sha256').update(createPublicKey(key).export({ type: 'spki', format: 'der' })).digest('hex')
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 3072 || fingerprint !== expectedFingerprint) throw new Error('signature')
    const encryption = process.env.DULCAN_LICENSE_ENCRYPTION_KEY || ''
    if (!/^[A-Za-z0-9+/]{43}=$/.test(encryption) || Buffer.from(encryption, 'base64').length !== 32) throw new Error('encryption')
    if ((process.env.DULCAN_LICENSE_RATE_SALT || '').length < 32) throw new Error('rate')
    if ((process.env.DULCAN_LICENSE_MODE || 'live') !== 'live') throw new Error('mode')
    console.log('Dulcan: configuración criptográfica válida y compatible con el ejecutable 0.5.0.')
    console.log(`Dulcan: ventas ${process.env.DULCAN_LICENSE_ENABLED === 'true' ? 'activadas' : 'desactivadas'}.`)
  } catch {
    console.error('Dulcan: configuración de licencias incompleta o incompatible. Revisa los secretos del servidor; no se muestran sus valores.')
    process.exitCode = 1
  }
}
