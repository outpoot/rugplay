import type en from './en';

export default {
	lang: {
		code: 'pt',
		name: 'Português',
		flagCode: 'br'
	},
	about: {
		desc: 'Um simulador de negociação de criptomoedas onde você pode praticar trading sem perder dinheiro real. Crie moedas, negocie-as e faça rug pull!',
		title: 'Sobre',
		usermanual: {
			tips: {
				'1': {
					desc: 'Rugplay é um simulador de negociação de criptomoedas onde você pode praticar trading sem risco financeiro real. Comece com dinheiro virtual, crie moedas, aposte em mercados de previsão e, o mais importante, faça rugpull!'
				},
				'10': {
					desc: 'Hopium permite que você aposte em perguntas de sim/não sobre o futuro. A IA resolve automaticamente as perguntas com base em dados do mundo real. Teste suas habilidades de previsão e ganhe com previsões corretas. Mantenha $100.000 em dinheiro para criar sua própria pergunta no Hopium :)',
					title: 'Hopium - Mercados de Previsão'
				},
				'11': {
					desc: 'Visite a seção Jogos de Azar para jogos de alto risco e alta recompensa. Lembre-se: estes são jogos de pura sorte. Aposte apenas o que você pode perder, mesmo nesta simulação!',
					title: 'Jogos de Azar'
				},
				'12': {
					desc: 'Assista à página Negociações ao Vivo para ver a atividade de negociação em tempo real em todas as moedas. Isso ajuda você a identificar moedas em alta e entender o sentimento do mercado. A barra lateral mostra negociações de $1.000+, enquanto o feed principal exibe todas as transações.',
					title: 'Feed de Negociações ao Vivo'
				},
				'13': {
					desc: 'A página Treemap mostra uma representação visual de todo o mercado. Quadrados maiores representam maior capitalização de mercado, e as cores mostram o desempenho do preço.',
					title: 'Visualização Treemap'
				},
				'14': {
					desc: 'Compita com outros usuários na Tabela de Classificação. Suba nos rankings tomando decisões de investimento inteligentes!',
					title: 'Tabelas de Classificação'
				},
				'15': {
					desc: 'Faça login diariamente para reivindicar dinheiro grátis! Sua sequência de login aumenta seu bônus diário. Jogadores consistentes recebem mais dinheiro virtual para investir.',
					title: 'Recompensas Diárias'
				},
				'16': {
					desc: 'Comece pequeno, diversifique seus ativos e não invista tudo em uma única moeda. Procure moedas com detentores diversificados para evitar rug pulls absolutos. As pessoas estão ficando espertas!',
					title: 'Conclusão'
				},
				'2': {
					desc: 'Clique em "Criar moeda" na barra lateral para lançar sua própria criptomoeda. Escolha um nome exclusivo, um símbolo e faça upload de um ícone. Cada moeda começa em $0.000001',
					title: 'Criando Sua Primeira Moeda'
				},
				'3': {
					desc: 'Cada moeda tem um "pool de liquidez", com sua moeda e a moeda base ($). Os preços são determinados pela proporção entre esses valores. Quando você compra, o preço sobe; quando você vende, o preço desce.',
					title: 'Entendendo os Pools de Liquidez'
				},
				'4': {
					desc: 'Rugplay usa um sistema AMM onde os preços são calculados automaticamente com base na oferta e demanda. Quanto mais você compra, mais o preço sobe. Quanto mais você vende, mais ele cai. Grandes negociações criam "slippage" - a mudança de preço durante sua negociação.',
					title: 'AMM - Formador de Mercado Automatizado'
				},
				'5': {
					desc: 'Navegue para a página de qualquer moeda e clique em "Comprar". Insira a quantia que você deseja gastar. O AMM (Formador de Mercado Automatizado) mostrará exatamente quantas moedas você receberá, incluindo slippage.',
					title: 'Comprando Moedas'
				},
				'6': {
					desc: 'Na página de uma moeda, clique em "Vender" e insira quantas moedas você deseja vender. Você pode ver seus ativos em seu Portfólio. Lembre-se: vender grandes quantias pode impactar significativamente o preço!',
					title: 'Vendendo Moedas'
				},
				'7': {
					desc: 'Um "rug pull" acontece quando grandes detentores (incluindo criadores de moedas) vendem seus ativos de uma só vez, fazendo o preço despencar.',
					title: 'O que é um "Rug Pull"?'
				},
				'8': {
					desc: 'Verifique sua página de Portfólio para ver todos os seus ativos, seus valores atuais e transações recentes. Acompanhe seu desempenho e veja quais investimentos estão indo bem.',
					title: 'Gerenciamento de Portfólio'
				},
				'9': {
					desc: 'A página Mercado mostra todas as moedas disponíveis, classificadas por capitalização de mercado, volume e mudanças de preço. Use isso para descobrir moedas em alta e oportunidades de investimento.',
					title: 'Visão Geral do Mercado'
				}
			},
			title: 'Manual do Usuário'
		},
		rugplay: {
			title: 'Sobre o Rugplay',
			description: [
				'Rugplay é uma simulação realista de negociação de criptomoedas que se concentra na mecânica do DeFi (Finanças Descentralizadas) e nos riscos inerentes à negociação descentralizada.',
				'Pratique estratégias de negociação, crie suas próprias moedas e aprenda sobre a dinâmica do mercado sem nenhum risco financeiro real. Experimente negociação AMM, pools de liquidez e até rug pulls. (claro)',
				'Junte-se à comunidade de degenerados onde a paranóia é lucrativa!'
			]
		},
		features: {
			title: 'Funcionalidades',
			description: [
				'Criar moedas',
				'Comprar moedas',
				'Vender moedas',
				'Apostar em perguntas (semelhante ao Polymarket)',
				'Jogar tudo no azar',
				'Ver um gráfico Treemap de todo o mercado',
				'Competir nas tabelas de classificação'
			]
		},
		credits: {
			title: 'Créditos',
			description: ['Criado por', 'FaceDev']
		}
	},
	base: {
		'24hChange': 'Mudança em 24h',
		asset: 'Ativo',
		amount: 'Quantia',
		apply: 'Aplicar',
		buy: 'Comprar',
		buy2: 'COMPRAR',
		cancel: 'Cancelar',
		coin: 'Moeda',
		date: 'Data',
		live: 'Ao Vivo',
		noData: 'Sem dados',
		paused: 'Pausado',
		quantity: 'Quantidade',
		received: 'Recebido',
		rank: 'Posição',
		rec: 'REC',
		receiver: 'Recebedor',
		reset: 'Redefinir',
		sell: 'Vender',
		sell2: 'VENDER',
		sender: 'Remetente',
		sent: 'Enviado',
		signin: 'Entrar',
		skip: 'PULAR',
		type: 'Tipo',
		total: 'Total',
		unknown: 'Desconhecido',
		user: 'Usuário'
	},
	coin: {
		create: {
			title: 'Criar moeda',
			err: {
				title: 'Falha ao criar moeda',
				unknown: 'Ocorreu um erro ao criar a moeda'
			},
			details: {
				title: 'Detalhes da Moeda',
				icon: {
					title: 'Ícone da Moeda (Opcional)',
					description: 'Clique para carregar o ícone da sua moeda (PNG ou JPG, máx 1MB)',
					err: ['Selecione um arquivo de imagem válido', 'O ícone deve ter menos de 1MB']
				},
				name: {
					title: 'Nome da Moeda',
					placeholder: 'ex., Bitcoin',
					description: 'Escolha um nome memorável para sua criptomoeda',
					err: 'O nome deve ter entre 2 e 255 caracteres'
				},
				symbol: {
					title: 'Símbolo',
					placeholder: 'BTC',
					description:
						'Identificador curto para sua moeda (ex., BTC para Bitcoin). Será exibido como *{{name}}',
					err: 'O símbolo deve ter entre 2 e 10 caracteres'
				},
				fairLaunchSettings: [
					'Configurações de Lançamento Justo',
					['Fornecimento Total:', '1.000.000.000 tokens'],
					['Preço Inicial:', '$0.000001 por token'],
					['Você recebe', '100%', 'do fornecimento'],
					['Capitalização de Mercado Inicial:', '$1.000'],
					['Bloqueio de Negociação:', 'Período de 1 minuto exclusivo para o criador'],
					'Após a criação, você terá 1 minuto de tempo de negociação exclusivo antes que outros possam negociar. Isso permite que você compre seu fornecimento inicial.'
				],
				createCoin: ['Criar moeda (${{price}})', 'Criando...']
			},
			costsummary: {
				title: 'Resumo de Custos',
				balance: 'Saldo:',
				creationFee: 'Taxa de Criação',
				initialLiquidity: 'Liquidez Inicial',
				totalCost: 'Custo Total'
			},
			whathappensnext: {
				title: 'O Que Acontece Após o Lançamento?',
				'1': [
					'Distribuição Justa',
					'Todos começam a comprar pelo mesmo preço - sem pré-vendas ou alocações ocultas'
				],
				'2': [
					'Descoberta de Preço',
					'O preço do token aumenta automaticamente à medida que mais pessoas compram, seguindo uma curva de ligação'
				],
				'3': [
					'Negociação Instantânea',
					'A negociação começa imediatamente - compre, venda ou distribua seus tokens como desejar'
				]
			},
			signin: {
				title: 'Entre para criar sua própria moeda',
				description: 'Você precisa de uma conta para criar moedas.',
				button: 'Entrar para continuar'
			}
		},
		'24hChange': 'Mudança em 24h',
		'24hVolume': 'Volume em 24h',
		baseCurrency: 'Moeda Base',
		circulatingSupply: {
			of: 'de {{total}} total',
			title: 'Fornecimento Circulante'
		},
		comments: {
			characterLimit: '{{chars}}/500 caracteres',
			noCommentsYet: 'Ainda sem comentários. Seja o primeiro a compartilhar suas ideias!',
			placeholder: 'Compartilhe suas ideias sobre esta moeda...',
			post: 'Publicar',
			title: 'Comentários ({{count}})',
			err: 'Falhou em comentar',
			signin: 'Entre para se juntar à discussão.'
		},
		created: 'Criado',
		createdBy: 'Criado Por',
		currentPrice: 'Preço Atual',
		marketCap: 'Capitalização de Mercado',
		name: 'Nome',
		poolComposition: 'Composição do Pool',
		poolStats: 'Estatísticas do Pool',
		price: 'Preço',
		priceChart: 'Gráfico de Preço ({{time}})',
		topHolders: {
			noHolders: 'Sem detentores',
			title: 'Principais Detentores'
		},
		totalLiquidity: 'Liquidez Total',
		trade: {
			balance: 'Saldo: ${{bal}}',
			buy: {
				rec: '{{coin}} Você receberá:',
				title: 'Comprar {{coin}}',
				spentAmount: 'Valor a ser gasto ($)',
				done: ['Comprou com sucesso!', 'Comprou {{amount}} {{coin}} por ${{amount.2}}']
			},
			curPrice: 'Preço atual: ${{price}} por {{coin}}',
			estimation: 'Estimativa AMM - inclui slippage pelo impacto no pool',
			sell: {
				rec: 'Você receberá:',
				title: 'Vender {{coin}}',
				amount: 'Quantidade ({{coin}})',
				available: 'Disponível: {{amount}} {{coin}}',
				maxSellable: 'Máximo vendável: {{amount}} {{coin}} (limite do pool)',
				done: ['Venda bem sucedida!', 'Vendeu {{amount}} {{coin}} por ${{amount.2}}']
			},
			title: 'Negociar {{coin}}',
			youOwn: 'Você possui: {{amount}} {{coin}}',
			failed: 'Negociação falhou'
		},
		volume: 'Volume',
		volume24h: 'Volume (24h)',
		locked: [
			'🔒 Período exclusivo ao criador: {{time}} restantes',
			'🔒 A negociação será liberada em: {{time}} restantes'
		],
		signin: {
			title: 'Entre para começar a negociar'
		}
	},
	gambling: {
		title: 'Jogos de Azar',
		signin: {
			title: 'Entre para começar a jogar',
			description: 'Você precisa de uma conta para arriscar suas economias '
		},
		games: {
			coinflip: {
				title: 'Cara ou Coroa',
				description: 'Escolha cara ou coroa e dobre seu dinheiro!',
				chooseSide: 'Escolha um Lado',
				heads: 'Cara',
				tails: 'Coroa',
				flip: 'Jogar',
				flipping: 'Jogando',
				win: ['VITÓRIA', 'Ganhou {{amount}} em {{lastR}}'],
				loss: ['DERROTA', 'Perdeu {{amount}} em {{lastR}}']
			},
			slots: {
				title: 'Caça-níqueis',
				description: 'Combine 3 símbolos para ganhar muito!',
				chooseSide: 'Escolha um Lado',
				'5x': '3 Símbolos Iguais:',
				'2x': '2 Símbolos Iguais:',
				paytable: 'Tabela de Pagamentos',
				spin: 'Girar',
				spinning: 'Girando',
				loss: {
					title: 'NENHUMA COMBINAÇÃO',
					description: 'Perdeu {{amount}}'
				},
				win: {
					title: 'VITÓRIA - {{winType}}',
					'2 OF A KIND': '2 IGUAIS',
					'5 OF A KIND': '5 IGUAIS',
					description: 'Ganhou {{amount}}'
				}
			},
			mines: {
				title: 'Minas',
				description: 'Navegue pelo campo minado e saqueie antes de atingir uma mina!',
				numberMines: 'Número de Minas',
				'1': ['Você receberá', 'por ladrilho, probabilidade de ganhar:'],
				'2': 'Nota: O pagamento máximo por jogo é limitado a $2.000.000.',
				start: 'Iniciar Jogo',
				abort: 'Cancelar Aposta',
				currentProfit: 'Lucro Atual:',
				nextTile: 'Próximo Ladrilho',
				cashOut: 'Sacar',
				currentMultiplier: 'Multiplicador Atual:'
			},
			dice: {
				title: 'Dado',
				description: 'Escolha um número e role o dado para ganhar 3x a sua aposta!',
				chooseNumber: 'Escolha um Número',
				roll: 'Rolar',
				rolling: 'Rolando',
				lost: ['DERROTA', 'Perdeu {{amount}} em {{number}}'],
				won: ['VITÓRIA', 'Ganhou {{amount}} em {{number}}'],
				failed: 'Falhou em rolar o dado'
			}
		},
		live: {
			noData: {
				title: 'Aguardando atividade...',
				description: 'Atividade de jogos de azar de alto risco aparecerá aqui em tempo real.'
			},
			description: 'Mostrando apenas apostas de $1.000 ou mais',
			won: 'ganhou',
			lost: 'perdeu',
			on: 'em {{game}}'
		},
		balance: 'Saldo',
		betAmount: 'Valor da Aposta',
		betAmountPlaceholder: 'Insira o valor da aposta',
		maxBet: 'Aposta máxima: {{amount}}',
		failed: 'Falhou em apostar'
	},
	home: {
		good: {
			afternoon: 'Boa tarde, {{name}}',
			evening: 'Boa noite, {{name}}',
			morning: 'Bom dia, {{name}}',
			night: 'Boa noite, {{name}}'
		},
		marketOverview: {
			description: 'Aqui está a visão geral do mercado para hoje.',
			title: 'Visão Geral do Mercado'
		},
		nocoinsavailable: {
			description: 'Seja o primeiro a criar uma moeda!',
			title: 'Nenhuma moeda disponível'
		},
		title: 'Início',
		welcome: 'Bem-vindo ao Rugplay!',
		signInRequired: ['Você precisa', 'entrar', 'para jogar.']
	},
	hopium: {
		active: 'Ativo',
		all: 'Todos',
		ask: 'Perguntar',
		chart: 'Gráfico',
		create: {
			description: 'Crie uma pergunta de sim/não que será resolvida por IA.',
			description2:
				'A IA determinará automaticamente a data e os critérios de resolução apropriados.',
			input: {
				characterLimit: '{{chars}}/200 caracteres',
				placeholder: 'O *SKIBIDI atingirá o preço de $100 hoje?'
			},
			question: 'Pergunta *',
			title: 'Criar'
		},
		description: 'Mercados de previsão alimentados por IA. Crie perguntas e aposte em resultados.',
		ends: 'Termina em {{time}}',
		marketStats: {
			created: 'Criado:',
			resolves: 'Resolve:',
			title: 'Estatísticas do Mercado',
			totalBets: 'Total de Apostas:',
			totalVolume: 'Volume Total:'
		},
		minBalance:
			'Você precisa de pelo menos $100.000 em seu portfólio (dinheiro) para criar uma pergunta.',
		no: 'NÃO',
		noQuestions: {
			description: 'Seja o primeiro a criar uma pergunta de previsão!',
			title: 'Nenhuma pergunta ainda'
		},
		placeBet: {
			balance: 'Saldo:',
			enteramount: 'Insira a quantia...',
			title: 'Fazer Aposta',
			toWin: 'Para ganhar:'
		},
		publish: ['Publicar', 'Processando...'],
		recentActivity: 'Atividade Recente',
		remaining: '{{time}} restante',
		resolving: 'Resolvendo',
		resolved: 'Resolvido',
		startBetting: {
			signin: 'Entre para fazer apostas',
			title: 'Começar a Apostar'
		},
		title: 'Hopium',
		yes: 'SIM',
		yourBets: 'Suas apostas:'
	},
	leaderboard: {
		err: 'Falha ao carregar dados da tabela de classificação',
		description: 'Melhores desempenhos e atividade do mercado',
		biggestLosses: {
			description: 'Usuários que experimentaram as maiores perdas hoje',
			loss: 'Perda',
			noData: 'Nenhuma grande perda registrada hoje',
			title: 'Maiores Perdas (24h)'
		},
		highestPortfolio: {
			description: 'Usuários com os maiores saldos em dinheiro líquido',
			noData: 'Nenhum portfólio grande ainda! 📉',
			portfolio: 'Portfólio',
			title: 'Maiores Valores de Portfólio',
			liquidity: 'Liquidez'
		},
		rank: 'Classificação',
		title: 'Tabela de Classificação',
		topCash: {
			cash: 'Dinheiro',
			description: 'Usuários com os maiores saldos em dinheiro líquido',
			noData: 'Todos investiram! 💸',
			title: 'Maiores Detentores de Dinheiro'
		},
		topRugpullers: {
			description: 'Usuários que obtiveram o maior lucro vendendo moedas hoje',
			noData: 'Nenhum grande lucro registrado hoje',
			profit: 'Lucro',
			title: 'Maiores Rugpullers (24h)'
		},
		user: 'Usuário',
		search: {
			placeholder: 'Pesquisar por nome de usuário...',
			noFound: {
				title: 'Nenhum usuário encontrado',
				description: 'Nenhum usuário corresponde à sua pesquisa "{{search}}"',
				clear: 'Limpar Pesquisa'
			},
			description: 'Mostrando {{1}} - {{2}} de {{3}} resultados'
		}
	},
	livetrades: {
		d: {
			bought: 'comprado por',
			sold: 'vendido por'
		},
		desc: 'Atividade de negociação em tempo real para todas as negociações',
		notrades: 'Ainda sem grandes negociações...',
		stream: 'Fluxo',
		title: 'Negociações ao Vivo',
		trades: ['{{count}} negociação', '{{count}} negociações'],
		waiting: {
			description: 'Todas as negociações aparecerão aqui em tempo real.',
			title: 'Aguardando Negociações'
		},
		by: '*{{coin}} por @{{user}}'
	},
	market: {
		'24hChange': {
			title: 'Mudança em 24h',
			values: [
				'Todas as mudanças',
				'Apenas ganhadores',
				'Apenas perdedores',
				'Quentes (±10%)',
				'Hild (±50%)'
			]
		},
		apply: 'Aplicar',
		description: 'Descubra moedas, acompanhe o desempenho e encontre seu próximo investimento',
		input: {
			filters: {
				clearAll: 'Limpar todos os Filtros',
				clearAll2: 'Limpar todos os filtros',
				title: 'Filtros'
			},
			noMatch:
				'Nenhuma moeda corresponde à sua pesquisa "{{query}}". Tente palavras-chave diferentes ou ajuste os filtros.',
			placeholder: 'Pesquisar moedas por nome ou símbolo...'
		},
		noCoinsFound: {
			description: ['O mercado parece calmo...', 'criar uma moeda', '? :)'],
			title: 'Nenhuma moeda encontrada'
		},
		priceRange: {
			title: 'Faixa de Preço',
			values: ['Todos os preços', 'Abaixo de $1', '$1 - $10', '$10 - $100', 'Acima de $100']
		},
		showing: 'Mostrando {{val}}-{{total}} de {{coins}} moedas',
		sortBy: 'Ordenar Por',
		sortOrder: {
			title: 'Ordem de Classificação',
			values: ['Maior para Menor', 'Menor para Maior']
		},
		title: 'Mercado'
	},
	notifications: {
		title: 'Notificações',
		description: 'Fique atualizado com suas atividades',
		noNotifications: {
			title: 'Nenhuma notificação ainda',
			description: 'Você verá atualizações sobre suas atividades aqui'
		},
		signin: {
			title: 'Por favor, entre',
			description: 'Você precisa estar logado para ver as notificações'
		}
	},
	pagination: {
		morepages: 'Mais páginas',
		next: {
			title: 'Próximo'
		},
		previous: {
			label: 'Ir para a página anterior',
			title: 'Anterior'
		}
	},
	portfolio: {
		description: 'Gerencie seus investimentos e transações',
		loginMessage: 'Você precisa estar logado para ver seu portfólio',
		title: 'Portfólio',
		err: ['Falha ao carregar dados do portfólio', 'Falha ao carregar transações'],
		holdings: {
			title: 'Seus ativos',
			description: 'Posições atuais em seu portfólio'
		},
		sendMoney: {
			title: 'Enviar Dinheiro',
			title2: 'Enviar',
			description: 'Envie dinheiro ou moedas para outro usuário',
			recipient: ['Recipiente', 'Digite o username (sem o @)'],
			type: ['Tipo', 'Dinheiro ($)', 'Moedas'],
			coins: ['Selecione uma moeda', '*{{name}} ({{available}} disponível)'],
			failed: 'Transferência falhou',
			sent: ['Coins enviados com sucesso!']
		},
		recentTransactions: 'Transações Recentes',
		total: 'Total',
		cashBalance: ['Saldo em Dinheiro', '{{percent}}% do portfólio'],
		coinHoldings: ['Ativos em Moedas', '{{count}} posições'],
		noCoins: [
			'Nenhum ativo em moedas',
			'Você ainda não investiu em nenhuma moeda. Comece comprando moedas existentes.',
			'Procurar Moedas'
		],
		noTransactions: [
			'Nenhuma transação ainda',
			'Você ainda não fez nenhuma negociação. Comece comprando ou vendendo moedas.'
		],
		value: 'Valor',
		pl: 'P&L %',
		portfolioPercent: '% do Portfólio'
	},
	prestige: {
		title: 'Prestígio',
		description: 'Reinicie seu progresso para melhorar seu status de negociação',
		how: [
			'Como',
			['Atenda aos Requisitos', 'Acumule dinheiro suficiente para pagar o custo do prestígio'],
			['Redefinir Progresso', 'Todo o dinheiro e ativos são apagados, mas o histórico permanece'],
			[
				'Ganhe Status',
				'Ganhe um título de prestígio exclusivo, recompensas diárias aprimoradas e redefina o tempo de recarga de sua recompensa diária'
			]
		],
		progress: {
			title: 'Progresso',
			description: 'Progresso para {{name}}',
			required: 'Requerido',
			yourCash: 'Seu Dinheiro',
			perma: 'Prestigiar é permanente e não pode ser desfeito!',
			stillNeeded: 'Ainda necessário',
			button: ['Precisa de mais {{bal}} para prestigiar', 'Vamos lá', 'Avançando para {{name}}'],
			star: ['Você é uma estrela!', 'Você alcançou o maior nível de prestígio disponível.'],
			tip: 'Dica: Venda suas posições de moedas'
		},
		preview: {
			title: 'Prévia',
			current: 'Atual',
			after: 'Depois',
			description: 'Você também ganha {{percent}}% a mais em recompensas diárias.'
		},
		levels: {
			title: 'Níveis',
			d: {
				'1': 'Prestígio I',
				'2': 'Prestígio II',
				'3': 'Prestígio III',
				'4': 'Prestígio IV',
				'5': 'Prestígio V'
			}
		},
		popup: {
			title: 'Confirmar',
			description:
				'Esta ação é permanente e não pode ser desfeita. Por favor, revise as consequências cuidadosamente.',
			lose: [
				'Você perderá:',
				'Saldo em dinheiro: {{amount}}',
				'Todos os ativos em moedas no valor de {{amount}}',
				'Valor total do portfólio: {{amount}}'
			],
			gain: [
				'Você ganhará:',
				'Mais dinheiro em recompensas diárias',
				'Uma redefinição de recompensa diária',
				'Emblema e status de Prestígio',
				'Nós venderemos automaticamente todos os seus ativos em moedas'
			],
			confirm: [
				'Digite "PRESTIGE" para confirmar', // Don't translate "PRESTIGE" here.
				'DIGITE PRESTIGE AQUI'
			],
			proceed: ['Precedindo...', 'Prosseguir'],
			done: 'Parabéns! Você alcancou {{name}}!',
			err: 'Falhou em prestigiar.'
		},
		signin: {
			title: 'Entre para prestigiar',
			description: 'Você precisa de uma conta para prestigiar.'
		},
		err: 'Falhou para carregar dados do prestígio'
	},
	settings: {
		title: 'Configurações'
	},
	sidebar: {
		account: 'Conta',
		api: 'API',
		logout: 'Sair',
		portfolio: {
			cash: 'Dinheiro',
			coins: 'Moedas',
			title: 'Portfólio',
			totalValue: 'Valor Total'
		},
		themes: {
			dark: 'Modo Escuro',
			light: 'Modo Claro'
		}
	},
	signin: {
		button: 'Entrar',
		description:
			'Escolha um serviço para entrar. Sua conta será criada automaticamente se você não tiver uma.',
		options: {
			google: 'Continuar com Google'
		},
		terms: ['Ao continuar, você concorda com nossos', 'e'],
		title: 'Entrar no Rugplay'
	},
	terms: {
		privacy: 'Política de Privacidade',
		service: 'Termos de Serviço'
	},
	title: 'Rugplay',
	treemap: {
		coins: '{{count}} moedas',
		description:
			'Representação visual do mercado de criptomoedas. O tamanho indica a capitalização de mercado, a cor mostra a mudança de preço em 24h.',
		fullscreen: {
			join: 'Tela Cheia',
			leave: 'Sair da Tela Cheia'
		},
		lastUpdated: 'Última atualização: {{time}}',
		negative: 'Mudança negativa em 24h',
		noCoins: {
			description: 'Crie algumas moedas para ver a visualização do treemap.'
		},
		positive: 'Mudança positiva em 24h',
		title: 'Treemap',
		'title²': 'Treemap do Mercado'
	},
	user: {
		'24hTradingVolume': {
			description: '{{count}} negociações hoje',
			title: 'Volume de Negociação em 24h'
		},
		buyActivity: {
			description: 'Valor total gasto',
			description2: 'Volume de compra em 24h',
			title: 'Atividade de Compra'
		},
		buySellRatio: {
			buy: 'compra',
			sell: 'venda',
			title: 'Proporção Compra/Venda'
		},
		createdCoins: {
			description: 'Moedas lançadas por {{name}}',
			title: 'Moedas Criadas ({{count}})'
		},
		id: '{{id}}º a entrar',
		streak: 'Sequência de {{days}} dias',
		illiquidValue: {
			description: 'Ativos em Moedas',
			title: 'Valor Não Líquido'
		},
		joined: 'Aderiu em {{date}}',
		liquidValue: {
			description: 'Dinheiro disponível',
			title: 'Valor Líquido'
		},
		netProfit: {
			description: ['Lucro total', 'Prejuízo total'],
			title: 'Lucro Líquido'
		},
		recentTrading: {
			description: 'Últimas transações de {{name}}',
			portfolio: 'Sua atividade de negociação mais recente',
			title: 'Atividade de Negociação Recente'
		},
		sellActivity: {
			description: 'Valor total recebido',
			description2: 'Volume de venda em 24h',
			title: 'Atividade de Venda'
		},
		title: 'Perfil do Usuário',
		totalLosses: {
			description: 'Total de perdas em jogos de azar',
			title: 'Perdas Totais'
		},
		totalPortfolio: {
			description: '{{count}} ativos',
			title: 'Portfólio Total'
		},
		totalVolume: {
			description: '{{count}} negociações totais',
			title: 'Volume Total de Negociação'
		},
		totalWins: {
			description: 'Total de ganhos em jogos de azar',
			title: 'Ganhos Totais'
		},
		winRate: {
			description: 'Porcentagem de vitórias',
			title: 'Taxa de Vitórias'
		}
	},
	viewall: 'Ver todos',
	tryagain: 'Tentar Novamente',
	time: {
		'1m': '1 minuto',
		'5m': '5 minutos',
		'15m': '15 minutos',
		'1h': '1 hora',
		'4h': '4 horas',
		'1d': '1 dia'
	},
	transactions: {
		title: 'Transações',
		description: 'Registro completo de sua atividade de negociação e transações',
		input: {
			placeholder: 'Pesquisar por nome ou símbolo da moeda...',
			filters: {
				name: 'Filtros',
				sortBy: 'Ordenar por',
				sortOrder: ['Ordem de Classificação', 'Mais recentes primeiro', 'Mais antigos primeiro'],
				transactionType: [
					'Tipo de Transação',
					'Todas as negociações',
					'Apenas compras',
					'Apenas vendas',
					'Transferências recebidas',
					'Transferências enviadas'
				]
			}
		},
		history: {
			title: 'Histórico',
			description: 'Registro completo de sua atividade de negociação e transferências'
		},
		empty: {
			title: 'Nenhuma transação encontrada',
			description: [
				'Você ainda não fez nenhuma negociação ou transferência. Comece comprando moedas ou enviando dinheiro para outros usuários.',
				'Nenhuma transação corresponde aos seus filtros atuais. Tente ajustar seus critérios de pesquisa.'
			]
		}
	},
	promocode: {
		title: 'Código promocional',
		description: 'Insira seu código promocional abaixo para resgatar recompensas e bônus.',
		input: ['Código Promocional', 'CÓDIGO...'],
		redeem: ['Resgatar Código', 'Verificando...'],
		err: [
			'Código promocional inválido',
			'Falha ao verificar o código promocional. Por favor, tente novamente.'
		],
		messages: {
			PR: 'O código promocional é obrigatório',
			IPC: 'Código promocional inválido',
			NA: 'Este código promocional não está mais ativo',
			EX: 'Este código promocional expirou',
			AU: 'Você já usou este código promocional',
			UL: 'Este código promocional atingiu seu limite de uso',
			RD: 'Código promocional resgatado! Você recebeu ${{balance}}.'
		}
	},
	error: {
		unknown: 'Um erro aconteceu'
	}
} satisfies typeof en;
