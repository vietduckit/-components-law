-- Minimal stand-in for the NocoBase tables the payment SQL touches, so the
-- self-checking tests in pgsql/tests can run on a throwaway local Postgres
-- (scripts/tests/sql/run-local.sh). Only the columns that SQL reads/writes.
-- The real check is still running the same test file on the dev database.
CREATE TABLE contracts (
  id bigint PRIMARY KEY, "contractCode" varchar(255), "contractName" varchar(255),
  "contractType" varchar(255), "billingCycle" varchar(255), "pricingMode" varchar(255),
  "customerId" bigint, "internalCompanyId" bigint, "lawyerId" bigint,
  "totalAmount" double precision, "fixedAmount" double precision,
  "subTotal" double precision, "vatAmount" double precision,
  "paymentDate" timestamptz, "paymentSchedule" jsonb,
  status varchar(255), "endDate" timestamptz, "signedAt" timestamptz, "currencyId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE projects (
  id bigint PRIMARY KEY, "contractId" bigint, "customerId" bigint,
  status varchar(255), "managerId" bigint, "caseCode" varchar(255), "projectName" varchar(255),
  "quotationId" bigint, "totalAmount" double precision, date timestamptz, "currencyId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE lawyers (id bigint PRIMARY KEY, "userId" bigint);
CREATE TABLE customers (id bigint PRIMARY KEY, "shortName" varchar(255), name varchar(255));
CREATE TABLE services (id bigint PRIMARY KEY, "basePrice" double precision, "serviceName" varchar(255), "currencyId" bigint);
CREATE TABLE "serviceCombos" (
  id bigint PRIMARY KEY, "comboName" varchar(255), "packageSubTotal" double precision, "packageVatRate" double precision,
  "packageVatAmount" double precision, "totalAmount" double precision, "currencyId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "serviceComboItems" (
  id bigint PRIMARY KEY, "comboId" bigint, "serviceId" bigint, "serviceName" text, price double precision,
  vat double precision, "currencyId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
-- a company's own price of a catalog service (dev: no currency column until pgsql/currency_catalog.sql)
CREATE TABLE "companyServices" (
  id bigint PRIMARY KEY, "serviceId" bigint, "internalCompanyId" bigint, "serviceName" varchar(255),
  price double precision, vat double precision, quantity double precision,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "projectServices" (
  id bigint PRIMARY KEY, "projectId" bigint, "serviceId" bigint, "serviceName" varchar(255),
  "quotationServiceId" bigint, "basePrice" double precision, vat double precision, "currencyId" bigint,
  "subTotal" double precision, "vatAmount" double precision, "totalAmount" double precision,
  "pricingMode" varchar(255), "packageSubTotal" double precision, "packageVatAmount" double precision,
  "packageTotalAmount" double precision, status varchar(255),
  "serviceType" varchar(255), description text, quantity double precision, "comboId" bigint, "comboName" text,
  "updatedById" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractServices" (
  id bigint PRIMARY KEY, "contractId" bigint, "projectServiceId" bigint, "quotationServiceId" bigint,
  "projectId" bigint, "serviceName" varchar(255), "basePrice" double precision, quantity double precision,
  vat double precision, "currencyId" bigint, "subTotal" double precision, "vatAmount" double precision,
  "totalAmount" double precision, "pricingMode" varchar(255), "packageSubTotal" double precision,
  "packageVatAmount" double precision, "packageTotalAmount" double precision, "lineStatus" varchar(255),
  "ServiceId" bigint, "serviceType" varchar(255), description text, "comboId" bigint, "comboName" text,
  "updatedById" bigint, "paymentAllocatedAmount" double precision,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE tasks (
  id bigint PRIMARY KEY, title varchar(255), status varchar(255), "projectId" bigint,
  "projectServiceId" bigint, "isPaymentTrigger" boolean DEFAULT false, "paymentRequestId" bigint,
  "contractServiceId" bigint, "quotationServiceId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
-- What hangs on a task (pgsql/service_thread_sync.sql: a task with progress
-- keeps its service from being destroyed).
CREATE TABLE timesheets (id bigint PRIMARY KEY, "taskId" bigint);
CREATE TABLE "subTasks" (id bigint PRIMARY KEY, "taskId" bigint);
CREATE TABLE meetings (id bigint PRIMARY KEY, "taskId" bigint);
CREATE TABLE documents (id bigint PRIMARY KEY, "taskId" bigint, "createdAt" timestamptz DEFAULT now());
CREATE TABLE folders (id bigint PRIMARY KEY, "taskId" bigint);
CREATE TABLE "contractPaymentSchedules" (
  id bigint PRIMARY KEY, "contractId" bigint, "installmentNo" bigint, label varchar(255),
  percentage double precision, amount double precision, "triggerType" varchar(255), "dueDate" timestamptz,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractPaymentScheduleServices" (
  id bigint PRIMARY KEY, "contractPaymentScheduleId" bigint, "contractServiceId" bigint,
  "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "paymentRequests" (
  id bigint PRIMARY KEY, title varchar(255), status varchar(255), "triggerType" varchar(255),
  "conditionMet" boolean, "installmentNo" bigint, "contractPaymentScheduleId" bigint,
  "projectServiceId" bigint, "contractServiceId" bigint, "contractId" bigint,
  "customerId" bigint, "internalCompanyId" bigint,
  "requestedAmount" double precision, "dueDate" timestamptz, currency varchar(255),
  "requestType" varchar(255), priority varchar(255), "requestNote" text, "sourceSnapshot" jsonb,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "paymentRequestServices" (
  id bigint PRIMARY KEY, "paymentRequestId" bigint, "contractServiceId" bigint,
  "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "paymentRequestItems" (
  id bigint PRIMARY KEY, "paymentRequestId" bigint, "contractId" bigint,
  "lineType" varchar(255), "lineStatus" varchar(255), "scheduleItemId" varchar(255),
  "installmentNo" bigint, "lineLabel" varchar(255), "plannedPaymentDate" timestamptz,
  "requestedAmount" double precision, "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE invoices (
  id bigint PRIMARY KEY, "invoiceNumber" varchar(255), status varchar(255),
  "totalAmount" double precision, "amountPaid" double precision DEFAULT 0,
  "outStandingAmount" double precision DEFAULT 0, deadline timestamptz, "issuedDate" timestamptz,
  "paymentRequestId" bigint, "contractId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE payments (
  id bigint PRIMARY KEY, amount double precision, "paymentStatus" varchar(255),
  "paymentDate" timestamptz, "contractId" bigint, "invoiceId" bigint, "paymentRequestId" bigint,
  "currencyId" bigint, "exchangeRateToBase" double precision DEFAULT 1, "sourceKey" varchar(255),
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
-- Finance members: through tables NocoBase creates for the belongsToMany
-- fields of JsField/RegisterFinanceMembersFields.js. Two shapes on purpose:
-- an app-generated id with no default, and a composite key with no id.
CREATE TABLE "projectFinanceMembers" (
  id bigint PRIMARY KEY, "projectId" bigint, "lawyerId" bigint, "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "paymentRequestFinanceMembers" (
  id bigint PRIMARY KEY, "paymentRequestId" bigint, "lawyerId" bigint, "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "invoiceFinanceMembers" (
  "invoiceId" bigint, "lawyerId" bigint, "createdAt" timestamptz, "updatedAt" timestamptz,
  PRIMARY KEY ("invoiceId", "lawyerId")
);
CREATE TABLE "paymentFinanceMembers" (
  "paymentId" bigint, "lawyerId" bigint, "createdAt" timestamptz, "updatedAt" timestamptz,
  PRIMARY KEY ("paymentId", "lawyerId")
);
-- The collection JsField/CreateFinanceNotificationsCollection.js creates:
-- one row per person to notify, sent by the "Finance - notifications" workflow.
CREATE TABLE "financeNotifications" (
  id bigserial PRIMARY KEY, title varchar(255), content text, url varchar(255), event varchar(255),
  entity varchar(255), "entityId" bigint, "contractId" bigint, "caseLabel" varchar(255),
  "customerName" varchar(255), "receiverUserId" bigint, "sentAt" timestamptz,
  "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL
);
CREATE TABLE "contractBillingPlans" (
  id bigint PRIMARY KEY, "contractId" bigint, "planType" varchar(255), status varchar(255),
  "totalAmount" double precision, "retainerTotalCycles" integer, "retainerCyclesBilled" integer DEFAULT 0,
  "retainerUnit" varchar(255), "startDate" date, "nextBillingDate" date, "endDate" date,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
-- Money flow (pgsql/money_flow_foundation.sql): currencies, rates, quotations.
CREATE TABLE currencies (
  id bigint PRIMARY KEY, code varchar(10) UNIQUE, "decimalPlaces" bigint, "isBaseCurrency" boolean
);
CREATE TABLE "exchangeRates" (
  id bigint PRIMARY KEY, "fromCurrencyId" bigint, "toCurrencyId" bigint, rate double precision,
  "effectiveDate" timestamptz, status varchar(255)
);
CREATE TABLE quotations (
  id bigint PRIMARY KEY, "pricingMode" varchar(255), "subTotal" double precision, "totalAmount" double precision, "currencyId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "quotationServices" (
  id bigint PRIMARY KEY, "quotationId" bigint, "serviceName" varchar(255), "basePrice" double precision,
  quantity double precision, vat double precision, "currencyId" bigint, "subTotal" double precision,
  "vatAmount" double precision, "totalAmount" double precision, "pricingMode" varchar(255),
  "packageSubTotal" double precision, "packageVatAmount" double precision, "packageTotalAmount" double precision,
  status varchar(255), "serviceId" bigint, "serviceType" varchar(255), description text, "comboId" bigint, "comboName" text,
  "updatedById" bigint, "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
