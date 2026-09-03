import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // 1. Desativa mapas de código no build final (economiza até 40% de CPU/tempo)
    sourcemap: false,

    // 2. Aumenta o limite de alerta de tamanho de chunk para evitar warnings desnecessários
    chunkSizeWarningLimit: 1000,

    // 3. Otimizações de minificação e empacotamento no Rollup
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Separa bibliotecas grandes (como Supabase, Recharts, XLSX) em arquivos isolados
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          xlsx: ['xlsx'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
