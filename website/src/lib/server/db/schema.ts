import { pgTable, text, timestamp, boolean, decimal, serial, varchar, integer, primaryKey, pgEnum, index, unique, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const transactionTypeEnum = pgEnum('transaction_type', ['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT']);
export const predictionMarketEnum = pgEnum('prediction_market_status', ['ACTIVE', 'RESOLVED', 'CANCELLED']);

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
		precision: 20,
		scale: 8,
	}).notNull().default("100.00000000"), // $100
	bio: varchar("bio", { length: 160 }).default("Hello am 48 year old man from somalia. Sorry for my bed england. I selled my wife for internet connection for play “conter stirk”"),
	username: varchar("username", { length: 30 }).notNull().unique(),

	volumeMaster: decimal("volume_master", { precision: 3, scale: 2 }).notNull().default("0.70"),
	volumeMuted: boolean("volume_muted").notNull().default(false),

	lastRewardClaim: timestamp("last_reward_claim", { withTimezone: true }),
	totalRewardsClaimed: decimal("total_rewards_claimed", {
		precision: 20,
		scale: 8,
	}).notNull().default("0.00000000"),
	loginStreak: integer("login_streak").notNull().default(0)
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
	currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(), // Price in base currency
	marketCap: decimal("market_cap", { precision: 30, scale: 2 }).notNull(),
	volume24h: decimal("volume_24h", { precision: 30, scale: 2 }).default("0.00"),
	change24h: decimal("change_24h", { precision: 30, scale: 4 }).default("0.0000"), // Percentage
	poolCoinAmount: decimal("pool_coin_amount", { precision: 30, scale: 8 }).notNull().default("0.00000000"),
	poolBaseCurrencyAmount: decimal("pool_base_currency_amount", { precision: 30, scale: 8, }).notNull().default("0.00000000"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	isListed: boolean("is_listed").default(true).notNull(),
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
		};
	},
);

export const transaction = pgTable("transaction", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => user.id, { onDelete: "set null" }),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	type: transactionTypeEnum("type").notNull(),
	quantity: decimal("quantity", { precision: 30, scale: 8 }).notNull(),
	pricePerCoin: decimal("price_per_coin", { precision: 20, scale: 8 }).notNull(),
	totalBaseCurrencyAmount: decimal("total_base_currency_amount", { precision: 30, scale: 8 }).notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
	recipientUserId: integer('recipient_user_id').references(() => user.id, { onDelete: 'set null' }),
	senderUserId: integer('sender_user_id').references(() => user.id, { onDelete: 'set null' }),
});

export const priceHistory = pgTable("price_history", {
	id: serial("id").primaryKey(),
	coinId: integer("coin_id").notNull().references(() => coin.id, { onDelete: "cascade" }),
	price: decimal("price", { precision: 20, scale: 8 }).notNull(),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
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
	rewardAmount: decimal('reward_amount', { precision: 20, scale: 8 }).notNull(),
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
	rewardAmount: decimal('reward_amount', { precision: 20, scale: 8 }).notNull(),
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
	totalYesAmount: decimal("total_yes_amount", { precision: 20, scale: 8 }).notNull().default("0.00000000"),
	totalNoAmount: decimal("total_no_amount", { precision: 20, scale: 8 }).notNull().default("0.00000000"),

	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true }),

	requiresWebSearch: boolean("requires_web_search").notNull().default(false),
	validationReason: text("validation_reason"),
}, (table) => {
	return {
		creatorIdIdx: index("prediction_question_creator_id_idx").on(table.creatorId),
		statusIdx: index("prediction_question_status_idx").on(table.status),
		resolutionDateIdx: index("prediction_question_resolution_date_idx").on(table.resolutionDate),
	};
});

export const predictionBet = pgTable("prediction_bet", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").references(() => user.id, { onDelete: "set null" }),
	questionId: integer("question_id").notNull().references(() => predictionQuestion.id, { onDelete: "cascade" }),
	side: boolean("side").notNull(), // true = YES, false = NO
	amount: decimal("amount", { precision: 20, scale: 8 }).notNull(),
	actualWinnings: decimal("actual_winnings", { precision: 20, scale: 8 }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	settledAt: timestamp("settled_at", { withTimezone: true }),
}, (table) => {
	return {
		userIdIdx: index("prediction_bet_user_id_idx").on(table.userId),
		questionIdIdx: index("prediction_bet_question_id_idx").on(table.questionId),
		userQuestionIdx: index("prediction_bet_user_question_idx").on(table.userId, table.questionId),
		createdAtIdx: index("prediction_bet_created_at_idx").on(table.createdAt),
		amountCheck: check("amount_positive", sql`amount > 0`),
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