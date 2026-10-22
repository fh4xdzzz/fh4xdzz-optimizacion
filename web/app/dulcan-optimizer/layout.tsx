import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dulcan Optimizer · Licencia permanente para 1 PC',
  description: 'Diagnóstico, ajustes explicados y recuperación para Windows. Compra Dulcan Optimizer con un pago único y recibe tu key automáticamente.',
  alternates: { canonical: 'https://www.thedulcandesign.com/dulcan-optimizer' },
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children
}
