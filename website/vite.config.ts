import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { isoImport } from 'vite-plugin-iso-import';

export default defineConfig({
	plugins: [sveltekit(), isoImport()],
	optimizeDeps: {
		exclude: ['@polar-sh/checkout']
	},
	server: {
		allowedHosts: true
	}
});
