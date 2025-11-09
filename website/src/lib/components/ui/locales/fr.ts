import en from "./en"

export default {
	lang: {
		code: 'fr',
		name: 'Français',
		flagCode: 'fr'
	},
	about: {
		desc: "Un simulateur de trading de crypto-monnaies où vous pouvez vous entraîner à trader sans perdre d'argent réel. Créez des jetons, tradez-les et faites un rug pull !",
		title: 'À Propos',
		usermanual: {
			tips: {
				'1': {
					desc: "Rugplay est un simulateur de trading de crypto-monnaies où vous pouvez vous entraîner à trader sans risque financier réel. Commencez avec de l'argent virtuel, créez des jetons, pariez sur des marchés de prédiction, et le plus important, faites un rug pull !"
				},
				'10': {
					desc: "Hopium vous permet de parier sur des questions oui/non concernant l'avenir. L'IA résout automatiquement les questions en se basant sur des données du monde réel. Testez vos compétences de prédiction et gagnez grâce à des prévisions correctes. Ayez $100,000 en espèces pour créer votre propre question Hopium :)",
					title: 'Hopium - Marchés de Prédiction'
				},
				'11': {
					desc: "Visitez la section Jeux d'Argent pour des jeux à haut risque et haute récompense. Rappelez-vous : ce sont des jeux de pur hasard. Ne jouez que ce que vous pouvez vous permettre de perdre, même dans cette simulation !",
					title: "Jeux d'Argent"
				},
				'12': {
					desc: "Regardez la page Trades en Direct pour voir l'activité de trading en temps réel sur toutes les monnaies. Cela vous aide à repérer les monnaies tendance et à comprendre le sentiment du marché. La barre latérale montre les trades de $1,000+ , tandis que le flux principal affiche chaque transaction.",
					title: 'Flux de Trades en Direct'
				},
				'13': {
					desc: "La page Treemap affiche une représentation visuelle de l'ensemble du marché. Les carrés plus grands représentent des capitalisations boursières plus élevées, et les couleurs indiquent la performance des prix.",
					title: 'Visualisation Treemap'
				},
				'14': {
					desc: "Affrontez d'autres utilisateurs sur le Classement. Grimpez les échelons en prenant des décisions d'investissement judicieuses !",
					title: 'Classements'
				},
				'15': {
					desc: "Connectez-vous quotidiennement pour réclamer de l'argent gratuit ! Votre série de connexions augmente votre bonus quotidien. Les joueurs réguliers obtiennent plus d'argent virtuel à investir.",
					title: 'Récompenses Quotidiennes'
				},
				'16': {
					desc: "Commencez petit, diversifiez vos avoirs et n'investissez pas tout dans une seule monnaie. Surveillez les monnaies avec des détenteurs diversifiés pour éviter les rug pulls absolus. Les gens deviennent plus astucieux !",
					title: 'Conclusion'
				},
				'2': {
					desc: 'Cliquez sur "Créer un jeton" dans la barre latérale pour lancer votre propre crypto-monnaie. Choisissez un nom et un symbole uniques, et téléchargez une icône. Chaque jeton commence à $0.000001',
					title: 'Créer Votre Première Monnaie'
				},
				'3': {
					desc: 'Chaque monnaie dispose d\'un "pool de liquidité", avec votre monnaie et la devise de base ($). Les prix sont déterminés par le ratio entre ces montants. Lorsque vous achetez, le prix monte ; lorsque vous vendez, le prix baisse.',
					title: 'Comprendre les Pools de Liquidité'
				},
				'4': {
					desc: 'Rugplay utilise un système AMM où les prix sont calculés automatiquement en fonction de l\'offre et de la demande. Plus vous achetez, plus le prix monte. Plus vous vendez, plus il baisse. Les trades importants créent un "glissement" (slippage) - le changement de prix pendant votre transaction.',
					title: 'AMM - Teneur de Marché Automatisé'
				},
				'5': {
					desc: 'Naviguez vers la page de n\'importe quelle monnaie et cliquez sur "Acheter". Entrez le montant que vous souhaitez dépenser. L\'AMM (Teneur de Marché Automatisé) vous montrera exactement combien de jetons vous recevrez, y compris le glissement.',
					title: 'Acheter des Monnaies'
				},
				'6': {
					desc: 'Sur une page de monnaie, cliquez sur "Vendre" et entrez le nombre de jetons que vous souhaitez vendre. Vous pouvez voir vos avoirs dans votre Portefeuille. Rappelez-vous : vendre de grandes quantités peut avoir un impact significatif sur le prix !',
					title: 'Vendre des Monnaies'
				},
				'7': {
					desc: 'Un "rug pull" se produit lorsque de grands détenteurs (y compris les créateurs de la monnaie) vendent tous leurs avoirs en même temps, provoquant l\'effondrement du prix.',
					title: 'Qu\'est-ce qu\'un "Rug Pull" ?'
				},
				'8': {
					desc: 'Consultez votre page Portefeuille pour voir tous vos avoirs, leurs valeurs actuelles et les transactions récentes. Suivez vos performances et voyez quels investissements se portent bien.',
					title: 'Gestion de Portefeuille'
				},
				'9': {
					desc: "La page Marché affiche toutes les monnaies disponibles triées par capitalisation boursière, volume et changements de prix. Utilisez-la pour découvrir les monnaies tendances et les opportunités d'investissement.",
					title: 'Aperçu du Marché'
				}
			},
			title: "Manuel de l'Utilisateur"
		},
		rugplay: {
			title: 'À Propos de Rugplay',
			description: [
				'Rugplay est une simulation réaliste de trading de crypto-monnaies qui se concentre sur les mécanismes de la DeFi (Finance Décentralisée) et les risques inhérents au trading décentralisé.',
				"Pratiquez des stratégies de trading, créez vos propres monnaies et apprenez la dynamique du marché sans aucun risque financier réel. Faites l'expérience du trading AMM, des pools de liquidité et même des rug pulls. (évidemment)",
				'Rejoignez la communauté de dégénérés où la paranoïa est rentable !'
			]
		},
		features: {
			title: 'Fonctionnalités',
			description: [
				'Créer des monnaies',
				'Acheter des monnaies',
				'Vendre des monnaies',
				'Parier sur des questions (similaire à Polymarket)',
				'Jouer le tout pour le tout',
				"Afficher un graphique Treemap de l'ensemble du marché",
				'Concourir dans les classements'
			]
		},
		credits: {
			title: 'Crédits',
			description: ['Créé par', 'FaceDev']
		}
	},
	base: {
		'24hChange': 'Changement 24h',
		asset: 'Actif',
		amount: 'Montant',
		apply: 'Appliquer',
		buy: 'Acheter',
		buy2: 'ACHETER',
		cancel: 'Annuler',
		coin: 'Monnaie',
		date: 'Date',
		live: 'En Direct',
		noData: 'Aucune donnée',
		paused: 'En Pause',
		quantity: 'Quantité',
		rank: 'Rang',
		received: 'Reçu',
		rec: 'REC',
		receiver: 'Destinataire',
		reset: 'Réinitialiser',
		sell: 'Vendre',
		sell2: 'VENDRE',
		sender: 'Expéditeur',
		sent: 'Envoyé',
		signin: 'Se Connecter',
		skip: 'IGNORER',
		type: 'Type',
		total: 'Total',
		unknown: 'Inconnu',
		user: 'Utilisateur'
	},
	coin: {
		create: {
			title: 'Créer une monnaie',
			err: {
				title: 'Échec de la création de la monnaie',
				unknown: "Une erreur s'est produite lors de la création de la monnaie"
			},
			details: {
				title: 'Détails de la Monnaie',
				icon: {
					title: 'Icône de la Monnaie (Facultatif)',
					description: "Cliquez pour télécharger l'icône de votre monnaie (PNG ou JPG, max 1MB)",
					err: ['Veuillez sélectionner un fichier image valide', "L'icône doit faire moins de 1MB"]
				},
				name: {
					title: 'Nom de la Monnaie',
					placeholder: 'Ex., Bitcoin',
					description: 'Choisissez un nom mémorable pour votre crypto-monnaie',
					err: 'Le nom doit contenir entre 2 et 255 caractères'
				},
				symbol: {
					title: 'Symbole',
					placeholder: 'BTC',
					description:
						'Identifiant court pour votre monnaie (ex., BTC pour Bitcoin). Sera affiché comme *{{name}}',
					err: 'Le symbole doit contenir entre 2 et 10 caractères'
				},
				fairLaunchSettings: [
					'Paramètres de Lancement Équitable',
					['Offre Totale :', '1,000,000,000 jetons'],
					['Prix de Départ :', '$0.000001 par jeton'],
					['Vous recevez', '100%', "de l'offre"],
					['Capitalisation Boursière Initiale :', '$1,000'],
					['Verrouillage du Trading :', 'Période de 1 minute réservée au créateur'],
					"Après la création, vous aurez 1 minute de temps de trading exclusif avant que les autres puissent trader. Cela vous permet d'acheter votre offre initiale."
				],
				createCoin: ['Créer la monnaie (${{price}})', 'Création en cours...']
			},
			costsummary: {
				title: 'Résumé des Coûts',
				balance: 'Solde :',
				creationFee: 'Frais de Création',
				initialLiquidity: 'Liquidité Initiale',
				totalCost: 'Coût Total'
			},
			whathappensnext: {
				title: 'Que Se Passe-t-il Après le Lancement ?',
				'1': [
					'Distribution Équitable',
					"Tout le monde commence à acheter au même prix - pas de préventes ou d'allocations cachées"
				],
				'2': [
					'Découverte des Prix',
					'Le prix du jeton augmente automatiquement à mesure que plus de personnes achètent, suivant une courbe de liaison (bonding curve)'
				],
				'3': [
					'Trading Instantané',
					'Le trading commence immédiatement - achetez, vendez ou distribuez vos jetons comme vous le souhaitez'
				]
			},
			signin: {
				title: 'Connectez-vous pour créer votre propre monnaie',
				description: "Vous avez besoin d'un compte pour créer des monnaies.",
				button: 'Se connecter pour continuer'
			}
		},
		'24hChange': 'Changement 24h',
		'24hVolume': 'Volume 24h',
		baseCurrency: 'Devise de Base',
		circulatingSupply: {
			of: 'sur {{total}} total',
			title: 'Offre en Circulation'
		},
		comments: {
			characterLimit: '{{chars}}/500 caractères',
			noCommentsYet:
				"Aucun commentaire pour l'instant. Soyez le premier à partager vos réflexions !",
			placeholder: 'Partagez vos réflexions sur cette monnaie...',
			post: 'Publier',
			title: 'Commentaires ({{count}})',
			err: 'Échec de la publication du commentaire',
			signin: 'Connectez-vous pour rejoindre la discussion'
		},
		created: 'Créé',
		createdBy: 'Créé Par',
		currentPrice: 'Prix Actuel',
		marketCap: 'Capitalisation Boursière',
		name: 'Nom',
		poolComposition: 'Composition du Pool',
		poolStats: 'Stats du Pool',
		price: 'Prix',
		priceChart: 'Graphique des Prix ({{time}})',
		topHolders: {
			noHolders: 'Aucun détenteur',
			title: 'Principaux Détenteurs'
		},
		totalLiquidity: 'Liquidité Totale',
		trade: {
			balance: 'Solde : ${{bal}}',
			buy: {
				rec: '{{coin}} Vous recevrez :',
				title: 'Acheter {{coin}}',
				spentAmount: 'Montant à dépenser ($)'
			},
			curPrice: 'Prix actuel : ${{price}} par {{coin}}',
			estimation: "Estimation AMM - inclut le glissement (slippage) dû à l'impact du pool",
			sell: {
				rec: 'Vous recevrez :',
				title: 'Vendre {{coin}}',
				amount: 'Montant ({{coin}})',
				available: 'Disponible : {{amount}} {{coin}}',
				maxSellable: 'Max vendable : {{amount}} {{coin}} (limite du pool)'
			},
			title: 'Trader {{coin}}',
			youOwn: 'Vous possédez : {{amount}} {{coin}}'
		},
		volume: 'Volume',
		volume24h: 'Volume (24h)',
		locked: [
			'🔒 Période réservée au créateur : {{time}} restante',
			'🔒 Le trading se déverrouille dans : {{time}} restante'
		],
		signin: {
			title: 'Connectez-vous pour commencer à trader'
		}
	},
	gambling: {
		title: "Jeux d'Argent",
		signin: {
			title: 'Connectez-vous pour commencer à jouer',
			description: "Vous avez besoin d'un compte pour dilapider vos économies "
		},
		games: {
			coinflip: {
				title: 'Pile ou Face',
				description: 'Choisissez pile ou face et doublez votre argent !',
				chooseSide: 'Choisir un Côté',
				heads: 'Pile',
				tails: 'Face',
				flip: 'Lancer',
				flipping: 'Lancement',
				win: ['GAGNÉ', 'Gagné {{amount}} sur {{lastR}}'],
				loss: ['PERDU', 'Perdu {{amount}} sur {{lastR}}']
			},
			slots: {
				title: 'Machines à Sous',
				description: 'Associez 3 symboles pour gagner gros !',
				chooseSide: 'Choisir un Côté',
				'5x': '3 Symboles Identiques :',
				'2x': '2 Symboles Identiques :',
				paytable: 'Tableau des Gains',
				spin: 'Tourner',
				spinning: 'Rotation',
				loss: {
					title: 'AUCUNE CORRESPONDANCE',
					description: 'Perdu {{amount}}'
				},
				win: {
					title: 'GAGNÉ - {{winType}}',
					'2 OF A KIND': '2 IDENTIQUES',
					'5 OF A KIND': '5 IDENTIQUES',
					description: 'Gagné {{amount}}'
				}
			},
			mines: {
				title: 'Mines',
				description:
					'Naviguez à travers le champ de mines et encaissez avant de toucher une mine !',
				numberMines: 'Nombre de Mines',
				'1': ['Vous obtiendrez', 'par case, probabilité de gain :'],
				'2': 'Note : Le gain maximum par partie est plafonné à 2 000 000 $.',
				start: 'Démarrer la Partie',
				abort: 'Annuler le Pari',
				currentProfit: 'Profit Actuel :',
				nextTile: 'Prochaine Case',
				cashOut: 'Encaisser',
				currentMultiplier: 'Multiplicateur Actuel :'
			}
		},
		live: {
			noData: {
				title: "En attente d'activité...",
				description: "L'activité de jeu d'argent à enjeux élevés apparaîtra ici en temps réel."
			},
			description: 'Affichage des paris de 1 000 $ ou plus uniquement',
			won: 'a gagné',
			lost: 'a perdu',
			on: 'sur {{game}}'
		},
		balance: 'Solde',
		betAmount: 'Montant du Pari',
		betAmountPlaceholder: 'Entrez le montant du pari',
		maxBet: 'Pari max : {{amount}}'
	},
	home: {
		good: {
			afternoon: 'Bon après-midi, {{name}}',
			evening: 'Bonsoir, {{name}}',
			morning: 'Bonjour, {{name}}',
			night: 'Bonne nuit, {{name}}'
		},
		marketOverview: {
			description: "Voici l'aperçu du marché pour aujourd'hui.",
			title: 'Aperçu du Marché'
		},
		nocoinsavailable: {
			description: 'Soyez le premier à créer une monnaie !',
			title: 'Aucune monnaie disponible'
		},
		title: 'Accueil',
		welcome: 'Bienvenue sur Rugplay !',
		signInRequired: ['Vous devez', 'vous connecter', 'pour jouer.']
	},
	hopium: {
		active: 'Actif',
		all: 'Tous',
		ask: 'Demander',
		chart: 'Graphique',
		create: {
			description: "Créez une question oui/non qui sera résolue par l'IA.",
			description2:
				"L'IA déterminera automatiquement la date et les critères de résolution appropriés.",
			input: {
				characterLimit: '{{chars}}/200 caractères',
				placeholder: "Est-ce que *SKIBIDI atteindra 100 $ aujourd'hui ?"
			},
			question: 'Question *',
			title: 'Créer'
		},
		description:
			"Marchés de prédiction alimentés par l'IA. Créez des questions et pariez sur les résultats.",
		ends: 'Se termine dans {{time}}',
		marketStats: {
			created: 'Créé :',
			resolves: 'Résolution :',
			title: 'Statistiques du Marché',
			totalBets: 'Total des Paris :',
			totalVolume: 'Volume Total :'
		},
		minBalance:
			"Vous avez besoin d'au moins 100 000 $ en espèces dans votre portefeuille pour créer une question.",
		no: 'NON',
		noQuestions: {
			description: 'Soyez le premier à créer une question de prédiction !',
			title: "Aucune question pour l'instant"
		},
		placeBet: {
			balance: 'Solde :',
			enteramount: 'Entrez le montant...',
			title: 'Placer un Pari',
			toWin: 'Pour gagner :'
		},
		publish: ['Publier', 'Traitement...'],
		recentActivity: 'Activité Récente',
		remaining: '{{time}} restante',
		resolving: 'Résolution en cours',
		resolved: 'Résolu',
		startBetting: {
			signin: 'Connectez-vous pour placer des paris',
			title: 'Commencer à Parier'
		},
		title: 'Hopium',
		yes: 'OUI',
		yourBets: 'Vos paris :'
	},
	leaderboard: {
		err: 'Échec du chargement des données du classement',
		description: 'Meilleurs performeurs et activité du marché',
		biggestLosses: {
			description: "Utilisateurs ayant subi les plus grosses pertes aujourd'hui",
			loss: 'Perte',
			noData: "Aucune perte majeure enregistrée aujourd'hui",
			title: 'Plus Grosses Pertes (24h)'
		},
		highestPortfolio: {
			description: 'Utilisateurs avec les soldes de trésorerie liquide les plus élevés',
			noData: 'Pas encore de gros portefeuilles ! 📉',
			portfolio: 'Portefeuille',
			title: 'Valeurs de Portefeuille les Plus Élevées',
			liquidity: 'Liquidité'
		},
		rank: 'Rang',
		title: 'Classement',
		topCash: {
			cash: 'Espèces',
			description: 'Utilisateurs avec les soldes de trésorerie liquide les plus élevés',
			noData: 'Tout le monde a investi ! 💸',
			title: "Meilleurs Détenteurs d'Espèces"
		},
		topRugpullers: {
			description:
				"Utilisateurs ayant réalisé le plus de profits en vendant des monnaies aujourd'hui",
			noData: "Aucun profit majeur enregistré aujourd'hui",
			profit: 'Profit',
			title: 'Meilleurs Rugpullers (24h)'
		},
		user: 'Utilisateur',
		search: {
			placeholder: "Rechercher par nom d'utilisateur...",
			noFound: {
				title: 'Aucun utilisateur trouvé',
				description: 'Aucun utilisateur ne correspond à votre recherche "{{search}}"',
				clear: 'Effacer la Recherche'
			},
			description: 'Affichage de {{1}} à {{2}} sur {{3}} résultats'
		}
	},
	livetrades: {
		d: {
			bought: 'acheté par',
			sold: 'vendu par'
		},
		desc: 'Activité de trading en temps réel pour tous les trades',
		notrades: 'Pas encore de gros trades...',
		stream: 'Flux',
		title: 'Trades en Direct',
		trades: ['{{count}} trade', '{{count}} trades'],
		waiting: {
			description: 'Tous les trades apparaîtront ici en temps réel.',
			title: 'En Attente de Trades'
		},
		by: '*{{coin}} par @{{user}}'
	},
	market: {
		'24hChange': {
			title: 'Changement 24h',
			values: [
				'Tous les changements',
				'Gagnants seulement',
				'Perdants seulement',
				'Chaud (±10%)',
				'En Fusion (±50%)'
			]
		},
		apply: 'Appliquer',
		description:
			'Découvrez des monnaies, suivez les performances et trouvez votre prochain investissement',
		input: {
			filters: {
				clearAll: 'Effacer tous les Filtres',
				clearAll2: 'Effacer tous les filtres',
				title: 'Filtres'
			},
			noMatch:
				'Aucune monnaie ne correspond à votre recherche "{{query}}". Essayez d\'autres mots-clés ou ajustez les filtres.',
			placeholder: 'Rechercher des monnaies par nom ou symbole...'
		},
		noCoinsFound: {
			description: ['Le marché semble calme...', 'créer une monnaie', ' ? :)'],
			title: 'Aucune monnaie trouvée'
		},
		priceRange: {
			title: 'Échelle de Prix',
			values: ['Tous les prix', 'Moins de 1 $', '1 $ - 10 $', '10 $ - 100 $', 'Plus de 100 $']
		},
		showing: 'Affichage de {{val}}-{{total}} sur {{coins}} monnaies',
		sortBy: 'Trier Par',
		sortOrder: {
			title: 'Ordre de Tri',
			values: ['Élevé à Faible', 'Faible à Élevé']
		},
		title: 'Marché'
	},
	notifications: {
		title: 'Notifications',
		description: 'Restez informé de vos activités',
		noNotifications: {
			title: "Aucune notification pour l'instant",
			description: 'Vous verrez ici les mises à jour concernant vos activités'
		},
		signin: {
			title: 'Veuillez vous connecter',
			description: 'Vous devez être connecté pour voir les notifications'
		}
	},
	pagination: {
		morepages: 'Plus de pages',
		next: {
			title: 'Suivant'
		},
		previous: {
			label: 'Aller à la page précédente',
			title: 'Précédent'
		}
	},
	portfolio: {
		description: 'Gérez vos investissements et transactions',
		loginMessage: 'Vous devez être connecté pour voir votre portefeuille',
		title: 'Portefeuille',
		err: [
			'Échec du chargement des données du portefeuille',
			'Échec du chargement des transactions'
		],
		holdings: {
			title: 'Vos avoirs',
			description: 'Positions actuelles dans votre portefeuille'
		},
		sendMoney: {
			title: "Envoyer de l'Argent",
			title2: 'Envoyer',
			description: "Envoyer de l'argent ou des jetons à un autre utilisateur",
			recipient: ['Destinataire', "Entrez le nom d'utilisateur (sans @)"],
			type: ['Type', 'Espèces ($)', 'Monnaies'],
			coins: ['Sélectionner la Monnaie', '*{{name}} ({{available}} disponible)'],
			failed: 'Transfert Échoué',
			sent: ['Monnaies envoyées avec succès !']
		},
		recentTransactions: 'Transactions Récentes',
		total: 'Total',
		cashBalance: ['Solde en Espèces', '{{percent}}% du portefeuille'],
		coinHoldings: ['Avoirs en Monnaies', '{{count}} positions'],
		noCoins: [
			'Aucun avoir en monnaies',
			"Vous n'avez encore investi dans aucune monnaie. Commencez par acheter des monnaies existantes.",
			'Parcourir les Monnaies'
		],
		noTransactions: [
			"Aucune transaction pour l'instant",
			"Vous n'avez encore effectué aucun trade. Commencez par acheter ou vendre des monnaies."
		],
		value: 'Valeur',
		pl: 'P&L %',
		portfolioPercent: '% du Portefeuille'
	},
	prestige: {
		title: 'Prestige',
		description: 'Réinitialisez votre progression pour améliorer votre statut de trading',
		how: [
			'Comment',
			[
				'Satisfaire les Exigences',
				"Accumulez suffisamment d\'espèces pour payer le coût du prestige"
			],
			[
				'Réinitialiser la Progression',
				"Tout l\'argent et les avoirs sont effacés, mais l\'historique demeure"
			],
			[
				'Gagner un Statut',
				'Gagnez un titre de prestige exclusif, des récompenses quotidiennes améliorées et réinitialisez votre temps de recharge de récompense quotidienne'
			]
		],
		progress: {
			title: 'Progression',
			description: 'Progression vers {{name}}',
			required: 'Requis',
			yourCash: 'Vos Espèces',
			stillNeeded: 'Encore Nécessaire',
			perma: 'Le Prestige est permanent et ne peut pas être annulé !',
			button: [
				'Besoin de {{bal}} de plus pour le prestige',
				'Allons-y',
				'Avancement vers {{name}}'
			],
			star: [
				'Vous êtes une star !',
				'Vous avez atteint le niveau de prestige le plus élevé disponible.'
			],
			tip: 'Conseil : vendez les avoirs en monnaies'
		},
		preview: {
			title: 'Aperçu',
			current: 'Actuel',
			after: 'Après',
			description:
				'Vous obtenez également {{percent}}% de récompenses quotidiennes supplémentaires.'
		},
		levels: {
			title: 'Niveaux',
			d: {
				'1': 'Prestige I',
				'2': 'Prestige II',
				'3': 'Prestige III',
				'4': 'Prestige IV',
				'5': 'Prestige V'
			}
		},
		popup: {
			title: 'Confirmer',
			description:
				'Cette action est permanente et ne peut pas être annulée. Veuillez examiner attentivement les conséquences.',
			lose: [
				'Vous perdrez :',
				'Solde en espèces : {{amount}}',
				"Tous les avoirs en monnaies d'une valeur de {{amount}}",
				'Valeur totale du portefeuille : {{amount}}'
			],
			gain: [
				'Vous gagnerez :',
				"Plus d'argent dans les récompenses quotidiennes",
				'Une réinitialisation de la récompense quotidienne',
				'Badge et statut de Prestige',
				'Nous vendrons automatiquement tous vos avoirs en monnaies'
			],
			confirm: ['Tapez "PRESTIGE" pour confirmer', 'TAPEZ PRESTIGE ICI'],
			proceed: ['Avancement...', 'Procéder'],
			done: 'Félicitations ! Vous avez atteint {{name}} !',
			err: 'Échec du prestige.'
		},
		signin: {
			title: 'Connectez-vous pour le prestige',
			description: "Vous avez besoin d'un compte pour le prestige"
		},
		err: 'Échec du chargement des données de prestige'
	},
	settings: {
		title: 'Paramètres'
	},
	sidebar: {
		account: 'Compte',
		api: 'API',
		logout: 'Se déconnecter',
		portfolio: {
			cash: 'Espèces',
			coins: 'Monnaies',
			title: 'Portefeuille',
			totalValue: 'Valeur Totale'
		},
		themes: {
			dark: 'Mode Sombre',
			light: 'Mode Clair'
		}
	},
	signin: {
		button: 'Se connecter',
		description:
			"Choisissez un service pour vous connecter. Votre compte sera créé automatiquement si vous n'en avez pas.",
		options: {
			google: 'Continuer avec Google'
		},
		terms: ['En continuant, vous acceptez nos', 'et'],
		title: 'Se connecter à Rugplay'
	},
	terms: {
		privacy: 'Politique de Confidentialité',
		service: "Conditions d'Utilisation"
	},
	title: 'Rugplay',
	treemap: {
		coins: '{{count}} monnaies',
		description:
			'Représentation visuelle du marché des crypto-monnaies. La taille indique la capitalisation boursière, la couleur montre le changement de prix en 24h.',
		fullscreen: {
			join: 'Plein Écran',
			leave: 'Quitter le Plein Écran'
		},
		lastUpdated: 'Dernière mise à jour : {{time}}',
		negative: 'Changement négatif sur 24h',
		noCoins: {
			description: 'Créez quelques monnaies pour voir la visualisation du treemap.'
		},
		positive: 'Changement positif sur 24h',
		title: 'Treemap',
		'title²': 'Treemap du Marché'
	},
	user: {
		'24hTradingVolume': {
			description: "{{count}} trades aujourd'hui",
			title: 'Volume de Trading 24h'
		},
		buyActivity: {
			description: 'Montant total dépensé',
			description2: "Volume d'achat 24h",
			title: "Activité d'Achat"
		},
		buySellRatio: {
			buy: 'acheter',
			sell: 'vendre',
			title: 'Ratio Achat/Vente'
		},
		createdCoins: {
			description: 'Monnaies lancées par {{name}}',
			title: 'Monnaies Créées ({{count}})'
		},
		id: '#{{id}} à rejoindre',
		streak: 'Série de {{days}} jours',
		illiquidValue: {
			description: 'Avoirs en Monnaies',
			title: 'Valeur Non Liquide'
		},
		joined: 'A rejoint le {{date}}',
		liquidValue: {
			description: 'Espèces disponibles',
			title: 'Valeur Liquide'
		},
		netProfit: {
			description: ['Profit global', 'Perte globale'],
			title: 'Profit Net'
		},
		recentTrading: {
			description: 'Dernières transactions de {{name}}',
			portfolio: 'Votre dernière activité de trading',
			title: 'Activité de Trading Récente'
		},
		sellActivity: {
			description: 'Montant total reçu',
			description2: 'Volume de vente 24h',
			title: 'Activité de Vente'
		},
		title: 'Profil Utilisateur',
		totalLosses: {
			description: "Pertes totales aux jeux d'argent",
			title: 'Pertes Totales'
		},
		totalPortfolio: {
			description: '{{count}} avoirs',
			title: 'Portefeuille Total'
		},
		totalVolume: {
			description: '{{count}} trades totaux',
			title: 'Volume Total de Trading'
		},
		totalWins: {
			description: "Gains totaux aux jeux d'argent",
			title: 'Victoires Totales'
		},
		winRate: {
			description: 'Pourcentage de victoires',
			title: 'Taux de Victoire'
		}
	},
	viewall: 'Voir tout',
	tryagain: 'Réessayer',
	time: {
		'1m': '1 minute',
		'5m': '5 minutes',
		'15m': '15 minutes',
		'1h': '1 heure',
		'4h': '4 heures',
		'1d': '1 jour'
	},
	transactions: {
		title: 'Transactions',
		description: 'Enregistrement complet de votre activité de trading et de vos transactions',
		input: {
			placeholder: 'Rechercher par nom ou symbole de la monnaie...',
			filters: {
				name: 'Filtres',
				sortBy: 'Trier par',
				sortOrder: [
					'Ordre de Tri',
					'Du plus récent au plus ancien',
					'Du plus ancien au plus récent'
				],
				transactionType: [
					'Type de Transaction',
					'Tous les trades',
					'Achats seulement',
					'Ventes seulement',
					'Transferts reçus',
					'Transferts envoyés'
				]
			}
		},
		history: {
			title: 'Historique',
			description: 'Enregistrement complet de votre activité de trading et de vos transferts'
		},
		empty: {
			title: 'Aucune transaction trouvée',
			description: [
				"Vous n'avez effectué aucun trade ou transfert pour l'instant. Commencez par acheter des monnaies ou envoyer de l'argent à d'autres utilisateurs.",
				"Aucune transaction ne correspond à vos filtres actuels. Essayez d'ajuster vos critères de recherche."
			]
		}
	},
	promocode: {
		title: 'Code promotionnel',
		description:
			'Entrez votre code promotionnel ci-dessous pour échanger des récompenses et des bonus.',
		input: ['Code Promotionnel', 'CODE...'],
		redeem: ['Échanger le Code', 'Vérification...'],
		err: [
			'Code promotionnel invalide',
			'Échec de la vérification du code promotionnel. Veuillez réessayer.'
		],
		messages: {
			PR: 'Le code promotionnel est requis',
			IPC: 'Code promotionnel invalide',
			NA: "Ce code promotionnel n'est plus actif",
			EX: 'Ce code promotionnel a expiré',
			AU: 'Vous avez déjà utilisé ce code promotionnel',
			UL: "Ce code promotionnel a atteint sa limite d'utilisation",
			RD: 'Code promotionnel échangé ! Vous avez reçu ${{balance}}.'
		}
	},
	error: {
		unknown: "Une erreur inconnue s'est produite"
	}
} satisfies typeof en;