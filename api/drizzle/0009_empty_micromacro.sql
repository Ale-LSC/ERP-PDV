CREATE TABLE "branch_users" (
	"branch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branch_users_branch_id_user_id_pk" PRIMARY KEY("branch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"code" varchar(30) NOT NULL,
	"address" varchar(240),
	"is_headquarters" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_users" ADD CONSTRAINT "branch_users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_users" ADD CONSTRAINT "branch_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_company_code_unique" ON "branches" USING btree ("company_id","code");
--> statement-breakpoint
INSERT INTO "branches" ("company_id", "name", "code", "is_headquarters")
SELECT "id", 'Matriz', 'MATRIZ', true FROM "companies";
--> statement-breakpoint
INSERT INTO "branch_users" ("branch_id", "user_id")
SELECT b."id", cu."user_id"
FROM "branches" b
JOIN "company_users" cu ON cu."company_id" = b."company_id"
WHERE b."is_headquarters" = true;
