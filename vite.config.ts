import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	esbuild: {
		sourcemap: 'external',
	},
	server: {
		port: 3000,
	},
});
