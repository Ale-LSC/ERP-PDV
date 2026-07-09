CREATE TYPE "public"."company_module" AS ENUM(
  'dashboard',
  'team',
  'customers',
  'products',
  'inventory',
  'purchases',
  'finance',
  'pdv',
  'cash',
  'reports',
  'promotions',
  'fiscal',
  'expiry_control',
  'production',
  'bom',
  'mrp',
  'quality',
  'service_orders',
  'appointments',
  'contracts'
);

CREATE TABLE "company_enabled_modules" (
  "company_id" uuid NOT NULL,
  "module" "company_module" NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "company_enabled_modules_company_id_module_pk" PRIMARY KEY("company_id","module"),
  CONSTRAINT "company_enabled_modules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);

INSERT INTO "company_enabled_modules" ("company_id", "module")
SELECT "id", unnest(
  CASE "segment"
    WHEN 'market' THEN ARRAY[
      'dashboard',
      'team',
      'customers',
      'products',
      'inventory',
      'purchases',
      'finance',
      'reports',
      'pdv',
      'cash',
      'promotions',
      'fiscal',
      'expiry_control'
    ]::company_module[]
    WHEN 'industry' THEN ARRAY[
      'dashboard',
      'team',
      'customers',
      'products',
      'inventory',
      'purchases',
      'finance',
      'reports',
      'production',
      'bom',
      'mrp',
      'quality',
      'fiscal'
    ]::company_module[]
    WHEN 'retail' THEN ARRAY[
      'dashboard',
      'team',
      'customers',
      'products',
      'inventory',
      'purchases',
      'finance',
      'reports',
      'pdv',
      'cash',
      'promotions',
      'fiscal'
    ]::company_module[]
    WHEN 'services' THEN ARRAY[
      'dashboard',
      'team',
      'customers',
      'finance',
      'reports',
      'service_orders',
      'appointments',
      'contracts',
      'products',
      'inventory'
    ]::company_module[]
    ELSE ARRAY[
      'dashboard',
      'team',
      'customers',
      'products',
      'inventory',
      'purchases',
      'finance',
      'reports'
    ]::company_module[]
  END
)
FROM "companies"
ON CONFLICT DO NOTHING;
