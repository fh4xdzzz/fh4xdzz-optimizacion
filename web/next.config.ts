import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // Ignorar errores de hidratación causados por extensiones del navegador
  reactStrictMode: true,
  experimental: {
    // Mejorar manejo de errores de hidratación
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
