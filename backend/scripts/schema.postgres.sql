CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE enum_users_role AS ENUM ('landlord', 'tenant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_properties_propertyType AS ENUM ('apartment', 'house', 'condo', 'townhouse', 'commercial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_units_status AS ENUM ('vacant', 'occupied', 'maintenance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_leases_status AS ENUM ('pending', 'active', 'expired', 'terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_payments_paymentType AS ENUM ('rent', 'deposit', 'late_fee', 'maintenance', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_payments_paymentMethod AS ENUM ('card', 'bank_transfer', 'cash', 'check', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_payments_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_messages_messageType AS ENUM ('text', 'image', 'file', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_notifications_type AS ENUM ('payment_reminder', 'payment_received', 'payment_overdue', 'lease_expiring', 'new_message', 'maintenance_update', 'announcement', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_maintenance_requests_category AS ENUM ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_maintenance_requests_priority AS ENUM ('low', 'medium', 'high', 'emergency'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE enum_maintenance_requests_status AS ENUM ('pending', 'in_progress', 'scheduled', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  phone VARCHAR(255),
  role enum_users_role NOT NULL DEFAULT 'tenant',
  "profileImage" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT true,
  "lastLoginAt" TIMESTAMPTZ,
  "pushToken" VARCHAR(255),
  "mustChangePassword" BOOLEAN DEFAULT false,
  "notificationPreferences" JSONB DEFAULT '{"email":true,"push":true,"sms":false}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  "zipCode" VARCHAR(255) NOT NULL,
  country VARCHAR(255) DEFAULT 'USA',
  "propertyType" enum_properties_propertyType NOT NULL,
  "unitCount" INTEGER DEFAULT 1,
  description TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "propertyId" UUID NOT NULL REFERENCES properties(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "unitNumber" VARCHAR(255) NOT NULL,
  floor INTEGER,
  bedrooms INTEGER NOT NULL,
  bathrooms NUMERIC(3, 1) NOT NULL,
  "squareFeet" INTEGER,
  "rentAmount" NUMERIC(10, 2) NOT NULL,
  "depositAmount" NUMERIC(10, 2),
  status enum_units_status DEFAULT 'vacant',
  features JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "unitId" UUID NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "tenantId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "landlordId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "monthlyRent" NUMERIC(10, 2) NOT NULL,
  "securityDeposit" NUMERIC(10, 2),
  "paymentDueDay" INTEGER DEFAULT 1,
  "lateFeeAmount" NUMERIC(10, 2) DEFAULT 0,
  "lateFeeGracePeriod" INTEGER DEFAULT 5,
  status enum_leases_status DEFAULT 'pending',
  terms TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  "autoRenew" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "leaseId" UUID NOT NULL REFERENCES leases(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "tenantId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "landlordId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL,
  "lateFee" NUMERIC(10, 2) DEFAULT 0,
  "totalAmount" NUMERIC(10, 2) NOT NULL,
  "paymentType" enum_payments_paymentType DEFAULT 'rent',
  "paymentMethod" enum_payments_paymentMethod,
  status enum_payments_status DEFAULT 'pending',
  "dueDate" DATE NOT NULL,
  "paidAt" TIMESTAMPTZ,
  "stripePaymentIntentId" VARCHAR(255),
  "stripeChargeId" VARCHAR(255),
  "receiptUrl" VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "landlordId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "tenantId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "propertyId" UUID REFERENCES properties(id) ON UPDATE CASCADE ON DELETE SET NULL,
  subject VARCHAR(255),
  "lastMessageAt" TIMESTAMPTZ,
  "lastMessagePreview" VARCHAR(255),
  "isArchived" BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "senderId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  content TEXT NOT NULL,
  "messageType" enum_messages_messageType DEFAULT 'text',
  attachments JSONB DEFAULT '[]'::jsonb,
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  type enum_notifications_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMPTZ,
  "sentVia" JSONB DEFAULT '{"push":false,"email":false,"sms":false}'::jsonb,
  "scheduledFor" TIMESTAMPTZ,
  "sentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "unitId" UUID NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "tenantId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  "landlordId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category enum_maintenance_requests_category NOT NULL,
  priority enum_maintenance_requests_priority DEFAULT 'medium',
  status enum_maintenance_requests_status DEFAULT 'pending',
  images JSONB DEFAULT '[]'::jsonb,
  "scheduledDate" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  notes TEXT,
  cost NUMERIC(10, 2),
  "vendorInfo" JSONB DEFAULT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties("landlordId");
CREATE INDEX IF NOT EXISTS idx_units_property ON units("propertyId");
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases("tenantId");
CREATE INDEX IF NOT EXISTS idx_leases_landlord ON leases("landlordId");
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments("tenantId", status);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_status ON payments("landlordId", status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications("userId", "isRead");
CREATE INDEX IF NOT EXISTS idx_maintenance_landlord_status ON maintenance_requests("landlordId", status);
