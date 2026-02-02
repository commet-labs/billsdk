CREATE TABLE "time_travel_state" (
	"id" text NOT NULL,
	"simulated_time" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "customer" ALTER COLUMN "external_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "customer_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "subscription_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "customer_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "scheduled_plan_code" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "scheduled_interval" text;