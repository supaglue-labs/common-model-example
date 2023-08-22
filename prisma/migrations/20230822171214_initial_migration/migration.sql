-- CreateTable
CREATE TABLE "sync_states" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "objectType" TEXT,
    "object" TEXT,
    "entityId" TEXT,
    "maxLastModifiedAt" TIMESTAMP(3),

    CONSTRAINT "sync_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL,
    "last_modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "number_of_employees" INTEGER,
    "addresses" JSONB,
    "phone_numbers" JSONB,
    "lifecycle_stage" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL,
    "last_modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "addresses" JSONB,
    "email_addresses" JSONB,
    "phone_numbers" JSONB,
    "lifecycle_stage" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL,
    "last_modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "owner_id" TEXT,
    "title" TEXT,
    "company" TEXT,
    "converted_date" TIMESTAMP(3),
    "lead_source" TEXT,
    "converted_account_id" TEXT,
    "converted_contact_id" TEXT,
    "addresses" JSONB,
    "email_addresses" JSONB,
    "phone_numbers" JSONB,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL,
    "last_modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT,
    "status" TEXT,
    "stage" TEXT,
    "close_date" TIMESTAMP(3),
    "account_id" TEXT NOT NULL,
    "pipeline" TEXT,
    "amount" BIGINT,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL,
    "last_modified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_type_objectType_object_key" ON "sync_states"("type", "objectType", "object");

-- CreateIndex
CREATE UNIQUE INDEX "sync_states_type_entityId_key" ON "sync_states"("type", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_customer_id_id_provider_name_key" ON "users"("customer_id", "id", "provider_name");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_customer_id_id_provider_name_key" ON "accounts"("customer_id", "id", "provider_name");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_customer_id_id_provider_name_key" ON "contacts"("customer_id", "id", "provider_name");

-- CreateIndex
CREATE UNIQUE INDEX "leads_customer_id_id_provider_name_key" ON "leads"("customer_id", "id", "provider_name");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_customer_id_id_provider_name_key" ON "opportunities"("customer_id", "id", "provider_name");
