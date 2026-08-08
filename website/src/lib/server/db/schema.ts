import { pgTable, text, timestamp, boolean, decimal, serial, varchar, integer, primaryKey, pgEnum, index, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const transactionTypeEnum = pgEnum('transaction_type', ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT']);
export const predictionMarketEnum = pgEnum('prediction_market_status', ['ACTIVE', 'RESOLVED', 'CANCELLED']);
export const notificationTypeEnum = pgEnum('notification_type', ['HOPIUM', 'SYSTEM', 'TRANSFER', 'RUG_PULL', 'MENTION']);
export const shopItemTypeEnum = pgEnum('shop_item_type', ['namecolor']);
export const seasonStatusEnum = pgEnum('season_status', ['UPCOMING', 'ACTIVE', 'ENDED']);
export const seasonTrophyTierEnum = pgEnum('season_trophy_tier', ['CHAMPION', 'RUNNER_UP', 'THIRD', 'TOP_10', 'TOP_100', 'PARTICIPANT']);

// Every event type the news feed can turn into an article. Keep this in
// sync with `ARTICLE_TEMPLATES` in `$lib/server/news/templates.ts`.
export const newsArticleTypeEnum = pgEnum('news_article_type', [
	'RUG_PULL', // large dump detected by the AMM (amm.ts isRugPull)
	'COIN_PUMP', // large, fast positive price move
	'COIN_CREATED', // a new coin was listed
	'COIN_MILESTONE', // market cap / holder count crossed a threshold
	'HOPIUM_RESOLVED', // a prediction question was resolved (review-style article)
	'HOPIUM_TRENDING', // a prediction question is getting a lot of volume
	'WHALE_TRADE', // a single trade above a $ threshold
	'LEADERBOARD_SHAKEUP', // #1 on a leaderboard changed
	'SEASON_EVENT', // season started/ended
	'PLATFORM' // generic/editorial, mostly for admin-authored or digest articles
]);

// AI-authored, or the deterministic template fallback used when the AI
// call fails / OPENROUTER_API_KEY is unset / the response fails validation.
export const newsArticleSourceEnum = pgEnum('news_article_source', ['AI', 'TEMPLATE']);

export const newsReactionTypeEnum = pgEnum('news_reaction_type', ['LIKE', 'DISLIKE']);

export const newsReportStatusEnum = pgEnum('news_report_status', ['OPEN', 'REVIEWED', 'DISMISSED']);

export const user = pgTable("user", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	isAdmin: boolean("is_admin").default(false),
	isBanned: boolean("is_banned").default(false),
	banReason: text("ban_reason"),
	baseCurrencyBalance: decimal("base_currency_balance", {
		precision: 30,
		scale: 8,
	}).notNull().default("100.00000000"), // $100
	bio: varchar("bio", { length: 160 }).default("Hello am 48 year old man from somalia. Sorry for my bed england. I selled my wife for internet connection for play “conter stirk”"),
	username: varchar("username", { length: 30 }).notNull().unique(),

	volumeMaster: decimal("volume_master", { precision: 3, scale: 2 }).notNull().default("0.70"),
	volumeMuted: boolean("volume_muted").notNull().default(false),

	lastRewardClaim: timestamp("last_reward_claim", { withTimezone: true }),
	totalRewardsClaimed: decimal("total_rewards_claimed", {
		precision: 30,
		scale: 8,
	}).notNull().default("0.00000000"),
	loginStreak: integer("login_streak").notNull().default(0),
	prestigeLevel: integer("prestige_level").default(0),
	arcadeLosses: decimal("gambling_losses", {
		precision: 30,
		scale: 8,
	}).notNull().default("0.00000000"),
	arcadeWins: decimal("gambling_wins", {
		precision: 30,
		scale: 8,
	}).notNull().default("0.00000000"),
	totalArcadeGamesPlayed: integer("total_arcade_games_played").notNull().default(0),
	arcadeWinStreak: integer("arcade_win_streak").notNull().default(0),
	arcadeBestWinStreak: integer("arcade_best_win_streak").notNull().default(0),
	totalArcadeWagered: decimal("total_arcade_wagered", {
		precision: 30,
		scale: 8,
	}).notNull().default("0.00000000"),
	cratesOpened: integer("crates_opened").notNull().default(0),
	halloweenBadge2025: boolean("halloween_badge_2025").default(false),
	gems: integer("gems").notNull().default(0),
	nameColor: text("name_color"),
	founderBadge: boolean("founder_badge").notNull().default(false),
	disableMentions: boolean("disable_mentions").notNull().default(false),
}, (table) => {
	return {
		usernameIdx: index("user_username_idx").on(table.username),
		usernameTrgmIdx: index("user_username_trgm_idx").using("gin", table.username.op("gin_trgm_ops")),
		isBannedIdx: index("user_is_banned_idx").on(table.isBanned),
		isAdminIdx: index("user_is_admin_idx").on(table.isAdmin),
		createdAtIdx: index("user_created_at_idx").on(table.createdAt),
		updatedAtIdx: index("user_updated_at_idx").on(table.updatedAt),
	};
});

export const session = pgTable("session", {
	id: serial("id").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => {
	return {
		userIdIdx: index("session_user_id_idx").on(table.userId),
	};
});

export const account = pgTable("account", {
	id: serial("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, }),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		userIdIdx: index("account_user_id_idx").on(table.userId),
		providerAccountIdx: index("account_provider_account_idx").on(table.providerId, table.accountId),
	};
});

export const verification = pgTable("verification", {
	id: serial("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const coin = pgTable("coin", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	symbol: varchar("symbol", { length: 10 }).notNull().unique(),
	icon: text("icon"), // New field for coin icon
	creatorId: integer("creator_id").references(() => user.id, { onDelete: "set null", }), // Coin can exist even if creator is deleted
	initialSupply: decimal("initial_supply", { precision: 30, scale: 8 }).notNull(),
	circulatingSupply: decimal("circulating_supply", { precision: 30, scale: 8 }).notNull(),
	currentPrice: decimal("current_price", { precision: 30, scale: 8 }).notNull(), // Price in base currency
	marketCap: decimal("market_cap", { precision: 42, scale: 2 }).notNull(),
	volume24h: decimal("volume_24h", { precision: 42, scale: 2 }).default("0.00"),
	change24h: decimal("change_24h", { precision: 14, scale: 4 }).default("0.0000"), // Percentage, capped at ±9,999,999.9999
	poolCoinAmount: decimal("pool_coin_amount", { precision: 30, scale: 8 }).notNull().default("0.00000000"),
	poolBaseCurrencyAmount: decimal("pool_base_currency_amount", { precision: 30, scale: 8, }).notNull().default("0.00000000"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	isListed: boolean("is_listed").default(true).notNull(),
	tradingUnlocksAt: timestamp("trading_unlocks_at"),
	isLocked: boolean("is_locked").default(true).notNull(),
}, (table) => {
	return {
		creatorIdIdx: index("coin_creator_id_idx").on(table.creatorId),
		isListedIdx: index("coin_is_listed_idx").on(table.isListed),
		nameTrgmIdx: index("coin_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops")),
		symbolTrgmIdx: index("coin_symbol_trgm_idx").using("gin", table.symbol.op("gin_trgm_ops")),
		marketCapIdx: index("coin_market_cap_idx").on(table.marketCap),
		currentPriceIdx: index("coin_current_price_idx").on(table.currentPrice),
		change24hIdx: index("coin_change24h_idx").on(table.change24h),
		volume24hIdx: index("coin_volume24h_idx").on(table.volume24h),
		createdAtIdx: index("coin_created_at_idx").on(table.createdAt),
	};
});

export const userPortfolio = pgTable("user_portfolio", {
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	quantity: decimal("quantity", { precision: 30, scale: 8 }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.coinId] }),
			coinIdQuantityIdx: index("user_portfolio_coin_id_quantity_idx").on(table.coinId, table.quantity.desc()),
		};
	},
);

