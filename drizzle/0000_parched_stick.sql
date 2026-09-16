CREATE TYPE "public"."adoption_source" AS ENUM('own', 'shelter_import');--> statement-breakpoint
CREATE TYPE "public"."adoption_status" AS ENUM('open', 'pending', 'closed');--> statement-breakpoint
CREATE TYPE "public"."allocation_reason" AS ENUM('note_match', 'manual', 'expense', 'carry_forward', 'surplus_to_general', 'top_up_from_general', 'correction');--> statement-breakpoint
CREATE TYPE "public"."animal_status" AS ENUM('street', 'in_treatment', 'adoptable', 'adopted', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."attachment_kind" AS ENUM('receipt', 'invoice', 'photo', 'document');--> statement-breakpoint
CREATE TYPE "public"."campaign_kind" AS ENUM('one_off', 'recurring', 'general');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'funded', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('offered', 'accepted', 'declined', 'done');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."species" AS ENUM('dog', 'cat', 'other');--> statement-breakpoint
CREATE TYPE "public"."tx_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."tx_source" AS ENUM('manual', 'import', 'gateway');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"diff" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"original_name" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_storageKey_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "adoption_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"status" "adoption_status" DEFAULT 'open' NOT NULL,
	"contact" text NOT NULL,
	"source" "adoption_source" DEFAULT 'own' NOT NULL,
	"external_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animal_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "animals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"species" "species" NOT NULL,
	"sex" text,
	"approx_birth_year" integer,
	"status" "animal_status" DEFAULT 'street' NOT NULL,
	"bio" jsonb NOT NULL,
	"location" text,
	"cover_attachment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "animals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vet_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"clinic_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"website" text,
	"description" jsonb,
	"referral_consent" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vet_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vet_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"service" jsonb NOT NULL,
	"amount_kurus" bigint NOT NULL,
	"quoted_at" date NOT NULL,
	"valid_until" date,
	"document_attachment_id" uuid,
	"status" "quote_status" DEFAULT 'offered' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"target_kurus" bigint NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_periods_target_positive" CHECK ("campaign_periods"."target_kurus" > 0),
	CONSTRAINT "campaign_periods_order" CHECK ("campaign_periods"."period_end" > "campaign_periods"."period_start")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" "campaign_kind" NOT NULL,
	"animal_id" uuid,
	"title" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"target_kurus" bigint,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"accepted_quote_id" uuid,
	"closing_note" jsonb,
	"opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "campaigns_target_positive" CHECK ("campaigns"."target_kurus" IS NULL OR "campaigns"."target_kurus" > 0),
	CONSTRAINT "campaigns_general_has_no_target" CHECK ("campaigns"."kind" <> 'general' OR "campaigns"."target_kurus" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"period_id" uuid,
	"amount_kurus" bigint NOT NULL,
	"reason" "allocation_reason" NOT NULL,
	"transaction_id" uuid,
	"transfer_group_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allocations_nonzero" CHECK ("allocations"."amount_kurus" <> 0),
	CONSTRAINT "allocations_source_xor" CHECK (("allocations"."transaction_id" IS NULL) <> ("allocations"."transfer_group_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "tx_direction" NOT NULL,
	"amount_kurus" bigint NOT NULL,
	"currency" text DEFAULT 'TRY' NOT NULL,
	"occurred_at" date NOT NULL,
	"raw_note" text,
	"display_name" text,
	"source" "tx_source" DEFAULT 'manual' NOT NULL,
	"receipt_attachment_id" uuid,
	"redaction_confirmed" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"entered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount_kurus" > 0),
	CONSTRAINT "transactions_publish_requires_redacted_receipt" CHECK ("transactions"."published" = false OR ("transactions"."receipt_attachment_id" IS NOT NULL AND "transactions"."redaction_confirmed" = true))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"animal_id" uuid,
	"campaign_id" uuid,
	"cover_attachment_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_admin_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_listings" ADD CONSTRAINT "adoption_listings_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animal_photos" ADD CONSTRAINT "animal_photos_attachment_id_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "animals" ADD CONSTRAINT "animals_cover_attachment_id_attachments_id_fk" FOREIGN KEY ("cover_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_quotes" ADD CONSTRAINT "vet_quotes_vet_id_vet_partners_id_fk" FOREIGN KEY ("vet_id") REFERENCES "public"."vet_partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_quotes" ADD CONSTRAINT "vet_quotes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_quotes" ADD CONSTRAINT "vet_quotes_document_attachment_id_attachments_id_fk" FOREIGN KEY ("document_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_periods" ADD CONSTRAINT "campaign_periods_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_accepted_quote_id_vet_quotes_id_fk" FOREIGN KEY ("accepted_quote_id") REFERENCES "public"."vet_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_period_id_campaign_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."campaign_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receipt_attachment_id_attachments_id_fk" FOREIGN KEY ("receipt_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_entered_by_admin_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_animal_id_animals_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."animals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_attachment_id_attachments_id_fk" FOREIGN KEY ("cover_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vet_quotes_one_accepted_per_campaign" ON "vet_quotes" USING btree ("campaign_id") WHERE "vet_quotes"."status" = 'accepted';--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_periods_unique_start" ON "campaign_periods" USING btree ("campaign_id","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_single_general" ON "campaigns" USING btree ("kind") WHERE "campaigns"."kind" = 'general';--> statement-breakpoint
CREATE INDEX "allocations_campaign_idx" ON "allocations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "allocations_period_idx" ON "allocations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "allocations_transaction_idx" ON "allocations" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "allocations_transfer_group_idx" ON "allocations" USING btree ("transfer_group_id");--> statement-breakpoint
CREATE INDEX "transactions_occurred_at_idx" ON "transactions" USING btree ("occurred_at");