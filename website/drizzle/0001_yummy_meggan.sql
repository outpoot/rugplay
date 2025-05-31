ALTER TYPE "transaction_type" ADD VALUE 'TRANSFER_IN';--> statement-breakpoint
ALTER TYPE "transaction_type" ADD VALUE 'TRANSFER_OUT';--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "recipient_user_id" integer;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "sender_user_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction" ADD CONSTRAINT "transaction_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