export const transaction = pgTable("transaction", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => user.id, { onDelete: "set null" }),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	type: transactionTypeEnum("type").notNull(),
	quantity: decimal("quantity", { precision: 30, scale: 8 }).notNull(),
	pricePerCoin: decimal("price_per_coin", { precision: 30, scale: 8 }).notNull(),
	totalBaseCurrencyAmount: decimal("total_base_currency_amount", { precision: 30, scale: 8 }).notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
	recipientUserId: integer('recipient_user_id').references(() => user.id, { onDelete: 'set null' }),
	senderUserId: integer('sender_user_id').references(() => user.id, { onDelete: 'set null' }),
}, (table) => {
	return {
		userIdIdx: index("transaction_user_id_idx").on(table.userId),
		typeIdx: index("transaction_type_idx").on(table.type),
		timestampIdx: index("transaction_timestamp_idx").on(table.timestamp),
		userCoinIdx: index("transaction_user_coin_idx").on(table.userId, table.coinId),
		coinTypeIdx: index("transaction_coin_type_idx").on(table.coinId, table.type),
		coinTimestampIdx: index("transaction_coin_id_timestamp_idx").on(table.coinId, table.timestamp),
	};
});

export const priceHistory = pgTable("price_history", {
	id: serial("id").primaryKey(),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	price: decimal("price", { precision: 30, scale: 8 }).notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		coinIdTimestampIdx: index("price_history_coin_id_timestamp_idx").on(table.coinId, table.timestamp),
	};
});

