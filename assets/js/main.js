(function () {
	// Verifica se está em localhost ou domínio de desenvolvimento
	const isLocal =
		window.location.hostname === 'localhost' ||
		window.location.hostname === '127.0.0.1' ||
		window.location.hostname.endsWith('.local');

	// Carrega o script apropriado
	const script = document.createElement('script');
	script.type = 'module';

	// Adiciona um parâmetro de cache busting para desenvolvimento
	const now = Date.now();
	const cacheBuster =
		isLocal ? now : (
			[
				now.getFullYear(),
				String(now.getMonth() + 1).padStart(2, '0'),
				String(now.getDate()).padStart(2, '0'),
				String(now.getHours()).padStart(2, '0'),
			].join('')
		);
	script.src =
		isLocal ?
			'src/run.ts?t=' + cacheBuster
		:	'dist/run.js?t=' + cacheBuster;

	script.onload = initApp;
	script.onerror = () => {
		console.error('Erro ao carregar o script');
		document.getElementById('indices').innerHTML =
			'<p class="error">Erro ao carregar o módulo de índices</p>';
	};

	document.head.appendChild(script);

	function formatValue(value, decimals = 2) {
		return value?.toFixed?.(decimals) ?? 'N/A';
	}

	function formatIndice(indice, name) {
		const isCurrency = name.toLowerCase().includes('câmbio');
		const prefix = isCurrency ? 'R$ ' : '';
		const suffix = isCurrency ? '' : '%';

		return `
    <div class="indice">
        <h3>${name}</h3>
        <p>Atual: <span class="value">${prefix}${formatValue(indice?.current, isCurrency ? 4 : 2)}${suffix}</span></p>
        ${
					indice?.avg !== undefined ?
						`<p>Média: <span class="value">${prefix}${formatValue(indice.avg, isCurrency ? 4 : 2)}${suffix}</span></p>`
					:	''
				}
    </div>
`;
	}

	function formatDate(dateString) {
		if (!dateString) return 'Nunca atualizado';
		const date = new Date(dateString);
		return date.toLocaleString('pt-BR');
	}

	async function initApp() {
		// Aguarda um pequeno delay para garantir que o módulo foi carregado
		await new Promise((resolve) => setTimeout(resolve, 100));

		if (!window.ECONIDX) {
			console.error('ECONIDX não está disponível na window');
			document.getElementById('indices').innerHTML =
				'<p class="error">Erro ao inicializar o módulo</p>';
			return;
		}

		const indicesContainer = document.getElementById('indices');
		const refreshBtn = document.getElementById('refresh');
		const checkStorageBtn = document.getElementById('checkStorage');
		const clearStorageBtn = document.getElementById('clearStorage');

		async function loadIndices() {
			try {
				const indices = await window.ECONIDX.getIndices();
				const indicesData = indices?.indices ?? indices;

				if (!indicesData) {
					indicesContainer.innerHTML =
						'<p>Nenhum dado disponível</p>';
					return;
				}

				let html = '';
				// Renderiza dinamicamente todos os índices
				for (const [name, data] of Object.entries(indicesData)) {
					if (name !== 'updated' && typeof data === 'object') {
						html += formatIndice(data, name.toUpperCase());
					}
				}

				html += `<p><em>Última atualização: ${formatDate(indicesData.updated)}</em></p>`;
				indicesContainer.innerHTML = html;
			} catch (error) {
				indicesContainer.innerHTML = `<p class="error">Erro ao carregar índices: ${error.message}</p>`;
				console.error('Erro ao carregar índices:', error);
			}
		}

		refreshBtn.addEventListener('click', async () => {
			indicesContainer.innerHTML =
				'<p class="loading">Atualizando...</p>';
			try {
				await window.ECONIDX.getIndices();
				await loadIndices();
			} catch (error) {
				indicesContainer.innerHTML = `<p class="error">Erro ao atualizar: ${error.message}</p>`;
				console.error('Erro ao atualizar:', error);
			}
		});

		checkStorageBtn.addEventListener('click', () => {
			const stored = JSON.parse(
				localStorage.getItem('economic_indices_data'),
			);
			console.log('Conteúdo do Storage:', stored);
			alert('Verifique o console para ver o conteúdo do storage');
		});

		clearStorageBtn.addEventListener('click', () => {
			window.clearIndices();
		});

		await loadIndices();
	}
})();
