ALTER TABLE "coin" ALTER COLUMN "current_price" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "prediction_bet" ALTER COLUMN "amount" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "prediction_bet" ALTER COLUMN "actual_winnings" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "prediction_question" ALTER COLUMN "total_yes_amount" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "prediction_question" ALTER COLUMN "total_yes_amount" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "prediction_question" ALTER COLUMN "total_no_amount" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "prediction_question" ALTER COLUMN "total_no_amount" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "price_history" ALTER COLUMN "price" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "promo_code" ALTER COLUMN "reward_amount" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "promo_code_redemption" ALTER COLUMN "reward_amount" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "price_per_coin" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "base_currency_balance" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "base_currency_balance" SET DEFAULT '100.00000000';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "total_rewards_claimed" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "total_rewards_claimed" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "gambling_losses" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "gambling_losses" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "gambling_wins" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "gambling_wins" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "total_arcade_wagered" SET DATA TYPE numeric(30, 8);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "total_arcade_wagered" SET DEFAULT '0.00000000';--> statement-breakpoint
ALTER TABLE "user_achievement" ADD COLUMN "claimed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "prediction_bet" ADD CONSTRAINT "amount_positive" CHECK (amount > 0);