export const comment = pgTable("comment", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => user.id, { onDelete: "set null" }),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	content: varchar("content", { length: 500 }).notNull(),
	likesCount: integer("likes_count").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
}, (table) => {
	return {
		userIdIdx: index("comment_user_id_idx").on(table.userId),
		coinIdIdx: index("comment_coin_id_idx").on(table.coinId),
	};
});

export const commentLike = pgTable("comment_like", {
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	commentId: integer("comment_id").notNull().references(() => comment.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		pk: primaryKey({ columns: [table.userId, table.commentId] }),
	};
});

export const promoCode = pgTable('promo_code', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 50 }).notNull().unique(),
	description: text('description'),
	rewardAmount: decimal('reward_amount', { precision: 30, scale: 8 }).notNull(),
	maxUses: integer('max_uses'), // null = unlimited
	isActive: boolean('is_active').notNull().default(true),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	createdBy: integer('created_by').references(() => user.id, { onDelete: "set null" }),
});

export const promoCodeRedemption = pgTable('promo_code_redemption', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => user.id, { onDelete: "cascade" }),
	promoCodeId: integer('promo_code_id').notNull().references(() => promoCode.id),
	rewardAmount: decimal('reward_amount', { precision: 30, scale: 8 }).notNull(),
	redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	userPromoUnique: unique().on(table.userId, table.promoCodeId),
}));

export const predictionQuestion = pgTable("prediction_question", {
	id: serial("id").primaryKey(),
	creatorId: integer("creator_id").references(() => user.id, { onDelete: "set null" }),
	question: varchar("question", { length: 200 }).notNull(),
	status: predictionMarketEnum("status").notNull().default("ACTIVE"),
	resolutionDate: timestamp("resolution_date", { withTimezone: true }).notNull(),
	aiResolution: boolean("ai_resolution"), // true = YES, false = NO, null = unresolved
	totalYesAmount: decimal("total_yes_amount", { precision: 30, scale: 8 }).notNull().default("0.00000000"),
	totalNoAmount: decimal("total_no_amount", { precision: 30, scale: 8 }).notNull().default("0.00000000"),

	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true }),

	requiresWebSearch: boolean("requires_web_search").notNull().default(false),
	validationReason: text("validation_reason"),
}, (table) => {
	return {
		creatorIdIdx: index("prediction_question_creator_id_idx").on(table.creatorId),
		statusIdx: index("prediction_question_status_idx").on(table.status),
		resolutionDateIdx: index("prediction_question_resolution_date_idx").on(table.resolutionDate),
		statusResolutionIdx: index("prediction_question_status_resolution_idx").on(table.status, table.resolutionDate),
	};
});

export const predictionBet = pgTable("prediction_bet", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => user.id, { onDelete: "set null" }),
	questionId: integer("question_id").notNull().references(() => predictionQuestion.id, { onDelete: "cascade" }),
	side: boolean("side").notNull(), // true = YES, false = NO
	amount: decimal("amount", { precision: 30, scale: 8 }).notNull(),
	actualWinnings: decimal("actual_winnings", { precision: 30, scale: 8 }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	settledAt: timestamp("settled_at", { withTimezone: true }),
}, (table) => {
	return {
		userIdIdx: index("prediction_bet_user_id_idx").on(table.userId),
		questionIdIdx: index("prediction_bet_question_id_idx").on(table.questionId),
		userQuestionIdx: index("prediction_bet_user_question_idx").on(table.userId, table.questionId),
		createdAtIdx: index("prediction_bet_created_at_idx").on(table.createdAt),
	};
});

