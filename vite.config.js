import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  // Define o base path (útil se o app estiver numa subpasta)
  base: '/',
  
  server: {
    port: 5173,
    strictPort: true,
    // Proxy apenas em desenvolvimento
    proxy: mode === 'development' ? {
      "/api": {
        target: "http://localhost:3025",
        changeOrigin: true,
        secure: false,
        // Mantém o caminho /api intacto
        rewrite: (path) => path,
      },
    } : undefined,
  },
  
  build: {
    // Configurações de build otimizadas
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: mode === 'production',
  },
}));


