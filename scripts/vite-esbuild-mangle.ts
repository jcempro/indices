import { transform } from 'esbuild';
import path from 'path';

// Lista de exceções que NÃO devem ser otimizadas
const EXCEÇÕES = ['getIndices', 'ECONIDX'];

export default function esbuildManglePlugin() {
	return {
		name: 'esbuild-mangle',
		async transform(code: string, id: string) {
			if (
				id.includes('node_modules') ||
				!/\.(js|ts|jsx|tsx|cjs|mjs)$/.test(id)
			) {
				return null;
			}

			try {
				// 1. Proteger exceções usando um prefixo único
				let protectedCode = code;
				EXCEÇÕES.forEach((name) => {
					protectedCode = protectedCode.replace(
						new RegExp(
							`([^a-zA-Z0-9_]|^)${name}([^a-zA-Z0-9_]|$)`,
							'g',
						),
						`$1__PROTECTED_${name}__$2`,
					);
				});

				// 2. Processar com ESBuild usando configuração agressiva
				const result = await transform(protectedCode, {
					loader: /\.tsx?$/.test(id) ? 'ts' : 'js',
					minify: true,
					minifyIdentifiers: true,
					minifySyntax: true,
					minifyWhitespace: true,
					mangleProps: /^[^_]{2.2}.+$/, // Mangle em tudo que não começa com _
					mangleQuoted: true,
					keepNames: false,
					// Configuração especial para métodos de classe
					charset: 'utf8',
					target: 'es2020',
					supported: {
						'class-field': true,
						'class-private-field': true,
						'class-static-field': true,
					},
				});

				// 3. Restaurar exceções
				let finalCode = result.code;
				EXCEÇÕES.forEach((name) => {
					finalCode = finalCode.replace(
						new RegExp(`__PROTECTED_${name}__`, 'g'),
						name,
					);
				});

				return {
					code: finalCode,
					map: null,
				};
			} catch (error) {
				console.error(`Erro ao processar ${id}:`, error);
				return null;
			}
		},
	};
}