export const accountDeletionRequest = pgTable("account_deletion_request", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }).unique(),
	requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
	scheduledDeletionAt: timestamp("scheduled_deletion_at", { withTimezone: true }).notNull(),
	reason: text("reason"),
	isProcessed: boolean("is_processed").notNull().default(false),
}, (table) => {
	return {
		userIdIdx: index("account_deletion_request_user_id_idx").on(table.userId),
		scheduledDeletionIdx: index("account_deletion_request_scheduled_deletion_idx").on(table.scheduledDeletionAt),
		oneOpenRequest: index("account_deletion_request_open_idx")
			.on(table.userId)
			.where(sql`is_processed = false`),
	};
});

export const notifications = pgTable("notification", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	type: notificationTypeEnum("type").notNull(),
	title: varchar("title", { length: 200 }).notNull(),
	message: text("message").notNull(),
	link: text("link"),
	isRead: boolean("is_read").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		typeIdx: index("notification_type_idx").on(table.type),
		isReadIdx: index("notification_is_read_idx").on(table.isRead),
		createdAtIdx: index("notification_created_at_idx").on(table.createdAt),
		userIdCreatedAtIdx: index("notification_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
		userUnreadIdx: index("notification_user_unread_idx").on(table.userId).where(sql`is_read = false`),
	};
});

export const apikey = pgTable("apikey", {
	id: serial("id").primaryKey(),
	name: text('name'),
	start: text('start'),
	prefix: text('prefix'),
	key: text('key').notNull(),
	userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	refillInterval: integer('refill_interval'),
	refillAmount: integer('refill_amount'),
	lastRefillAt: timestamp('last_refill_at'),
	enabled: boolean('enabled'),
	rateLimitEnabled: boolean('rate_limit_enabled'),
	rateLimitTimeWindow: integer('rate_limit_time_window'),
	rateLimitMax: integer('rate_limit_max'),
	requestCount: integer('request_count'),
	remaining: integer('remaining'),
	lastRequest: timestamp('last_request'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	permissions: text('permissions'),
	metadata: text('metadata')
}, (table) => ({
	userIdx: index("idx_apikey_user").on(table.userId),
	keyIdx: index("idx_apikey_key").on(table.key)
}));

export const gemTransactions = pgTable("gem_transactions", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	polarOrderId: varchar("polar_order_id", { length: 100 }).notNull().unique(),
	gemsAmount: integer("gems_amount").notNull(),
	usdAmount: integer("usd_amount").notNull(), // in cents
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	userIdIdx: index("gem_transactions_user_id_idx").on(table.userId),
}));

export const userInventory = pgTable("user_inventory", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	itemType: shopItemTypeEnum("item_type").notNull(),
	itemKey: varchar("item_key", { length: 100 }).notNull(),
	purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	userItemUnique: unique("user_inventory_unique").on(table.userId, table.itemType, table.itemKey),
	userIdIdx: index("user_inventory_user_id_idx").on(table.userId),
}));

export const userAchievement = pgTable("user_achievement", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	achievementId: varchar("achievement_id", { length: 50 }).notNull(),
	unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
	claimed: boolean("claimed").notNull().default(false),
}, (table) => ({
	userAchievementUnique: unique("user_achievement_unique").on(table.userId, table.achievementId),
	userIdIdx: index("user_achievement_user_id_idx").on(table.userId),
	achievementIdIdx: index("user_achievement_achievement_id_idx").on(table.achievementId),
}));

export const season = pgTable("season", {
	id: serial("id").primaryKey(),
	number: integer("number").notNull().unique(),
	name: varchar("name", { length: 80 }).notNull(),
	backgroundImage: varchar("background_image", { length: 2048 }),
	status: seasonStatusEnum("status").notNull().default('UPCOMING'),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	rankedStake: decimal("ranked_stake", { precision: 30, scale: 8 }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		statusIdx: index("season_status_idx").on(table.status),
		endsAtIdx: index("season_ends_at_idx").on(table.endsAt),
	};
});

