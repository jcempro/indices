import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.ts'),
			name: 'EconomicIndices',
			fileName: (format) => `economic-indices.${format}.js`,
			formats: ['es'],
		},
		rollupOptions: {
			output: {
				// Configuração para workers
				entryFileNames: 'assets/[name].js',
				chunkFileNames: 'assets/[name].[hash].js',
				assetFileNames: 'assets/[name].[hash][extname]',
			},
		},
	},
	// Configuração específica para workers
	worker: {
		format: 'es',
		rollupOptions: {
			output: {
				entryFileNames: 'workers/[name].js',
			},
		},
	},
	server: {
		open: '/index.html',
	},
});
