import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                // Split rarely-changing third-party code into its own
                // long-cacheable chunks so an app change doesn't bust the
                // whole vendor bundle, and they download in parallel.
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'supabase': ['@supabase/supabase-js'],
                    'icons': ['lucide-react'],
                },
            },
        },
    },
})