export const seasonParticipant = pgTable("season_participant", {
	id: serial("id").primaryKey(),
	seasonId: integer("season_id").notNull().references(() => season.id, { onDelete: "cascade" }),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
	prestigeAtEntry: integer("prestige_at_entry").notNull().default(0),
	scoreMultiplier: decimal("score_multiplier", { precision: 6, scale: 4 }).notNull().default("1.0000"),
	startingStake: decimal("starting_stake", { precision: 30, scale: 8 }).notNull(),
	sacrificed: decimal("sacrificed", { precision: 30, scale: 8 }).notNull().default("0.00000000"),
	finalScore: decimal("final_score", { precision: 42, scale: 8 }),
	finalRank: integer("final_rank"),
}, (table) => {
	return {
		seasonUserUnique: unique("season_participant_unique").on(table.seasonId, table.userId),
		seasonIdIdx: index("season_participant_season_id_idx").on(table.seasonId),
		userIdIdx: index("season_participant_user_id_idx").on(table.userId),
	};
});

export const seasonTrophy = pgTable("season_trophy", {
	id: serial("id").primaryKey(),
	seasonId: integer("season_id").notNull().references(() => season.id, { onDelete: "cascade" }),
	userId: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	rank: integer("rank").notNull(),
	tier: seasonTrophyTierEnum("tier").notNull(),
	score: decimal("score", { precision: 42, scale: 8 }).notNull(),
	awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
	return {
		seasonUserUnique: unique("season_trophy_unique").on(table.seasonId, table.userId),
		userIdIdx: index("season_trophy_user_id_idx").on(table.userId),
		seasonIdIdx: index("season_trophy_season_id_idx").on(table.seasonId),
	};
});

export const userBlock = pgTable("user_block", {
	id: serial("id").primaryKey(),
	blockerId: integer("blocker_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	blockedId: integer("blocked_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
	blockerBlockedUnique: unique("user_block_unique").on(table.blockerId, table.blockedId),
	blockerIdIdx: index("user_block_blocker_id_idx").on(table.blockerId),
	blockedIdIdx: index("user_block_blocked_id_idx").on(table.blockedId),
	noSelfBlock: check("no_self_block", sql`blocker_id != blocked_id`),
}));

export const newsArticle = pgTable(
	'news_article',
	{
		id: serial('id').primaryKey(),
		type: newsArticleTypeEnum('type').notNull(),
		source: newsArticleSourceEnum('source').notNull().default('TEMPLATE'),

		headline: varchar('headline', { length: 160 }).notNull(),
		// Short one-liner shown in compact/feed layout cards.
		summary: varchar('summary', { length: 280 }).notNull(),
		// Longer body shown in magazine layout / article detail view.
		// Markdown-lite: plain text + line breaks, sanitized on render.
		body: text('body').notNull(),

		// Optional cover image. Either an internal object-storage key
		// (resolved through getPublicUrl, same as coin.icon / user.image)
		// or a full https URL to a royalty-free stock image.
		coverImage: text('cover_image'),
		coverImageAttribution: varchar('cover_image_attribution', { length: 200 }),

		// Loose references so a card can render a coin icon / user avatar
		// inline without a join fan-out. Nullable — not every article type
		// has all of these.
		relatedCoinId: integer('related_coin_id').references(() => coin.id, { onDelete: 'set null' }),
		relatedUserId: integer('related_user_id').references(() => user.id, { onDelete: 'set null' }),
		relatedQuestionId: integer('related_question_id').references(() => predictionQuestion.id, {
			onDelete: 'set null'
		}),

		// Snapshot of key numbers at generation time, so cards don't need to
		// re-derive "crashed 42%" style stats later (coin price keeps moving).
		// e.g. { "priceImpact": -42.1, "amount": 15000, "symbol": "DOGE2" }
		metadata: text('metadata'), // JSON string, kept as text for portability

		// Denormalized counters, updated on react/unreact for fast feed sorting
		// (avoids a COUNT(*) join on every feed request).
		likesCount: integer('likes_count').notNull().default(0),
		dislikesCount: integer('dislikes_count').notNull().default(0),
		sharesCount: integer('shares_count').notNull().default(0),
		viewsCount: integer('views_count').notNull().default(0),

		// Pre-computed relevance score for the "trending" sort, refreshed
		// periodically by a small job (see news/ranking.ts). Kept separate
		// from the per-request personalized score, which also factors in
		// the requesting user's holdings and is computed on read.
		trendingScore: decimal('trending_score', { precision: 12, scale: 4 }).notNull().default('0'),

		isPinned: boolean('is_pinned').notNull().default(false),
		isHidden: boolean('is_hidden').notNull().default(false), // soft-hide after reports

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			typeIdx: index('news_article_type_idx').on(table.type),
			createdAtIdx: index('news_article_created_at_idx').on(table.createdAt.desc()),
			trendingIdx: index('news_article_trending_idx').on(table.trendingScore.desc()),
			relatedCoinIdx: index('news_article_related_coin_idx').on(table.relatedCoinId),
			relatedUserIdx: index('news_article_related_user_idx').on(table.relatedUserId),
			visibleFeedIdx: index('news_article_visible_feed_idx')
				.on(table.isHidden, table.createdAt.desc())
		};
	}
);

