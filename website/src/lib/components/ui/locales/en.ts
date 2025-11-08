export default {
	about: {
		desc: 'A crypto trading simulator where you can practice trading without losing real money. Create coins, trade them, and rug pull!',
		title: 'About',
		usermanual: {
			tips: {
				'1': {
					desc: 'Rugplay is a cryptocurrency trading simulator where you can practice trading without real financial risk. Start with virtual money, create coins, bet on prediction markets, and most importantly, rugpull!'
				},
				'10': {
					desc: 'Hopium lets you bet on yes/no questions about the future. AI automatically resolves questions based on real-world data. Test your prediction skills and earn from correct forecasts. Hold $100,000 in cash to create your own Hopium question :)',
					title: 'Hopium - Prediction Markets'
				},
				'11': {
					desc: 'Visit the Gambling section for high-risk, high-reward games. Remember: these are pure chance games. Only gamble what you can afford to lose, even in this simulation!',
					title: 'Gambling Games'
				},
				'12': {
					desc: 'Watch the Live Trades page to see real-time trading activity across all coins. This helps you spot trending coins and understand market sentiment. The sidebar shows $1,000+ trades, while the main feed displays every transaction.',
					title: 'Live Trades Feed'
				},
				'13': {
					desc: 'The Treemap page shows a visual representation of the entire market. Larger squares represent higher market caps, and colors show price performance.',
					title: 'Treemap Visualization'
				},
				'14': {
					desc: 'Compete with other users on the Leaderboard. Climb the ranks by making smart investment decisions!',
					title: 'Leaderboards'
				},
				'15': {
					desc: 'Log in daily to claim free money! Your login streak increases your daily bonus. Consistent players get more virtual cash to invest.',
					title: 'Daily Rewards'
				},
				'16': {
					desc: "Start small, diversify your holdings, and don't invest everything in one coin. Watch for coins with diversified holders to avoid absolute rug pulls. People get smart!",
					title: 'Concluding'
				},
				'2': {
					desc: 'Click "Create coin" in the sidebar to launch your own cryptocurrency. Choose a unique name, symbol, and upload an icon. Each coin starts at $0.000001',
					title: 'Creating Your First Coin'
				},
				'3': {
					desc: 'Each coin has a "liquidity pool," with your coin and base currency ($). Prices are determined by the ratio between these amounts. When you buy, the price goes up; when you sell, the price goes down.',
					title: 'Understanding Liquidity Pools'
				},
				'4': {
					desc: 'Rugplay uses an AMM system where prices are calculated automatically based on supply and demand. The more you buy, the higher the price goes. The more you sell, the lower it drops. Large trades create "slippage" - the price change during your trade.',
					title: 'AMM - Automated Market Maker'
				},
				'5': {
					desc: 'Navigate to any coin page and click "Buy". Enter the amount you want to spend. The AMM (Automated Market Maker) will show you exactly how many coins you\'ll receive, including slippage.',
					title: 'Buying Coins'
				},
				'6': {
					desc: 'On a coin page, click "Sell" and enter how many coins you want to sell. You can see your holdings in your Portfolio. Remember: selling large amounts can significantly impact the price!',
					title: 'Selling Coins'
				},
				'7': {
					desc: 'A "rug pull" happens when large holders (including coin creators) sell their holdings all at once, crashing the price.',
					title: 'What is a "Rug Pull"?'
				},
				'8': {
					desc: 'Check your Portfolio page to see all your holdings, their current values, and recent transactions. Track your performance and see which investments are doing well.',
					title: 'Portfolio Management'
				},
				'9': {
					desc: 'The Market page shows all available coins sorted by market cap, volume, and price changes. Use this to discover trending coins and investment opportunities.',
					title: 'Market Overview'
				}
			},
			title: 'User Manual'
		},
		rugplay: {
			title: 'About Rugplay',
			description: [
				'Rugplay is a realistic cryptocurrency trading simulation that focuses on DeFi (Decentralized Finance) mechanics and the inherent risks of decentralized trading.',
				'Practice trading strategies, create your own coins, and learn about market dynamics without any real financial risk. Experience AMM trading, liquidity pools, and even rug pulls. (duh)',
				'Join the community of degenerates where paranoia is profitable!'
			]
		},
		features: {
			title: 'Features',
			description: [
				'Create coins',
				'Buy coins',
				'Sell coins',
				'Bet on questions (similar to Polymarket)',
				'Gamble it all',
				'View a Treemap graph of entire market',
				'Compete on leaderboards'
			]
		},
		credits: {
			title: 'Credits',
			description: ['Created by', 'FaceDev']
		}
	},
	base: {
		'24hChange': '24h Change',
		amount: 'Amount',
		buy: 'Buy',
		buy2: 'BUY',
		cancel: 'Cancel',
		coin: 'Coin',
		date: 'Date',
		live: 'Live',
		noData: 'No data',
		paused: 'Paused',
		quantity: 'Quantity',
		received: 'Received',
		rec: 'REC',
		receiver: 'Receiver',
		reset: 'Reset',
		sell: 'Sell',
		sell2: 'SELL',
		sender: 'Sender',
		sent: 'Sent',
		signin: 'Sign In',
		skip: 'SKIP',
		type: 'Type',
		unknown: 'Unknown'
	},
	coin: {
		create: {
			title: 'Create coin',
			err:{
				title: "Failed to create coin",
				unknown: "An error occurred while creating the coin"
			},
			details: {
				title: 'Coin Details',
				icon: {
					title: 'Coin Icon (Optional)',
					description: "Click to upload your coin's icon (PNG or JPG, max 1MB)",
					err: ["Please select a valid image file", "Icon must be smaller than 1MB"]
				},
				name: {
					title: 'Coin Name',
					placeholder: 'e.g., Bitcoin',
					description: 'Choose a memorable name for your cryptocurrency',
					err: 'Name must be between 2 and 255 characters'
				},
				symbol: {
					title: 'Symbol',
					placeholder: 'BTC',
					description:
						'Short identifier for your coin (e.g., BTC for Bitcoin). Will be displayed as *{{name}}',
					err: 'Symbol must be between 2 and 10 characters'
				},
				fairLaunchSettings: [
					'Fair Launch Settings',
					['Total Supply:', '1,000,000,000 tokens'],
					['Starting Price:', '$0.000001 per token'],
					['You receive', '100%', 'of the supply'],
					['Initial Market Cap:', '$1,000'],
					['Trading Lock:', '1 minute creator-only period'],
					"After creation, you'll have 1 minute of exclusive trading time before others can trade. This allows you to purchase your initial supply."
				],
				createCoin: ['Create coin (${{price}})', 'Creating...']
			},
			costsummary: {
				title: 'Cost Summary',
				balance: 'Balance:',
				creationFee: 'Creation Fee',
				initialLiquidity: 'Initial Liquidity',
				totalCost: 'Total Cost'
			},
			whathappensnext: {
				title: 'What Happens after Launch?',
				'1': [
					'Fair Distribution',
					'Everyone starts buying at the same price - no pre-sales or hidden allocations'
				],
				'2': [
					'Price Discovery',
					'Token price increases automatically as more people buy, following a bonding curve'
				],
				'3': [
					'Instant Trading',
					'Trading begins immediately - buy, sell, or distribute your tokens as you wish'
				]
			},
			signin: {
				title: 'Sign in to create your own coin',
				description: 'You need an account to create coins.',
				button: 'Sign in to continue'
			}
		},
		'24hChange': '24h Change',
		'24hVolume': '24h Volume',
		baseCurrency: 'Base Currency',
		circulatingSupply: {
			of: 'of {{total}} total',
			title: 'Circulating Supply'
		},
		comments: {
			characterLimit: '{{chars}}/500 characters',
			noCommentsYet: 'No comments yet. Be the first to share your thoughts!',
			placeholder: 'Share your thoughts about this coin...',
			post: 'Post',
			title: 'Comments ({{count}})'
		},
		created: 'Created',
		createdBy: 'Created By',
		currentPrice: 'Current Price',
		marketCap: 'Market Cap',
		name: 'Name',
		poolComposition: 'Pool Composition',
		poolStats: 'Pool Stats',
		price: 'Price',
		priceChart: 'Price Chart ({{time}})',
		topHolders: {
			noHolders: 'No holders',
			title: 'Top Holders'
		},
		totalLiquidity: 'Total Liquidity',
		trade: {
			balance: 'Balance: ${{bal}}',
			buy: {
				rec: "{{coin}} You'll get:",
				title: 'Buy {{coin}}'
			},
			curPrice: 'Current price: ${{price}} per {{coin}}',
			estimation: 'AMM estimation - includes slippage from pool impact',
			sell: {
				rec: "You'll receive:",
				title: 'Sell {{coin}}'
			},
			title: 'Trade {{coin}}',
			youOwn: 'You own: {{amount}} {{coin}}'
		},
		volume: 'Volume',
		volume24h: 'Volume (24h)'
	},
	gambling: {
		title: 'Gambling',
		signin: {
			title: 'Sign in to start gambling',
			description: 'You need an account to gamble away your life savings '
		},
		games: {
			coinflip: {
				title: 'Coinflip',
				description: 'Choose heads or tails and double your money!',
				chooseSide: 'Choose Side',
				heads: 'Heads',
				tails: 'Tails',
				flip: 'Flip',
				flipping: 'Flipping',
				win: ['WIN', 'Won {{amount}} on {{lastR}}'],
				loss: ['LOSS', 'Lost {{amount}} on {{lastR}}']
			},
			slots: {
				title: 'Slots',
				description: 'Match 3 symbols to win big!',
				chooseSide: 'Choose Side',
				'5x': '3 Same Symbols:',
				'2x': '2 Same Symbols:',
				paytable: 'Paytable',
				spin: 'Spin',
				spinning: 'Spinning',
				loss: {
					title: 'NO MATCH',
					description: 'Lost {{amount}}'
				},
				win: {
					title: 'WIN - {{winType}}',
					'2 OF A KIND': '2 OF A KIND',
					'5 OF A KIND': '5 OF A KIND',
					description: 'Won {{amount}}'
				}
			},
			mines: {
				title: 'Mines',
				description: 'Navigate through the minefield and cash out before hitting a mine!',
				numberMines: 'Number of Mines',
				'1': ['You will get', 'per tile, probability of winning:'],
				'2': 'Note: Maximum payout per game is capped at $2,000,000.',
				start: 'Start Game',
				abort: 'Abort Bet',
				currentProfit: 'Current Profit:',
				nextTile: 'Next Tile',
				cashOut: 'Cash Out',
				currentMultiplier: 'Current Multiplier:'
			}
		},
		live: {
			noData: {
				title: 'Waiting for activity...',
				description: 'High stakes gambling activity will appear here in real-time.'
			},
			description: 'Showing bets of $1,000 or more only',
			won: 'won',
			lost: 'lost',
			on: 'on {{game}}'
		},
		balance: 'Balance',
		betAmount: 'Bet Amount',
		betAmountPlaceholder: 'Enter bet amount',
		maxBet: 'Max bet: {{amount}}'
	},
	home: {
		good: {
			afternoon: 'Good afternoon, {{name}}',
			evening: 'Good evening, {{name}}',
			morning: 'Good morning, {{name}}',
			night: 'Good night, {{name}}'
		},
		marketOverview: {
			description: "Here's the market overview for today.",
			title: 'Market Overview'
		},
		nocoinsavailable: {
			description: 'Be the first to create a coin!',
			title: 'No coins available'
		},
		title: 'Home',
		welcome: 'Welcome to Rugplay!'
	},
	hopium: {
		active: 'Active',
		all: 'All',
		ask: 'Ask',
		chart: 'Chart',
		create: {
			description: 'Create a yes/no question that will be resolved by AI.',
			description2:
				'The AI will automatically determine the appropriate resolution date and criteria.',
			input: {
				characterLimit: '{{chars}}/200 characters',
				placeholder: 'Will *SKIBIDI reach $100 price today?'
			},
			question: 'Question *',
			title: 'Create'
		},
		description: 'AI-powered prediction markets. Create questions and bet on outcomes.',
		ends: 'Ends in {{time}}',
		marketStats: {
			created: 'Created:',
			resolves: 'Resolves:',
			title: 'Market Stats',
			totalBets: 'Total Bets:',
			totalVolume: 'Total Volume:'
		},
		minBalance: 'You need at least $100,000 in your portfolio (cash) to create a question.',
		no: 'NO',
		noQuestions: {
			description: 'Be the first to create a prediction question!',
			title: 'No questions yet'
		},
		placeBet: {
			balance: 'Balance:',
			enteramount: 'Enter amount...',
			title: 'Place Bet',
			toWin: 'To win:'
		},
		publish: ['Publish', 'Processing...'],
		recentActivity: 'Recent Activity',
		remaining: '{{time}} remaining',
		resolving: 'Resolving',
		resolved: 'Resolved',
		startBetting: {
			signin: 'Sign in to place bets',
			title: 'Start Betting'
		},
		title: 'Hopium',
		yes: 'YES',
		yourBets: 'Your bets:'
	},
	leaderboard: {
		description: 'Top performers and market activity',
		biggestLosses: {
			description: 'Users who experienced the largest losses today',
			loss: 'Loss',
			noData: 'No major losses recorded today',
			title: 'Biggest Losses (24h)'
		},
		highestPortfolio: {
			description: 'Users with the highest liquid cash balances',
			noData: 'No large portfolios yet! 📉',
			portfolio: 'Portfolio',
			title: 'Highest Portfolio Values'
		},
		rank: 'Rank',
		title: 'Leaderboard',
		topCash: {
			cash: 'Cash',
			description: 'Users with the highest liquid cash balances',
			noData: "Everyone's invested! 💸",
			title: 'Top Cash Holders'
		},
		topRugpullers: {
			description: 'Users who made the most profit selling coins today',
			noData: 'No major profits recorded today',
			profit: 'Profit',
			title: 'Top Rugpullers (24h)'
		},
		user: 'User'
	},
	livetrades: {
		d: {
			bought: 'bought by',
			sold: 'sold by'
		},
		desc: 'Real-time trading activity for all trades',
		notrades: 'No big trades yet...',
		stream: 'Stream',
		title: 'Live Trades',
		trades: ['{{count}} trade', '{{count}} trades'],
		waiting: {
			description: 'All trades will appear here in real-time.',
			title: 'Waiting for Trades'
		},
		by: '*{{coin}} by @{{user}}'
	},
	market: {
		'24hChange': {
			title: '24h Change',
			values: ['All changes', 'Gainers only', 'Losers only', 'Hot (±10%)', 'Hild (±50%)']
		},
		apply: 'Aplicar',
		description: 'Discover coins, track performance, and find your next investment',
		input: {
			filters: {
				clearAll: 'Clear all Filters',
				title: 'Filters'
			},
			noMatch: 'No coins match your search "{{query}}". Try different keywords or adjust filters.',
			placeholder: 'Search coins by name or symbol...'
		},
		noCoinsFound: {
			description: ['The market seems quiet...', 'create a coin', '? :)'],
			title: 'No coins found'
		},
		priceRange: {
			title: 'Price Range',
			values: ['All prices', 'Under $1', '$1 - $10', '$10 - $100', 'Over $100']
		},
		sortBy: 'Sort By',
		sortOrder: {
			title: 'Sort Order',
			values: ['High to Low', 'Low to High']
		},
		title: 'Market'
	},
	notifications: {
		title: 'Notifications',
		description: 'Stay updated with your activities',
		noNotifications: {
			title: 'No notifications yet',
			description: "You'll see updates about your activities here"
		},
		signin: {
			title: 'Please sign in',
			description: 'You need to be signed in to view notifications'
		}
	},
	pagination: {
		morepages: 'More pages',
		next: {
			title: 'Next'
		},
		previous: {
			label: 'Go to previous page',
			title: 'Previous'
		}
	},
	portfolio: {
		description: 'Manage your investments and transactions',
		loginMessage: 'You need to be logged in to view your portfolio',
		title: 'Portfolio'
	},
	prestige: {
		title: 'Presige'
	},
	settings: {
		title: 'Settings'
	},
	sidebar: {
		account: 'Account',
		api: 'API',
		logout: 'Log out',
		portfolio: {
			cash: 'Cash',
			coins: 'Coins',
			title: 'Portfolio',
			totalValue: 'Total Value'
		},
		promocode: 'Promo code',
		themes: {
			dark: 'Dark Mode',
			light: 'Light Mode'
		}
	},
	signin: {
		button: 'Sign in',
		description:
			"Choose a service to sign in with. Your account will be created automatically if you don't have one.",
		options: {
			google: 'Continue with Google'
		},
		terms: ['By continuing, you agree to our', 'and'],
		title: 'Sign in to Rugplay'
	},
	terms: {
		privacy: 'Privacy Policy',
		service: 'Terms of Service'
	},
	title: 'Rugplay',
	treemap: {
		coins: '{{count}} coins',
		description:
			'Visual representation of the cryptocurrency market. Size indicates market cap, color shows 24h price change.',
		fullscreen: {
			join: 'Fullscreen',
			leave: 'Exit Fullscreen'
		},
		lastUpdated: 'Last updated: {{time}}',
		negative: 'Negative 24h change',
		noCoins: {
			description: 'Create some coins to see the treemap visualization.'
		},
		positive: 'Positive 24h change',
		title: 'Treemap',
		'title²': 'Market Treemap'
	},
	user: {
		'24hTradingVolume': {
			description: '{{count}} trades today',
			title: '24h Trading Volume'
		},
		buyActivity: {
			description: 'Total amount spent',
			description2: '24h buy volume',
			title: 'Buy Activity'
		},
		buySellRatio: {
			buy: 'buy',
			sell: 'sell',
			title: 'Buy/Sell Ratio'
		},
		createdCoins: {
			description: 'Coins launched by {{name}}',
			title: 'Created Coins ({{count}})'
		},
		id: '#{{id}} to join',
		illiquidValue: {
			description: 'Coin Holdings',
			title: 'Illiquid Value'
		},
		joined: 'Joined {{date}}',
		liquidValue: {
			description: 'Available cash',
			title: 'Liquid Value'
		},
		netProfit: {
			description: ['Overall profit', 'Overall loss'],
			title: 'Net Profit'
		},
		recentTrading: {
			description: 'Latest transactions by {{name}}',
			title: 'Recent Trading Activity'
		},
		sellActivity: {
			description: 'Total amount received',
			description2: '24h sell volume',
			title: 'Sell Activity'
		},
		title: 'User Profile',
		totalLosses: {
			description: 'Total gambling losses',
			title: 'Total Losses'
		},
		totalPortfolio: {
			description: '{{count}} holdings',
			title: 'Total Portfolio'
		},
		totalVolume: {
			description: '{{count}} total trades',
			title: 'Total Trading Volume'
		},
		totalWins: {
			description: 'Total gambling winnings',
			title: 'Total Wins'
		},
		winRate: {
			description: 'Percentage of wins',
			title: 'Win Rate'
		}
	},
	viewall: 'View all'
};
