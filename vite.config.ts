import { defineConfig } from 'vite';
import { resolve } from 'path';
import virtual from '@rollup/plugin-virtual';
import { readFileSync } from 'fs';

export default defineConfig({
	plugins: [
		{
			name: 'worker-loader',
			transform(code, id) {
				if (id.includes('worker.ts')) {
					return `export default ${JSON.stringify(code)};`;
				}
			},
		},
	],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/run.ts'),
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
	resolve: {
		alias: {
			'@worker': resolve(__dirname, './src/worker.ts'), // Alias para o worker
		},
	},
	server: {
		open: '/index.html',
	},
});