export const newsArticleReaction = pgTable(
	'news_article_reaction',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		articleId: integer('article_id')
			.notNull()
			.references(() => newsArticle.id, { onDelete: 'cascade' }),
		type: newsReactionTypeEnum('type').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.articleId] }),
			articleIdIdx: index('news_article_reaction_article_id_idx').on(table.articleId)
		};
	}
);

export const newsArticleReport = pgTable(
	'news_article_report',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		articleId: integer('article_id')
			.notNull()
			.references(() => newsArticle.id, { onDelete: 'cascade' }),
		reason: varchar('reason', { length: 300 }),
		status: newsReportStatusEnum('status').notNull().default('OPEN'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			// A user can report a given article only once.
			userArticleUnique: unique('news_article_report_user_article_unique').on(
				table.userId,
				table.articleId
			),
			statusIdx: index('news_article_report_status_idx').on(table.status)
		};
	}
);

// Per-user view/dwell-time log, the core signal for personalized ranking.
// One row per (user, article): repeated views update the same row rather
// than appending, since what matters for personalization is "how long has
// this user, in total, actually looked at this article" not a raw hit
// count (viewsCount on news_article already covers raw popularity).
//
// dwellMs is reported by the client in two ways: an IntersectionObserver
// in the feed accumulates time-visible for each card as the user scrolls
// past it, and the article detail page accumulates time-on-page. Both
// flush via navigator.sendBeacon on unload/navigate so the number is
// real even if the user closes the tab mid-read, and both are best-effort
// — a lost beacon just means that one visit doesn't contribute, it never
// blocks anything.
export const newsArticleView = pgTable(
	'news_article_view',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		articleId: integer('article_id')
			.notNull()
			.references(() => newsArticle.id, { onDelete: 'cascade' }),
		// Cumulative milliseconds this user has spent with the article
		// visible, across every visit. Capped client-side (see
		// lib/utils/news-dwell.ts) and per-request server-side (see
		// routes/api/news/[id]/view) so a stuck tab can't inflate this
		// indefinitely.
		dwellMs: integer('dwell_ms').notNull().default(0),
		viewCount: integer('view_count').notNull().default(1),
		lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.articleId] }),
			articleIdIdx: index('news_article_view_article_id_idx').on(table.articleId),
			// Used to build each user's affinity profile (see news/ranking.ts):
			// "what has this person actually spent time reading lately".
			userLastViewedIdx: index('news_article_view_user_last_viewed_idx').on(
				table.userId,
				table.lastViewedAt.desc()
			)
		};
	}
);

// Per-user share log. news_article.sharesCount stays as the fast global
// counter for the feed card; this table exists so shares can also count
// as a strong positive signal in a specific user's affinity profile,
// same as a like but weighted higher (sharing is a more deliberate,
// costlier action than a tap).
export const newsArticleShare = pgTable(
	'news_article_share',
	{
		id: serial('id').primaryKey(),
		userId: integer('user_id').references(() => user.id, { onDelete: 'set null' }),
		articleId: integer('article_id')
			.notNull()
			.references(() => newsArticle.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => {
		return {
			articleIdIdx: index('news_article_share_article_id_idx').on(table.articleId),
			userIdIdx: index('news_article_share_user_id_idx').on(table.userId)
		};
	}
);
