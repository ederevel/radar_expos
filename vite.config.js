import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/radar_expos/', // Set the base to your GitHub repo name
  plugins: [react(), tailwindcss()],
});
