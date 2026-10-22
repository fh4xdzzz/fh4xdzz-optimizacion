import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tienda para creadores | TheDulcanDesign',
  description: 'Productos digitales y físicos para creadores. Compra de forma segura sin crear una cuenta.',
  alternates: { canonical: '/tienda' },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children
}
