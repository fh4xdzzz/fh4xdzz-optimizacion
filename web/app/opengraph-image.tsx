import { ImageResponse } from 'next/og'

export const alt = 'TheDulcanDesign — Optimización de OBS, Windows y streaming'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#090a0f', color: 'white', borderLeft: '18px solid #5865f2' }}>
      <div style={{ display: 'flex', fontSize: 32, color: '#a5adff', marginBottom: 40 }}>TheDulcanDesign</div>
      <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Tu setup, más rápido.</div>
      <div style={{ display: 'flex', fontSize: 52, color: '#a5adff', marginTop: 12 }}>Tu contenido, más profesional.</div>
      <div style={{ display: 'flex', fontSize: 28, color: '#b9bdcf', marginTop: 46 }}>OBS · Windows · Streaming · Gaming</div>
      <div style={{ display: 'flex', fontSize: 24, color: '#b9bdcf', marginTop: 28 }}>thedulcandesign.com</div>
    </div>,
    size,
  )
}
