import { transform } from 'esbuild';
import path from 'path';

// Lista de exceções que NÃO devem ser otimizadas
const EXCEÇÕES = ['getIndices', 'ECONIDX'];

// Regex melhorado para capturar exceções
const createExemptionRegex = (name: string) => [
	new RegExp(`([^a-zA-Z0-9_]|^)${name}([^a-zA-Z0-9_]|$)`, 'g'),
	new RegExp(`\\.${name}([^a-zA-Z0-9_]|$)`, 'g'),
	new RegExp(`\\["${name}"\\]`, 'g'),
	new RegExp(`\\['${name}'\\]`, 'g'),
	new RegExp(`\`\\$\\{${name}\\}\``, 'g'),
	new RegExp(`class\\s+${name}\\b`, 'g'),
	new RegExp(`interface\\s+${name}\\b`, 'g'),
];

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
				// 1. Proteger exceções
				let protectedCode = EXCEÇÕES.reduce((acc, name) => {
					createExemptionRegex(name).forEach((regex) => {
						acc = acc.replace(regex, (match) =>
							match.replace(name, `__EXCEPTION_${name}__`),
						);
					});
					return acc;
				}, code);

				// 2. Marcar métodos de classe para minificação
				protectedCode = protectedCode.replace(
					/(class|interface)\s+(\w+)[^{]*{([^}]*)}/g,
					(match, type, name, body) => {
						const processedBody = body.replace(
							/(\w+)\s*\(([^)]*)\)\s*{/g,
							(m, method) => `__MANGLE_METHOD_${method}__(`,
						);
						return `${type} ${name} {${processedBody}}`;
					},
				);

				// 3. Configuração agressiva (usando a abordagem correta para minificar classes)
				const result = await transform(protectedCode, {
					loader: /\.tsx?$/.test(id) ? 'ts' : 'js',
					minify: true,
					minifyIdentifiers: true,
					minifySyntax: true,
					minifyWhitespace: true,
					mangleProps: /^(?!__EXCEPTION_|__MANGLE_METHOD_).+$/,
					mangleQuoted: true,
					// Abordagem correta para minificar nomes de classe/métodos
					charset: 'utf8',
					legalComments: 'none',
					target: 'es2020',
					supported: {
						'class-field': true,
						'class-private-field': true,
						'class-static-field': true,
					},
				});

				// 4. Restaurar exceções
				let finalCode = EXCEÇÕES.reduce(
					(acc, name) =>
						acc.replace(
							new RegExp(`__EXCEPTION_${name}__`, 'g'),
							name,
						),
					result.code,
				);

				// Remover marcações de métodos
				finalCode = finalCode.replace(
					/__MANGLE_METHOD_(\w+)__/g,
					'$1',
				);

				return { code: finalCode, map: null };
			} catch (error) {
				console.error(`Erro ao processar ${id}:`, error);
				return null;
			}
		},
	};
}
