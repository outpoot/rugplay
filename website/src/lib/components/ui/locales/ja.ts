// Needs a human to review it, may have some errors
// - Generated with AI
import type en from './en';

export default {
	lang: {
		code: 'ja',
		name: '日本語',
		flagCode: 'jp'
	},
	about: {
		desc: '実際のお金を失うことなくトレーディングを練習できる暗号トレーディングシミュレーター。コインを作成し、取引し、ラグプルを実行しましょう！',
		title: '概要',
		usermanual: {
			tips: {
				'1': {
					desc: 'Rugplayは、実際の金銭的リスクなしでトレーディングを練習できる暗号通貨トレーディングシミュレーターです。仮想のお金から始め、コインを作成し、予測市場に賭け、そして最も重要なことに、ラグプルを実行しましょう！'
				},
				'10': {
					desc: 'Hopiumでは、将来に関するイエス/ノーの質問に賭けることができます。AIが実際のデータに基づいて質問を自動的に解決します。あなたの予測スキルを試して、正しい予測から収益を得ましょう。自分自身のHopiumの質問を作成するには、現金$100,000を保有する必要があります :)',
					title: 'Hopium - 予測市場'
				},
				'11': {
					desc: 'ハイリスク・ハイリターンのゲームについては、ギャンブルセクションをご覧ください。覚えておいてください：これらは純粋な運のゲームです。このシミュレーションでさえ、失っても構わない金額だけを賭けてください！',
					title: 'ギャンブルゲーム'
				},
				'12': {
					desc: 'ライブトレードページを見て、すべてのコインのリアルタイムのトレーディングアクティビティを確認しましょう。これは、トレンドのコインを見つけ、市場のセンチメントを理解するのに役立ちます。サイドバーには$1,000以上の取引が表示され、メインフィードにはすべての取引が表示されます。',
					title: 'ライブトレードフィード'
				},
				'13': {
					desc: 'トレマップページでは、市場全体の視覚的な表現が表示されます。より大きな四角形はより高い時価総額を表し、色は価格パフォーマンスを示します。',
					title: 'トレマップの視覚化'
				},
				'14': {
					desc: 'リーダーボードで他のユーザーと競い合いましょう。賢明な投資決定をすることでランクを上げましょう！',
					title: 'リーダーボード'
				},
				'15': {
					desc: '毎日ログインして無料のお金を手に入れましょう！ログインの連続日数によりデイリーボーナスが増加します。継続的なプレイヤーは、より多くの仮想キャッシュを投資できます。',
					title: 'デイリー報酬'
				},
				'16': {
					desc: '少額から始め、保有資産を多様化し、すべてを一つのコインに投資しないでください。絶対的なラグプルを避けるために、保有者が分散しているコインに注目しましょう。人々は賢くなっています！',
					title: '結論として'
				},
				'2': {
					desc: 'サイドバーの「コインを作成」をクリックして、独自の暗号通貨を立ち上げましょう。ユニークな名前、シンボルを選択し、アイコンをアップロードします。各コインは$0.000001から始まります',
					title: '最初のコインを作成'
				},
				'3': {
					desc: '各コインには、あなたのコインと基軸通貨 ($) を含む「流動性プール」があります。価格はこれらの量の比率によって決定されます。あなたが買うと価格は上がり、売ると価格は下がります。',
					title: '流動性プールを理解する'
				},
				'4': {
					desc: 'Rugplayは、需要と供給に基づいて価格が自動的に計算されるAMMシステムを使用しています。多く買えば買うほど価格は上がり、多く売れば売るほど価格は下がります。大規模な取引は、「スリッページ」—取引中の価格変動—を生み出します。',
					title: 'AMM - 自動マーケットメーカー'
				},
				'5': {
					desc: '任意のコインページに移動し、「購入」をクリックします。使いたい金額を入力してください。AMM（自動マーケットメーカー）は、スリッページを含め、正確にいくつのコインを受け取るかを表示します。',
					title: 'コインを購入する'
				},
				'6': {
					desc: 'コインページで「売却」をクリックし、売りたいコインの数量を入力します。ポートフォリオで保有資産を確認できます。覚えておいてください：大量に売却すると、価格に大きな影響を与える可能性があります！',
					title: 'コインを売却する'
				},
				'7': {
					desc: '「ラグプル」は、大口保有者（コイン作成者を含む）が一斉に保有資産を売却し、価格が暴落するときに発生します。',
					title: '「ラグプル」とは？'
				},
				'8': {
					desc: 'ポートフォリオページをチェックして、すべての保有資産、現在の価値、および最近の取引を確認しましょう。あなたのパフォーマンスを追跡し、どの投資がうまくいっているかを確認しましょう。',
					title: 'ポートフォリオ管理'
				},
				'9': {
					desc: 'マーケットページには、時価総額、出来高、価格変動でソートされたすべての利用可能なコインが表示されます。これを使用して、トレンドのコインや投資機会を発見しましょう。',
					title: 'マーケット概要'
				}
			},
			title: 'ユーザーマニュアル'
		},
		rugplay: {
			title: 'Rugplayについて',
			description: [
				'Rugplayは、DeFi（分散型金融）のメカニズムと分散型トレーディングに内在するリスクに焦点を当てた、リアルな暗号通貨トレーディングシミュレーションです。',
				'実際の金銭的リスクなしで、トレーディング戦略を練習し、独自のコインを作成し、市場のダイナミクスについて学びましょう。AMMトレーディング、流動性プール、そしてラグプルさえも体験してください。（もちろん）',
				'パラノイアが利益になるデジェネレートのコミュニティに参加しましょう！'
			]
		},
		features: {
			title: '機能',
			description: [
				'コインの作成',
				'コインの購入',
				'コインの売却',
				'質問への賭け（Polymarketに類似）',
				'すべてを賭けるギャンブル',
				'市場全体のトレマップグラフの表示',
				'リーダーボードでの競争'
			]
		},
		credits: {
			title: 'クレジット',
			description: ['作成者', 'FaceDev']
		}
	},
	base: {
		'24hChange': '24時間変動率',
		asset: '資産',
		amount: '金額',
		apply: '適用',
		buy: '購入',
		buy2: '購入',
		cancel: 'キャンセル',
		coin: 'コイン',
		date: '日付',
		live: 'ライブ',
		noData: 'データなし',
		paused: '一時停止',
		quantity: '数量',
		rank: '順位',
		received: '受取額',
		rec: '受取',
		receiver: '受取人',
		reset: 'リセット',
		sell: '売却',
		sell2: '売却',
		sender: '送信者',
		sent: '送信額',
		signin: 'サインイン',
		skip: 'スキップ',
		type: '種類',
		total: '合計',
		unknown: '不明',
		user: 'ユーザー'
	},
	coin: {
		create: {
			title: 'コインを作成',
			err: {
				title: 'コインの作成に失敗しました',
				unknown: 'コインの作成中にエラーが発生しました'
			},
			details: {
				title: 'コインの詳細',
				icon: {
					title: 'コインのアイコン（オプション）',
					description: 'クリックしてコインのアイコンをアップロード（PNGまたはJPG、最大1MB）',
					err: ['有効な画像ファイルを選択してください', 'アイコンは1MB未満である必要があります']
				},
				name: {
					title: 'コイン名',
					placeholder: '例: Bitcoin',
					description: 'あなたの暗号通貨に覚えやすい名前を選んでください',
					err: '名前は2文字から255文字の間である必要があります'
				},
				symbol: {
					title: 'シンボル',
					placeholder: 'BTC',
					description: 'コインの短い識別子（例: Bitcoinの場合はBTC）。*{{name}}として表示されます',
					err: 'シンボルは2文字から10文字の間である必要があります'
				},
				fairLaunchSettings: [
					'フェアローンチ設定',
					['総供給量:', '1,000,000,000トークン'],
					['開始価格:', 'トークンあたり$0.000001'],
					['あなたが受け取るのは', '供給量の100%'],
					['初期時価総額:', '$1,000'],
					['トレーディングロック:', '作成者専用の1分間期間'],
					'作成後、他の人が取引できるようになる前に、あなた専用の1分間の取引時間があります。これにより、あなたは最初の供給量を購入することができます。'
				],
				createCoin: ['コインを作成 (${{price}})', '作成中...']
			},
			costsummary: {
				title: 'コストの概要',
				balance: '残高:',
				creationFee: '作成手数料',
				initialLiquidity: '初期流動性',
				totalCost: '合計コスト'
			},
			whathappensnext: {
				title: 'ローンチ後に何が起こるか？',
				'1': [
					'公平な分配',
					'誰もが同じ価格で買い始めます — プレセールや隠された割り当てはありません'
				],
				'2': [
					'価格発見',
					'より多くの人が購入するにつれて、トークン価格はボンディングカーブに従って自動的に上昇します'
				],
				'3': [
					'即時取引',
					'取引はすぐに始まります — あなたのトークンを購入、売却、または分配してください'
				]
			},
			signin: {
				title: 'サインインして独自のコインを作成',
				description: 'コインを作成するにはアカウントが必要です。',
				button: '続行するにはサインイン'
			}
		},
		'24hChange': '24時間変動率',
		'24hVolume': '24時間出来高',
		baseCurrency: '基軸通貨',
		circulatingSupply: {
			of: '全{{total}}のうち',
			title: '流通供給量'
		},
		comments: {
			characterLimit: '{{chars}}/500文字',
			noCommentsYet: 'まだコメントはありません。最初にあなたの考えを共有しましょう！',
			placeholder: 'このコインについてあなたの考えを共有してください...',
			post: '投稿',
			title: 'コメント ({{count}})',
			err: 'コメントの投稿に失敗しました',
			signin: 'ディスカッションに参加するにはサインインしてください'
		},
		created: '作成日',
		createdBy: '作成者',
		currentPrice: '現在の価格',
		marketCap: '時価総額',
		name: '名前',
		poolComposition: 'プール構成',
		poolStats: 'プール統計',
		price: '価格',
		priceChart: '価格チャート ({{time}})',
		topHolders: {
			noHolders: '保有者なし',
			title: 'トップ保有者'
		},
		totalLiquidity: '総流動性',
		trade: {
			balance: '残高: ${{bal}}',
			buy: {
				rec: '{{coin}} あなたが受け取る量:',
				title: '{{coin}}を購入',
				spentAmount: '使用する金額 ($)'
			},
			curPrice: '現在の価格: {{coin}}あたり ${{price}}',
			estimation: 'AMM推定 - プールへの影響によるスリッページを含む',
			sell: {
				rec: 'あなたが受け取る額:',
				title: '{{coin}}を売却',
				amount: '数量 ({{coin}})',
				available: '利用可能: {{amount}} {{coin}}',
				maxSellable: '最大売却可能: {{amount}} {{coin}} (プール制限)'
			},
			title: '{{coin}}を取引',
			youOwn: '保有: {{amount}} {{coin}}'
		},
		volume: '出来高',
		volume24h: '出来高 (24時間)',
		locked: ['🔒 作成者専用期間: 残り{{time}}', '🔒 取引ロック解除まで: 残り{{time}}'],
		signin: {
			title: '取引を開始するにはサインイン'
		}
	},
	gambling: {
		title: 'ギャンブル',
		signin: {
			title: 'ギャンブルを開始するにはサインイン',
			description: 'あなたの全財産を賭けるにはアカウントが必要です '
		},
		games: {
			coinflip: {
				title: 'コイントス',
				description: 'ヘッドかテールを選んで、お金を倍にしましょう！',
				chooseSide: '面を選択',
				heads: 'ヘッド',
				tails: 'テール',
				flip: 'トス',
				flipping: 'トス中',
				win: ['勝利', '{{lastR}}で{{amount}}獲得'],
				loss: ['敗北', '{{lastR}}で{{amount}}喪失']
			},
			slots: {
				title: 'スロット',
				description: '3つのシンボルを揃えて大勝利を！',
				chooseSide: '面を選択',
				'5x': 'シンボル3つ一致:',
				'2x': 'シンボル2つ一致:',
				paytable: '配当表',
				spin: 'スピン',
				spinning: 'スピン中',
				loss: {
					title: '不一致',
					description: '{{amount}}を失いました'
				},
				win: {
					title: '勝利 - {{winType}}',
					'2 OF A KIND': '2つ一致',
					'5 OF A KIND': '3つ一致',
					description: '{{amount}}を獲得'
				}
			},
			mines: {
				title: 'マイン',
				description: '地雷原をナビゲートし、地雷を踏む前にキャッシュアウト！',
				numberMines: '地雷の数',
				'1': ['タイルあたり', 'を獲得、勝率:'],
				'2': '注: 1ゲームあたりの最大ペイアウトは$2,000,000に制限されています。',
				start: 'ゲーム開始',
				abort: 'ベットを中止',
				currentProfit: '現在の利益:',
				nextTile: '次のタイル',
				cashOut: 'キャッシュアウト',
				currentMultiplier: '現在のマルチプライヤー:'
			}
		},
		live: {
			noData: {
				title: 'アクティビティを待っています...',
				description: '高額なギャンブルのアクティビティがリアルタイムでここに表示されます。'
			},
			description: '$1,000以上のベットのみ表示',
			won: 'が獲得',
			lost: 'が喪失',
			on: 'を{{game}}で'
		},
		balance: '残高',
		betAmount: 'ベット額',
		betAmountPlaceholder: 'ベット額を入力',
		maxBet: '最大ベット: {{amount}}'
	},
	home: {
		good: {
			afternoon: 'こんにちは、{{name}}さん',
			evening: 'こんばんは、{{name}}さん',
			morning: 'おはようございます、{{name}}さん',
			night: 'おやすみなさい、{{name}}さん'
		},
		marketOverview: {
			description: '今日の市場の概要はこちらです。',
			title: '市場概要'
		},
		nocoinsavailable: {
			description: '最初にコインを作成しましょう！',
			title: '利用可能なコインがありません'
		},
		title: 'ホーム',
		welcome: 'Rugplayへようこそ！',
		signInRequired: ['プレイするには', 'サインイン', 'が必要です。']
	},
	hopium: {
		active: 'アクティブ',
		all: 'すべて',
		ask: '質問',
		chart: 'チャート',
		create: {
			description: 'AIによって解決されるイエス/ノーの質問を作成します。',
			description2: 'AIが適切な解決日と基準を自動的に決定します。',
			input: {
				characterLimit: '{{chars}}/200文字',
				placeholder: '今日の*SKIBIDI価格は$100に達しますか？'
			},
			question: '質問 *',
			title: '作成'
		},
		description: 'AIを搭載した予測市場。質問を作成し、結果に賭けます。',
		ends: '{{time}}で終了',
		marketStats: {
			created: '作成日:',
			resolves: '解決日:',
			title: '市場統計',
			totalBets: '合計ベット数:',
			totalVolume: '合計出来高:'
		},
		minBalance: '質問を作成するには、ポートフォリオに少なくとも$100,000の現金が必要です。',
		no: 'いいえ',
		noQuestions: {
			description: '最初に予測の質問を作成しましょう！',
			title: 'まだ質問がありません'
		},
		placeBet: {
			balance: '残高:',
			enteramount: '金額を入力...',
			title: 'ベットを置く',
			toWin: '勝利時に獲得:'
		},
		publish: ['公開', '処理中...'],
		recentActivity: '最近のアクティビティ',
		remaining: '残り{{time}}',
		resolving: '解決中',
		resolved: '解決済み',
		startBetting: {
			signin: 'ベットを置くにはサインイン',
			title: 'ベットを開始'
		},
		title: 'Hopium',
		yes: 'はい',
		yourBets: 'あなたのベット:'
	},
	leaderboard: {
		err: 'リーダーボードデータの読み込みに失敗しました',
		description: 'トップパフォーマーと市場アクティビティ',
		biggestLosses: {
			description: '今日最大の損失を経験したユーザー',
			loss: '損失',
			noData: '今日、大きな損失は記録されていません',
			title: '最大の損失 (24時間)'
		},
		highestPortfolio: {
			description: '最も高い流動性キャッシュ残高を持つユーザー',
			noData: 'まだ大きなポートフォリオはありません！ 📉',
			portfolio: 'ポートフォリオ',
			title: '最高のポートフォリオ価値',
			liquidity: '流動性'
		},
		rank: '順位',
		title: 'リーダーボード',
		topCash: {
			cash: '現金',
			description: '最も高い流動性キャッシュ残高を持つユーザー',
			noData: 'みんな投資しています！ 💸',
			title: 'トップキャッシュ保有者'
		},
		topRugpullers: {
			description: '今日、コインの売却で最も利益を上げたユーザー',
			noData: '今日、大きな利益は記録されていません',
			profit: '利益',
			title: 'トップラグプラー (24時間)'
		},
		user: 'ユーザー',
		search: {
			placeholder: 'ユーザー名で検索...',
			noFound: {
				title: 'ユーザーが見つかりません',
				description: '検索条件「{{search}}」に一致するユーザーはいません',
				clear: '検索をクリア'
			},
			description: '{{3}}件中 {{1}} - {{2}}件を表示'
		}
	},
	livetrades: {
		d: {
			bought: 'が購入',
			sold: 'が売却'
		},
		desc: 'すべての取引のリアルタイム取引アクティビティ',
		notrades: 'まだ大きな取引はありません...',
		stream: 'ストリーム',
		title: 'ライブトレード',
		trades: ['{{count}}件の取引', '{{count}}件の取引'],
		waiting: {
			description: 'すべての取引がリアルタイムでここに表示されます。',
			title: '取引を待っています'
		},
		by: '*{{coin}} @{{user}}による'
	},
	market: {
		'24hChange': {
			title: '24時間変動率',
			values: ['すべての変動', 'ゲイナーのみ', 'ルーザーのみ', 'ホット (±10%)', '激変 (±50%)']
		},
		apply: '適用',
		description: 'コインを発見し、パフォーマンスを追跡し、次の投資を見つけましょう',
		input: {
			filters: {
				clearAll: 'すべてのフィルターをクリア',
				clearAll2: 'すべてのフィルターをクリア',
				title: 'フィルター'
			},
			noMatch:
				'検索「{{query}}」に一致するコインはありません。別のキーワードを試すか、フィルターを調整してください。',
			placeholder: 'コインを名前またはシンボルで検索...'
		},
		noCoinsFound: {
			description: ['市場は静かなようです...', 'コインを作成', 'しますか？ :)'],
			title: 'コインが見つかりません'
		},
		priceRange: {
			title: '価格帯',
			values: ['すべての価格', '$1未満', '$1 - $10', '$10 - $100', '$100超']
		},
		showing: '{{coins}}コイン中 {{val}}-{{total}}を表示',
		sortBy: '並べ替え',
		sortOrder: {
			title: 'ソート順',
			values: ['高から低', '低から高']
		},
		title: 'マーケット'
	},
	notifications: {
		title: '通知',
		description: 'あなたのアクティビティの最新情報を入手',
		noNotifications: {
			title: 'まだ通知はありません',
			description: 'あなたのアクティビティに関する更新がここに表示されます'
		},
		signin: {
			title: 'サインインしてください',
			description: '通知を見るにはサインインする必要があります'
		}
	},
	pagination: {
		morepages: 'その他のページ',
		next: {
			title: '次へ'
		},
		previous: {
			label: '前のページへ移動',
			title: '前へ'
		}
	},
	portfolio: {
		description: 'あなたの投資と取引を管理',
		loginMessage: 'ポートフォリオを見るにはログインする必要があります',
		title: 'ポートフォリオ',
		err: ['ポートフォリオデータの読み込みに失敗しました', '取引の読み込みに失敗しました'],
		holdings: {
			title: 'あなたの保有資産',
			description: 'ポートフォリオ内の現在のポジション'
		},
		sendMoney: {
			title: '送金',
			title2: '送金',
			description: '他のユーザーに現金またはコインを送る',
			recipient: ['受取人', 'ユーザー名を入力（@なし）'],
			type: ['種類', '現金 ($)', 'コイン'],
			coins: ['コインを選択', '*{{name}} ({{available}} 利用可能)'],
			failed: '送金失敗',
			sent: ['コインが正常に送られました！']
		},
		recentTransactions: '最近の取引',
		total: '合計',
		cashBalance: ['現金残高', 'ポートフォリオの{{percent}}%'],
		coinHoldings: ['コイン保有', '{{count}}ポジション'],
		noCoins: [
			'コイン保有なし',
			'まだどのコインにも投資していません。既存のコインを購入することから始めましょう。',
			'コインを閲覧'
		],
		noTransactions: [
			'まだ取引がありません',
			'まだ取引をしていません。コインを購入または売却することから始めましょう。'
		],
		value: '価値',
		pl: 'P&L %',
		portfolioPercent: 'ポートフォリオ %'
	},
	prestige: {
		title: 'プレステージ',
		description: '進捗をリセットしてトレーディングステータスを上げましょう',
		how: [
			'方法',
			['要件を満たす', 'プレステージのコストを賄うのに十分な現金を蓄積'],
			['進捗をリセット', 'すべての現金と保有資産は消去されますが、履歴は残ります'],
			[
				'ステータスを獲得',
				'限定のプレステージタイトル、強化されたデイリー報酬を獲得し、デイリー報酬のクールダウンをリセットします'
			]
		],
		progress: {
			title: '進捗',
			description: '{{name}}への進捗',
			required: '必須額',
			yourCash: 'あなたの現金',
			stillNeeded: 'まだ必要な額',
			perma: 'プレステージは永続的で元に戻すことはできません！',
			button: ['プレステージにはあと{{bal}}必要です', 'さあ行こう', '{{name}}に昇格中'],
			star: ['あなたはスターです！', '利用可能な最高のプレステージレベルに到達しました。'],
			tip: 'ヒント: コイン保有を売却'
		},
		preview: {
			title: 'プレビュー',
			current: '現在',
			after: '後',
			description: 'また、デイリー報酬が{{percent}}%増加します。'
		},
		levels: {
			title: 'レベル',
			d: {
				'1': 'プレステージ I',
				'2': 'プレステージ II',
				'3': 'プレステージ III',
				'4': 'プレステージ IV',
				'5': 'プレステージ V'
			}
		},
		popup: {
			title: '確認',
			description:
				'このアクションは永続的で元に戻すことはできません。結果を注意深く確認してください。',
			lose: [
				'失うもの:',
				'現金残高: {{amount}}',
				'価値{{amount}}のすべてのコイン保有',
				'合計ポートフォリオ価値: {{amount}}'
			],
			gain: [
				'得られるもの:',
				'デイリー報酬の増加',
				'デイリー報酬のリセット',
				'プレステージバッジとステータス',
				'すべてのコイン保有が自動的に売却されます'
			],
			confirm: [
				'確認のために"PRESTIGE"と入力してください', // Don't translate "PRESTIGE" here.
				'ここにPRESTIGEと入力'
			],
			proceed: ['昇格中...', '続行'],
			done: 'おめでとうございます！{{name}}に到達しました！',
			err: 'プレステージに失敗しました。'
		},
		signin: {
			title: 'プレステージするにはサインイン',
			description: 'プレステージするにはアカウントが必要です'
		},
		err: 'プレステージデータの読み込みに失敗しました'
	},
	settings: {
		title: '設定'
	},
	sidebar: {
		account: 'アカウント',
		api: 'API',
		logout: 'ログアウト',
		portfolio: {
			cash: '現金',
			coins: 'コイン',
			title: 'ポートフォリオ',
			totalValue: '合計価値'
		},
		themes: {
			dark: 'ダークモード',
			light: 'ライトモード'
		}
	},
	signin: {
		button: 'サインイン',
		description:
			'サインインに使用するサービスを選択してください。アカウントがない場合は自動的に作成されます。',
		options: {
			google: 'Googleで続行'
		},
		terms: ['続行することで、当社の', 'および'],
		title: 'Rugplayにサインイン'
	},
	terms: {
		privacy: 'プライバシーポリシー',
		service: '利用規約'
	},
	title: 'Rugplay',
	treemap: {
		coins: '{{count}}コイン',
		description:
			'暗号通貨市場の視覚的な表現。サイズは時価総額を示し、色は24時間の価格変動を示します。',
		fullscreen: {
			join: '全画面',
			leave: '全画面表示を終了'
		},
		lastUpdated: '最終更新: {{time}}',
		negative: '24時間変動率がマイナス',
		noCoins: {
			description: 'トレマップの視覚化を見るためにコインを作成してください。'
		},
		positive: '24時間変動率がプラス',
		title: 'トレマップ',
		'title²': '市場トレマップ'
	},
	user: {
		'24hTradingVolume': {
			description: '今日の取引数: {{count}}',
			title: '24時間取引量'
		},
		buyActivity: {
			description: '合計使用額',
			description2: '24時間購入量',
			title: '購入アクティビティ'
		},
		buySellRatio: {
			buy: '購入',
			sell: '売却',
			title: '購入/売却比率'
		},
		createdCoins: {
			description: '{{name}}が立ち上げたコイン',
			title: '作成されたコイン ({{count}})'
		},
		id: '参加ID #{{id}}',
		streak: '{{days}}日連続',
		illiquidValue: {
			description: 'コイン保有',
			title: '非流動性価値'
		},
		joined: '参加日 {{date}}',
		liquidValue: {
			description: '利用可能な現金',
			title: '流動性価値'
		},
		netProfit: {
			description: ['全体的な利益', '全体的な損失'],
			title: '純利益'
		},
		recentTrading: {
			description: '{{name}}による最新の取引',
			portfolio: 'あなたの最新の取引アクティビティ',
			title: '最近の取引アクティビティ'
		},
		sellActivity: {
			description: '合計受取額',
			description2: '24時間売却量',
			title: '売却アクティビティ'
		},
		title: 'ユーザープロフィール',
		totalLosses: {
			description: 'ギャンブルでの総損失',
			title: '総損失'
		},
		totalPortfolio: {
			description: '{{count}}件の保有',
			title: '合計ポートフォリオ'
		},
		totalVolume: {
			description: '合計取引数: {{count}}',
			title: '総取引量'
		},
		totalWins: {
			description: 'ギャンブルでの総勝利数',
			title: '総勝利数'
		},
		winRate: {
			description: '勝率',
			title: '勝率'
		}
	},
	viewall: 'すべて表示',
	tryagain: '再試行',
	time: {
		'1m': '1分',
		'5m': '5分',
		'15m': '15分',
		'1h': '1時間',
		'4h': '4時間',
		'1d': '1日'
	},
	transactions: {
		title: '取引',
		description: 'あなたの取引アクティビティと送金の完全な記録',
		input: {
			placeholder: 'コイン名またはシンボルで検索...',
			filters: {
				name: 'フィルター',
				sortBy: '並べ替え',
				sortOrder: ['ソート順', '新しい順', '古い順'],
				transactionType: [
					'取引の種類',
					'すべての取引',
					'購入のみ',
					'売却のみ',
					'受取った送金',
					'送った送金'
				]
			}
		},
		history: {
			title: '履歴',
			description: 'あなたの取引アクティビティと送金の完全な記録'
		},
		empty: {
			title: '取引が見つかりません',
			description: [
				'まだ取引や送金を行っていません。コインを購入するか、他のユーザーに送金することから始めましょう。',
				'現在のフィルターに一致する取引はありません。検索条件を調整してみてください。'
			]
		}
	},
	promocode: {
		title: 'プロモコード',
		description: '報酬とボーナスを引き換えるために、以下にプロモコードを入力してください。',
		input: ['プロモコード', 'コード...'],
		redeem: ['コードを引き換える', '確認中...'],
		err: ['無効なプロモコード', 'プロモコードの確認に失敗しました。もう一度お試しください。'],
		messages: {
			PR: 'プロモコードが必要です',
			IPC: '無効なプロモコード',
			NA: 'このプロモコードは現在アクティブではありません',
			EX: 'このプロモコードは期限切れです',
			AU: 'あなたは既にこのプロモコードを使用しました',
			UL: 'このプロモコードは使用制限に達しました',
			RD: 'プロモコードが引き換えられました！${{balance}}を受け取りました。'
		}
	},
	error: {
		unknown: 'エラーが発生しました'
	}
} satisfies typeof en;
