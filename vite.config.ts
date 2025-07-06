import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { transform } from 'esbuild';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { visualizer } from 'rollup-plugin-visualizer';

function inlineWorkerPlugin() {
	return {
		name: 'inline-worker',
		resolveId(source) {
			if (source === 'virtual:worker') return source;
		},
		async load(id) {
			if (id === 'virtual:worker') {
				let code = readFileSync(
					resolve(__dirname, 'src/engine/worker.ts'),
					'utf-8',
				);
				const result = await transform(code, {
					loader: 'ts',
					minify: true,
					treeShaking: true,
					mangleProps: /^.*$/, // Renomeia tudo
					sourcemap: false,
					keepNames: false,
				});
				const encoded = Buffer.from(result.code).toString('base64');
				return `export default "data:text/javascript;base64,${encoded}"`;
			}
		},
	};
}

export default defineConfig({
	plugins: [
		inlineWorkerPlugin(),
		viteSingleFile(),
		visualizer({ open: true }),
	],
	define: {
		'process.env': '{}',
		'process.platform': '"browser"',
	},
	build: {
		outDir: 'dist',
		target: 'es2020',
		minify: 'esbuild',
		sourcemap: false,
		lib: {
			entry: resolve(__dirname, 'src/run.ts'),
			formats: ['es'],
			fileName: () => 'run.js',
			name: 'EconomicIndices',
		},
		rollupOptions: {
			external: [
				'fs',
				'fs/promises',
				'path',
				'os',
				'util',
				'process',
			],
			output: {
				inlineDynamicImports: true,
				compact: true,
				manualChunks: undefined,
			},
		},
	},
});
