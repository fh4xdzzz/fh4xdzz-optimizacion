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
  // Configuración para Turbopack
  turbopack: {
    root: __dirname,
  },
  // Permitir CORS para el browser preview
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
