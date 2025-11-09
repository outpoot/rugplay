import en from "./en"
export default {
	lang: {
		code: 'es',
		name: 'Español',
		flagCode: 'es'
	},
	about: {
		desc: 'Un simulador de trading de criptomonedas donde puedes practicar sin perder dinero real. ¡Crea monedas, haz comercio con ellas, y haz rug pull!',
		title: 'Acerca de',
		usermanual: {
			tips: {
				'1': {
					desc: 'Rugplay es un simulador de trading de criptomonedas donde puedes practicar trading sin riesgo financiero real. ¡Comienza con dinero virtual, crea monedas, apuesta en mercados de predicción y, lo más importante, haz rugpull!'
				},
				'10': {
					desc: 'Hopium te permite apostar en preguntas de sí/no sobre el futuro. La IA resuelve automáticamente las preguntas basándose en datos del mundo real. Pon a prueba tus habilidades de predicción y gana con pronósticos correctos. Mantén $100,000 en efectivo para crear tu propia pregunta de Hopium :)',
					title: 'Hopium - Mercados de Predicción'
				},
				'11': {
					desc: 'Visita la sección de Apuestas para juegos de alto riesgo y alta recompensa. Recuerda: son juegos de pura suerte. ¡Solo apuesta lo que puedas permitirte perder, incluso en esta simulación!',
					title: 'Juegos de Apuestas'
				},
				'12': {
					desc: 'Observa la página de Trades en Vivo para ver la actividad de trading en tiempo real de todas las monedas. Esto te ayuda a detectar monedas en tendencia y a comprender el sentimiento del mercado. La barra lateral muestra trades de $1,000+, mientras que el feed principal muestra cada transacción.',
					title: 'Feed de Trades en Vivo'
				},
				'13': {
					desc: 'La página de Treemap muestra una representación visual de todo el mercado. Los cuadrados más grandes representan capitalizaciones de mercado más altas, y los colores indican el rendimiento del precio.',
					title: 'Visualización Treemap'
				},
				'14': {
					desc: '¡Compite con otros usuarios en la Tabla de Clasificación. Sube de rango tomando decisiones de inversión inteligentes!',
					title: 'Tablas de Clasificación'
				},
				'15': {
					desc: '¡Inicia sesión diariamente para reclamar dinero gratis! Tu racha de inicio de sesión aumenta tu bono diario. Los jugadores consistentes obtienen más dinero virtual para invertir.',
					title: 'Recompensas Diarias'
				},
				'16': {
					desc: 'Empieza con poco, diversifica tus activos y no inviertas todo en una sola moneda. Busca monedas con tenedores diversificados para evitar rug pulls absolutos. ¡La gente se está volviendo astuta!',
					title: 'Conclusión'
				},
				'2': {
					desc: 'Haz clic en "Crear moneda" en la barra lateral para lanzar tu propia criptomoneda. Elige un nombre, símbolo único y sube un ícono. Cada moneda empieza con un precio de $0.000001',
					title: 'Creando Tu Primera Moneda'
				},
				'3': {
					desc: 'Cada moneda tiene un "pool de liquidez", con tu moneda y la moneda base ($). Los precios se determinan por la proporción entre estas cantidades. Cuando compras, el precio sube; cuando vendes, el precio baja.',
					title: 'Entendiendo los Pools de Liquidez'
				},
				'4': {
					desc: 'Rugplay utiliza un sistema AMM donde los precios se calculan automáticamente en función de la oferta y la demanda. Cuanto más compras, más sube el precio. Cuanto más vendes, más cae. Los trades grandes crean "deslizamiento" (slippage) - el cambio de precio durante tu trade.',
					title: 'AMM - Creador de Mercado Automatizado'
				},
				'5': {
					desc: 'Navega a la página de cualquier moneda y haz clic en "Comprar". Ingresa la cantidad que quieres gastar. El AMM (Creador de Mercado Automatizado) te mostrará exactamente cuántas monedas recibirás, incluyendo el deslizamiento.',
					title: 'Comprando Monedas'
				},
				'6': {
					desc: 'En una página de moneda, haz clic en "Vender" e ingresa cuántas monedas quieres vender. Puedes ver tus activos en tu Portafolio. Recuerda: ¡vender grandes cantidades puede impactar significativamente el precio!',
					title: 'Vendiendo Monedas'
				},
				'7': {
					desc: 'Un "rug pull" ocurre cuando grandes tenedores (incluidos los creadores de la moneda) venden todos sus activos a la vez, desplomando el precio.',
					title: '¿Qué es un "Rug Pull"?'
				},
				'8': {
					desc: 'Revisa tu página de Portafolio para ver todos tus activos, sus valores actuales y transacciones recientes. Sigue tu rendimiento y ve qué inversiones están funcionando bien.',
					title: 'Gestión de Portafolio'
				},
				'9': {
					desc: 'La página de Mercado muestra todas las monedas disponibles ordenadas por capitalización de mercado, volumen y cambios de precio. Úsala para descubrir monedas en tendencia y oportunidades de inversión.',
					title: 'Resumen del Mercado'
				}
			},
			title: 'Manual de Usuario'
		},
		rugplay: {
			title: 'Acerca de Rugplay',
			description: [
				'Rugplay es una simulación realista de trading de criptomonedas que se centra en las mecánicas de DeFi (Finanzas Descentralizadas) y los riesgos inherentes del trading descentralizado.',
				'Practica estrategias de trading, crea tus propias monedas y aprende sobre la dinámica del mercado sin ningún riesgo financiero real. Experimenta el trading AMM, los pools de liquidez e incluso los rug pulls. (obviamente)',
				'¡Únete a la comunidad de degenerados donde la paranoia es rentable!'
			]
		},
		features: {
			title: 'Características',
			description: [
				'Crear monedas',
				'Comprar monedas',
				'Vender monedas',
				'Apostar en preguntas (similar a Polymarket)',
				'Apostarlo todo',
				'Ver un gráfico Treemap del mercado entero',
				'Competir en tablas de clasificación'
			]
		},
		credits: {
			title: 'Créditos',
			description: ['Creado por', 'FaceDev']
		}
	},
	base: {
		'24hChange': 'Cambio 24h',
		asset: 'Activo',
		amount: 'Cantidad',
		apply: 'Aplicar',
		buy: 'Comprar',
		buy2: 'COMPRAR',
		cancel: 'Cancelar',
		coin: 'Moneda',
		date: 'Fecha',
		live: 'En Vivo',
		noData: 'Sin datos',
		paused: 'Pausado',
		quantity: 'Cantidad',
		rank: 'Rango',
		received: 'Recibido',
		rec: 'REC',
		receiver: 'Receptor',
		reset: 'Restablecer',
		sell: 'Vender',
		sell2: 'VENDER',
		sender: 'Emisor',
		sent: 'Enviado',
		signin: 'Iniciar Sesión',
		skip: 'SALTAR',
		type: 'Tipo',
		total: 'Total',
		unknown: 'Desconocido',
		user: 'Usuario'
	},
	coin: {
		create: {
			title: 'Crear moneda',
			err: {
				title: 'Fallo al crear la moneda',
				unknown: 'Ocurrió un error al crear la moneda'
			},
			details: {
				title: 'Detalles de la Moneda',
				icon: {
					title: 'Ícono de la Moneda (Opcional)',
					description: 'Haz clic para subir el ícono de tu moneda (PNG o JPG, máx. 1MB)',
					err: [
						'Por favor, selecciona un archivo de imagen válido',
						'El ícono debe ser menor a 1MB'
					]
				},
				name: {
					title: 'Nombre de la Moneda',
					placeholder: 'Ej., Bitcoin',
					description: 'Elige un nombre memorable para tu criptomoneda',
					err: 'El nombre debe tener entre 2 y 255 caracteres'
				},
				symbol: {
					title: 'Símbolo',
					placeholder: 'BTC',
					description:
						'Identificador corto para tu moneda (ej., BTC para Bitcoin). Se mostrará como *{{name}}',
					err: 'El símbolo debe tener entre 2 y 10 caracteres'
				},
				fairLaunchSettings: [
					'Configuración de Lanzamiento Justo',
					['Suministro Total:', '1,000,000,000 tokens'],
					['Precio Inicial:', '$0.000001 por token'],
					['Tú recibes', '100%', 'del suministro'],
					['Capitalización de Mercado Inicial:', '$1,000'],
					['Bloqueo de Trading:', '1 minuto de período solo para el creador'],
					'Después de la creación, tendrás 1 minuto de tiempo de trading exclusivo antes de que otros puedan operar. Esto te permite comprar tu suministro inicial.'
				],
				createCoin: ['Crear moneda (${{price}})', 'Creando...']
			},
			costsummary: {
				title: 'Resumen de Costos',
				balance: 'Balance:',
				creationFee: 'Tarifa de Creación',
				initialLiquidity: 'Liquidez Inicial',
				totalCost: 'Costo Total'
			},
			whathappensnext: {
				title: '¿Qué Sucede Después del Lanzamiento?',
				'1': [
					'Distribución Justa',
					'Todos comienzan a comprar al mismo precio - sin preventas ni asignaciones ocultas'
				],
				'2': [
					'Descubrimiento de Precios',
					'El precio del token aumenta automáticamente a medida que más personas compran, siguiendo una curva de unión (bonding curve)'
				],
				'3': [
					'Trading Instantáneo',
					'El trading comienza inmediatamente - compra, vende o distribuye tus tokens como desees'
				]
			},
			signin: {
				title: 'Inicia sesión para crear tu propia moneda',
				description: 'Necesitas una cuenta para crear monedas.',
				button: 'Iniciar sesión para continuar'
			}
		},
		'24hChange': 'Cambio 24h',
		'24hVolume': 'Volumen 24h',
		baseCurrency: 'Moneda Base',
		circulatingSupply: {
			of: 'de {{total}} total',
			title: 'Suministro en Circulación'
		},
		comments: {
			characterLimit: '{{chars}}/500 caracteres',
			noCommentsYet: 'Aún no hay comentarios. ¡Sé el primero en compartir tu opinión!',
			placeholder: 'Comparte tu opinión sobre esta moneda...',
			post: 'Publicar',
			title: 'Comentarios ({{count}})',
			err: 'Fallo al publicar comentario',
			signin: 'Inicia sesión para unirte a la discusión'
		},
		created: 'Creado',
		createdBy: 'Creado Por',
		currentPrice: 'Precio Actual',
		marketCap: 'Capitalización de Mercado',
		name: 'Nombre',
		poolComposition: 'Composición del Pool',
		poolStats: 'Estadísticas del Pool',
		price: 'Precio',
		priceChart: 'Gráfico de Precios ({{time}})',
		topHolders: {
			noHolders: 'Sin tenedores',
			title: 'Principales Tenedores'
		},
		totalLiquidity: 'Liquidez Total',
		trade: {
			balance: 'Balance: ${{bal}}',
			buy: {
				rec: '{{coin}} Recibirás:',
				title: 'Comprar {{coin}}',
				spentAmount: 'Cantidad a gastar ($)'
			},
			curPrice: 'Precio actual: ${{price}} por {{coin}}',
			estimation: 'Estimación AMM - incluye deslizamiento (slippage) por impacto del pool',
			sell: {
				rec: 'Recibirás:',
				title: 'Vender {{coin}}',
				amount: 'Cantidad ({{coin}})',
				available: 'Disponible: {{amount}} {{coin}}',
				maxSellable: 'Máximo vendible: {{amount}} {{coin}} (límite del pool)'
			},
			title: 'Comercio {{coin}}',
			youOwn: 'Posees: {{amount}} {{coin}}'
		},
		volume: 'Volumen',
		volume24h: 'Volumen (24h)',
		locked: [
			'🔒 Período solo para el creador: {{time}} restante',
			'🔒 El trading se desbloquea en: {{time}} restante'
		],
		signin: {
			title: 'Inicia sesión para comenzar a tradear'
		}
	},
	gambling: {
		title: 'Apuestas',
		signin: {
			title: 'Inicia sesión para empezar a apostar',
			description: 'Necesitas una cuenta para apostar tus ahorros de toda la vida '
		},
		games: {
			coinflip: {
				title: 'Lanzamiento de Moneda',
				description: '¡Elige cara o cruz y duplica tu dinero!',
				chooseSide: 'Elige un lado',
				heads: 'Cara',
				tails: 'Cruz',
				flip: 'Lanzar',
				flipping: 'Lanzando',
				win: ['GANASTE', 'Ganaste {{amount}} en {{lastR}}'],
				loss: ['PERDISTE', 'Perdiste {{amount}} en {{lastR}}']
			},
			slots: {
				title: 'Tragaperras (Slots)',
				description: '¡Combina 3 símbolos para ganar en grande!',
				chooseSide: 'Elige un lado',
				'5x': '3 Símbolos Iguales:',
				'2x': '2 Símbolos Iguales:',
				paytable: 'Tabla de Pagos',
				spin: 'Girar',
				spinning: 'Girando',
				loss: {
					title: 'SIN COINCIDENCIA',
					description: 'Perdiste {{amount}}'
				},
				win: {
					title: 'GANASTE - {{winType}}',
					'2 OF A KIND': '2 IGUALES',
					'5 OF A KIND': '5 IGUALES',
					description: 'Ganaste {{amount}}'
				}
			},
			mines: {
				title: 'Minas',
				description: '¡Navega por el campo minado y cobra antes de pisar una mina!',
				numberMines: 'Número de Minas',
				'1': ['Recibirás', 'por baldosa, probabilidad de ganar:'],
				'2': 'Nota: El pago máximo por juego está limitado a $2,000,000.',
				start: 'Iniciar Juego',
				abort: 'Abortar Apuesta',
				currentProfit: 'Ganancia Actual:',
				nextTile: 'Siguiente Baldosa',
				cashOut: 'Retirar',
				currentMultiplier: 'Multiplicador Actual:'
			}
		},
		live: {
			noData: {
				title: 'Esperando actividad...',
				description: 'La actividad de apuestas de alto riesgo aparecerá aquí en tiempo real.'
			},
			description: 'Mostrando solo apuestas de $1,000 o más',
			won: 'ganó',
			lost: 'perdió',
			on: 'en {{game}}'
		},
		balance: 'Balance',
		betAmount: 'Cantidad de Apuesta',
		betAmountPlaceholder: 'Ingresa la cantidad de apuesta',
		maxBet: 'Apuesta máxima: {{amount}}'
	},
	home: {
		good: {
			afternoon: 'Buenas tardes, {{name}}',
			evening: 'Buenas noches, {{name}}',
			morning: 'Buenos días, {{name}}',
			night: 'Buenas noches, {{name}}'
		},
		marketOverview: {
			description: 'Aquí tienes el resumen del mercado de hoy.',
			title: 'Resumen del Mercado'
		},
		nocoinsavailable: {
			description: '¡Sé el primero en crear una moneda!',
			title: 'No hay monedas disponibles'
		},
		title: 'Inicio',
		welcome: '¡Bienvenido a Rugplay!',
		signInRequired: ['Necesitas', 'iniciar sesión', 'para jugar.']
	},
	hopium: {
		active: 'Activo',
		all: 'Todos',
		ask: 'Preguntar',
		chart: 'Gráfico',
		create: {
			description: 'Crea una pregunta de sí/no que será resuelta por la IA.',
			description2:
				'La IA determinará automáticamente la fecha y los criterios de resolución apropiados.',
			input: {
				characterLimit: '{{chars}}/200 caracteres',
				placeholder: '¿*SKIBIDI alcanzará un precio de $100 hoy?'
			},
			question: 'Pregunta *',
			title: 'Crear'
		},
		description:
			'Mercados de predicción impulsados por IA. Crea preguntas y apuesta por los resultados.',
		ends: 'Termina en {{time}}',
		marketStats: {
			created: 'Creado:',
			resolves: 'Resuelve:',
			title: 'Estadísticas del Mercado',
			totalBets: 'Total de Apuestas:',
			totalVolume: 'Volumen Total:'
		},
		minBalance: 'Necesitas al menos $100,000 en tu portafolio (efectivo) para crear una pregunta.',
		no: 'NO',
		noQuestions: {
			description: '¡Sé el primero en crear una pregunta de predicción!',
			title: 'Aún no hay preguntas'
		},
		placeBet: {
			balance: 'Balance:',
			enteramount: 'Ingresa la cantidad...',
			title: 'Realizar Apuesta',
			toWin: 'Para ganar:'
		},
		publish: ['Publicar', 'Procesando...'],
		recentActivity: 'Actividad Reciente',
		remaining: '{{time}} restante',
		resolving: 'Resolviendo',
		resolved: 'Resuelto',
		startBetting: {
			signin: 'Inicia sesión para realizar apuestas',
			title: 'Comenzar a Apostar'
		},
		title: 'Hopium',
		yes: 'SÍ',
		yourBets: 'Tus apuestas:'
	},
	leaderboard: {
		err: 'Fallo al cargar los datos de la tabla de clasificación',
		description: 'Mejores rendimientos y actividad del mercado',
		biggestLosses: {
			description: 'Usuarios que experimentaron las mayores pérdidas hoy',
			loss: 'Pérdida',
			noData: 'No se registraron pérdidas importantes hoy',
			title: 'Mayores Pérdidas (24h)'
		},
		highestPortfolio: {
			description: 'Usuarios con los saldos de efectivo líquido más altos',
			noData: '¡Aún no hay grandes portafolios! 📉',
			portfolio: 'Portafolio',
			title: 'Valores de Portafolio Más Altos',
			liquidity: 'Liquidez'
		},
		rank: 'Rango',
		title: 'Tabla de Clasificación',
		topCash: {
			cash: 'Efectivo',
			description: 'Usuarios con los saldos de efectivo líquido más altos',
			noData: '¡Todos han invertido! 💸',
			title: 'Principales Tenedores de Efectivo'
		},
		topRugpullers: {
			description: 'Usuarios que obtuvieron la mayor ganancia vendiendo monedas hoy',
			noData: 'No se registraron ganancias importantes hoy',
			profit: 'Ganancia',
			title: 'Principales Rugpullers (24h)'
		},
		user: 'Usuario',
		search: {
			placeholder: 'Buscar por nombre de usuario...',
			noFound: {
				title: 'No se encontraron usuarios',
				description: 'Ningún usuario coincide con tu búsqueda "{{search}}"',
				clear: 'Borrar Búsqueda'
			},
			description: 'Mostrando {{1}} - {{2}} de {{3}} resultados'
		}
	},
	livetrades: {
		d: {
			bought: 'comprado por',
			sold: 'vendido por'
		},
		desc: 'Actividad de trading en tiempo real para todos los trades',
		notrades: 'Aún no hay trades grandes...',
		stream: 'Stream',
		title: 'Trades en Vivo',
		trades: ['{{count}} trade', '{{count}} trades'],
		waiting: {
			description: 'Todos los trades aparecerán aquí en tiempo real.',
			title: 'Esperando Trades'
		},
		by: '*{{coin}} por @{{user}}'
	},
	market: {
		'24hChange': {
			title: 'Cambio 24h',
			values: [
				'Todos los cambios',
				'Solo ganadores',
				'Solo perdedores',
				'Calientes (±10%)',
				'Hirviendo (±50%)'
			]
		},
		apply: 'Aplicar',
		description: 'Descubre monedas, sigue el rendimiento y encuentra tu próxima inversión',
		input: {
			filters: {
				clearAll: 'Borrar todos los Filtros',
				clearAll2: 'Borrar todos los filtros',
				title: 'Filtros'
			},
			noMatch:
				'Ninguna moneda coincide con tu búsqueda "{{query}}". Prueba con diferentes palabras clave o ajusta los filtros.',
			placeholder: 'Buscar monedas por nombre o símbolo...'
		},
		noCoinsFound: {
			description: ['El mercado parece tranquilo...', 'crear una moneda', '? :)'],
			title: 'No se encontraron monedas'
		},
		priceRange: {
			title: 'Rango de Precios',
			values: ['Todos los precios', 'Menos de $1', '$1 - $10', '$10 - $100', 'Más de $100']
		},
		showing: 'Mostrando {{val}}-{{total}} de {{coins}} monedas',
		sortBy: 'Ordenar Por',
		sortOrder: {
			title: 'Orden de Clasificación',
			values: ['Mayor a Menor', 'Menor a Mayor']
		},
		title: 'Mercado'
	},
	notifications: {
		title: 'Notificaciones',
		description: 'Mantente al día con tus actividades',
		noNotifications: {
			title: 'Aún no hay notificaciones',
			description: 'Verás actualizaciones sobre tus actividades aquí'
		},
		signin: {
			title: 'Por favor, inicia sesión',
			description: 'Debes iniciar sesión para ver las notificaciones'
		}
	},
	pagination: {
		morepages: 'Más páginas',
		next: {
			title: 'Siguiente'
		},
		previous: {
			label: 'Ir a la página anterior',
			title: 'Anterior'
		}
	},
	portfolio: {
		description: 'Gestiona tus inversiones y transacciones',
		loginMessage: 'Debes iniciar sesión para ver tu portafolio',
		title: 'Portafolio',
		err: ['Fallo al cargar los datos del portafolio', 'Fallo al cargar las transacciones'],
		holdings: {
			title: 'Tus activos',
			description: 'Posiciones actuales en tu portafolio'
		},
		sendMoney: {
			title: 'Enviar Dinero',
			title2: 'Enviar',
			description: 'Envía efectivo o monedas a otro usuario',
			recipient: ['Destinatario', 'Ingresa el nombre de usuario (sin @)'],
			type: ['Tipo', 'Efectivo ($)', 'Monedas'],
			coins: ['Seleccionar Moneda', '*{{name}} ({{available}} disponible)'],
			failed: 'Transferencia Fallida',
			sent: ['¡Monedas enviadas con éxito!']
		},
		recentTransactions: 'Transacciones Recientes',
		total: 'Total',
		cashBalance: ['Balance en Efectivo', '{{percent}}% del portafolio'],
		coinHoldings: ['Activos en Monedas', '{{count}} posiciones'],
		noCoins: [
			'Sin activos en monedas',
			'Aún no has invertido en ninguna moneda. Empieza comprando monedas existentes.',
			'Explorar Monedas'
		],
		noTransactions: [
			'Aún no hay transacciones',
			'Aún no has realizado trades. Empieza comprando o vendiendo monedas.'
		],
		value: 'Valor',
		pl: 'P&G %',
		portfolioPercent: '% del Portafolio'
	},
	prestige: {
		title: 'Prestigio',
		description: 'Restablece tu progreso para avanzar tu estado de trading',
		how: [
			'Cómo',
			['Cumplir Requisitos', 'Acumula suficiente efectivo para pagar el costo de prestigio'],
			[
				'Restablecer Progreso',
				'Todo el efectivo y los activos se borran, pero el historial permanece'
			],
			[
				'Ganar Estatus',
				'Obtén un título de prestigio exclusivo, recompensas diarias mejoradas y restablece tu tiempo de espera de recompensa diaria'
			]
		],
		progress: {
			title: 'Progreso',
			description: 'Progreso a {{name}}',
			required: 'Requerido',
			yourCash: 'Tu Efectivo',
			stillNeeded: 'Aún Necesitas',
			perma: '¡El Prestigio es permanente y no se puede deshacer!',
			button: ['Necesitas {{bal}} más para prestigio', '¡Vamos!', 'Avanzando a {{name}}'],
			star: ['¡Eres una estrella!', 'Has alcanzado el nivel de prestigio más alto disponible.'],
			tip: 'Consejo: vende activos en monedas'
		},
		preview: {
			title: 'Vista Previa',
			current: 'Actual',
			after: 'Después',
			description: 'También obtienes {{percent}}% más de recompensas diarias.'
		},
		levels: {
			title: 'Niveles',
			d: {
				'1': 'Prestigio I',
				'2': 'Prestigio II',
				'3': 'Prestigio III',
				'4': 'Prestigio IV',
				'5': 'Prestigio V'
			}
		},
		popup: {
			title: 'Confirmar',
			description:
				'Esta acción es permanente y no se puede deshacer. Por favor, revisa las consecuencias cuidadosamente.',
			lose: [
				'Perderás:',
				'Balance en efectivo: {{amount}}',
				'Todos los activos en monedas por valor de {{amount}}',
				'Valor total del portafolio: {{amount}}'
			],
			gain: [
				'Ganarás:',
				'Más dinero en recompensas diarias',
				'Un restablecimiento de recompensa diaria',
				'Insignia y estado de prestigio',
				'Venderemos automáticamente todos tus activos en monedas'
			],
			confirm: ['Escribe "PRESTIGE" para confirmar', 'ESCRIBE PRESTIGE AQUÍ'],
			proceed: ['Avanzando...', 'Proceder'],
			done: '¡Felicidades! ¡Has alcanzado {{name}}!',
			err: 'Fallo al realizar el prestigio.'
		},
		signin: {
			title: 'Inicia sesión para prestigio',
			description: 'Necesitas una cuenta para prestigio'
		},
		err: 'Fallo al cargar los datos de prestigio'
	},
	settings: {
		title: 'Configuración'
	},
	sidebar: {
		account: 'Cuenta',
		api: 'API',
		logout: 'Cerrar sesión',
		portfolio: {
			cash: 'Efectivo',
			coins: 'Monedas',
			title: 'Portafolio',
			totalValue: 'Valor Total'
		},
		themes: {
			dark: 'Modo Oscuro',
			light: 'Modo Claro'
		}
	},
	signin: {
		button: 'Iniciar sesión',
		description:
			'Elige un servicio para iniciar sesión. Tu cuenta se creará automáticamente si no tienes una.',
		options: {
			google: 'Continuar con Google'
		},
		terms: ['Al continuar, aceptas nuestros', 'y'],
		title: 'Iniciar sesión en Rugplay'
	},
	terms: {
		privacy: 'Política de Privacidad',
		service: 'Términos de Servicio'
	},
	title: 'Rugplay',
	treemap: {
		coins: '{{count}} monedas',
		description:
			'Representación visual del mercado de criptomonedas. El tamaño indica la capitalización de mercado, el color muestra el cambio de precio en 24h.',
		fullscreen: {
			join: 'Pantalla Completa',
			leave: 'Salir de Pantalla Completa'
		},
		lastUpdated: 'Última actualización: {{time}}',
		negative: 'Cambio negativo de 24h',
		noCoins: {
			description: 'Crea algunas monedas para ver la visualización del treemap.'
		},
		positive: 'Cambio positivo de 24h',
		title: 'Treemap',
		'title²': 'Treemap del Mercado'
	},
	user: {
		'24hTradingVolume': {
			description: '{{count}} trades hoy',
			title: 'Volumen de Trading 24h'
		},
		buyActivity: {
			description: 'Cantidad total gastada',
			description2: 'Volumen de compra 24h',
			title: 'Actividad de Compra'
		},
		buySellRatio: {
			buy: 'comprar',
			sell: 'vender',
			title: 'Relación Compra/Venta'
		},
		createdCoins: {
			description: 'Monedas lanzadas por {{name}}',
			title: 'Monedas Creadas ({{count}})'
		},
		id: '#{{id}} para unirse',
		streak: 'Racha de {{days}} días',
		illiquidValue: {
			description: 'Activos en Monedas',
			title: 'Valor No Líquido'
		},
		joined: 'Se unió el {{date}}',
		liquidValue: {
			description: 'Efectivo disponible',
			title: 'Valor Líquido'
		},
		netProfit: {
			description: ['Ganancia general', 'Pérdida general'],
			title: 'Ganancia Neta'
		},
		recentTrading: {
			description: 'Últimas transacciones de {{name}}',
			portfolio: 'Tu última actividad de trading',
			title: 'Actividad de Trading Reciente'
		},
		sellActivity: {
			description: 'Cantidad total recibida',
			description2: 'Volumen de venta 24h',
			title: 'Actividad de Venta'
		},
		title: 'Perfil de Usuario',
		totalLosses: {
			description: 'Pérdidas totales en apuestas',
			title: 'Pérdidas Totales'
		},
		totalPortfolio: {
			description: '{{count}} activos',
			title: 'Portafolio Total'
		},
		totalVolume: {
			description: '{{count}} trades totales',
			title: 'Volumen Total de Trading'
		},
		totalWins: {
			description: 'Ganancias totales en apuestas',
			title: 'Victorias Totales'
		},
		winRate: {
			description: 'Porcentaje de victorias',
			title: 'Tasa de Victorias'
		}
	},
	viewall: 'Ver todo',
	tryagain: 'Intentar de Nuevo',
	time: {
		'1m': '1 minuto',
		'5m': '5 minutos',
		'15m': '15 minutos',
		'1h': '1 hora',
		'4h': '4 horas',
		'1d': '1 día'
	},
	transactions: {
		title: 'Transacciones',
		description: 'Registro completo de tu actividad de trading y transacciones',
		input: {
			placeholder: 'Buscar por nombre o símbolo de la moneda...',
			filters: {
				name: 'Filtros',
				sortBy: 'Ordenar por',
				sortOrder: ['Orden de Clasificación', 'Más reciente primero', 'Más antiguo primero'],
				transactionType: [
					'Tipo de Transacción',
					'Todos los trades',
					'Solo compras',
					'Solo ventas',
					'Transferencias recibidas',
					'Transferencias enviadas'
				]
			}
		},
		history: {
			title: 'Historial',
			description: 'Registro completo de tu actividad de trading y transferencias'
		},
		empty: {
			title: 'No se encontraron transacciones',
			description: [
				'Aún no has realizado trades o transferencias. Empieza comprando monedas o enviando dinero a otros usuarios.',
				'Ninguna transacción coincide con tus filtros actuales. Intenta ajustar tus criterios de búsqueda.'
			]
		}
	},
	promocode: {
		title: 'Código promocional',
		description: 'Ingresa tu código promocional a continuación para canjear recompensas y bonos.',
		input: ['Código Promocional', 'CÓDIGO...'],
		redeem: ['Canjear Código', 'Verificando...'],
		err: [
			'Código promocional inválido',
			'Fallo al verificar el código promocional. Por favor, intenta de nuevo.'
		],
		messages: {
			PR: 'Se requiere código promocional',
			IPC: 'Código promocional inválido',
			NA: 'Este código promocional ya no está activo',
			EX: 'Este código promocional ha expirado',
			AU: 'Ya has usado este código promocional',
			UL: 'Este código promocional ha alcanzado su límite de uso',
			RD: '¡Código promocional canjeado! Recibiste ${{balance}}.'
		}
	},
	error: {
		unknown: 'Ocurrió un error desconocido'
	}
} satisfies typeof en;