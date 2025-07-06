import { defineConfig } from 'vite';
import { resolve } from 'path';
import { transform } from 'esbuild';

export default defineConfig({
	plugins: [
		{
			name: 'obfuscator',
			async transform(code, id) {
				if (id.includes('EconomicIndicesClient')) {
					const result = await transform(code, {
						minify: true,
						keepNames: false,
						mangleProps: /^[^_].*$/,
					});
					return { code: result.code, map: null };
				}
			},
		},
	],
	build: {
		outDir: 'dist',
		minify: 'esbuild',
		lib: {
			entry: resolve(__dirname, 'src/run.ts'),
			name: 'EconomicIndices',
			fileName: 'economic-indices',
			formats: ['es'],
		},
		esbuild: {
			minifyIdentifiers: true, // Ofusca nomes
			minifySyntax: true, // Minifica estrutura
			minifyWhitespace: true, // Remove espaços
			legalComments: 'none', // Remove comentários
			keepNames: false, // Crucial para ofuscar
			mangleProps: /^[^_].*$/, // Ofusca propriedades
			charset: 'ascii', // Remove caracteres unicode desnecessários
		},
		rollupOptions: {
			output: {
				inlineDynamicImports: true,
				compact: true,
				generatedCode: {
					arrowFunctions: true,
					constBindings: true,
				},
			},
		},
	},
});
