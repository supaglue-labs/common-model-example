import { Inngest } from "inngest";
import { serve } from "inngest/next";
import prisma from "../../../lib/prisma";
import { sql } from "@vercel/postgres";

const TEN_BILLION = 10_000_000_000;

// TODO: get this type from the openapi spec?
type ObjectSyncComplete = {
  type: "object";
  object_type: "common" | "standard";
  object: string;
  webhook_event_type: string;
  run_id: string;
  connection_id: string;
  customer_id: string;
  provider_name: string;
  result: "SUCCESS" | "ERROR";
  num_records_synced?: number;
  error_message?: string;
};

// Create a client to send and receive events
export const inngest = new Inngest({ name: "Common Model Dogfooding" });

async function getHighWatermark(data: ObjectSyncComplete) {
  {
    const state = await prisma.syncState.findUnique({
      where: {
        type_objectType_object_providerName_customerId: {
          type: data.type,
          objectType: data.object_type,
          object: data.object,
          providerName: data.provider_name,
          customerId: data.customer_id,
        },
      },
    });

    return state?.maxLastModifiedAt?.getTime();
  }
}

// salesforce
async function processSalesforceUsers(
  data: ObjectSyncComplete,
  lastMaxModifiedAt?: Date
): Promise<number> {
  const { rows } = await (lastMaxModifiedAt
    ? sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'IsActive' as is_active,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_user
  WHERE _supaglue_last_modified_at > ${lastMaxModifiedAt.toISOString()}
  ORDER BY _supaglue_last_modified_at ASC`
    : sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'IsActive' as is_active,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_user
  ORDER BY _supaglue_last_modified_at ASC`);

  let newMaxLastModifiedAt: Date = lastMaxModifiedAt || new Date(0);

  for (const row of rows) {
    if (row.is_deleted) {
      await prisma.user.delete({
        where: {
          id: row.id,
          customerId: row.customer_id,
          providerName: row.provider_name,
        },
      });
      continue;
    }

    await prisma.user.upsert({
      create: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
        name: row.name,
        email: row.email,
        isActive: row.is_active === "true",
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      update: {
        email: row.email,
        name: row.name,
        isActive: row.is_active === "true",
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      where: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
      },
    });

    newMaxLastModifiedAt =
      newMaxLastModifiedAt > new Date(row.last_modified_at)
        ? newMaxLastModifiedAt
        : new Date(row.last_modified_at);
  }

  return newMaxLastModifiedAt.getTime();
}

async function processSalesforceOpportunities(
  data: ObjectSyncComplete,
  lastMaxModifiedAt?: Date
): Promise<number> {
  const { rows } = await (lastMaxModifiedAt
    ? sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Description' AS description,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Status' AS status,
    _supaglue_raw_data->>'Stage' AS stage,
    _supaglue_raw_data->>'CloseDate' AS close_date,
    _supaglue_raw_data->>'AccountId' AS account_id,
    _supaglue_raw_data->>'Pipeline' AS pipeline,
    _supaglue_raw_data->>'Amount' AS amount,
    _supaglue_raw_data->>'LastActivityDate' AS last_activity_at,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_opportunity
  WHERE _supaglue_last_modified_at > ${lastMaxModifiedAt.toISOString()}
  ORDER BY _supaglue_last_modified_at ASC`
    : sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Description' AS description,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Status' AS status,
    _supaglue_raw_data->>'Stage' AS stage,
    _supaglue_raw_data->>'CloseDate' AS close_date,
    _supaglue_raw_data->>'AccountId' AS account_id,
    _supaglue_raw_data->>'Pipeline' AS pipeline,
    _supaglue_raw_data->>'Amount' AS amount,
    _supaglue_raw_data->>'LastActivityDate' AS last_activity_at,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_opportunity
  ORDER BY _supaglue_last_modified_at ASC`);

  let newMaxLastModifiedAt: Date = lastMaxModifiedAt || new Date(0);

  for (const row of rows) {
    if (row.is_deleted) {
      await prisma.opportunity.delete({
        where: {
          id: row.id,
          customerId: row.customer_id,
          providerName: row.provider_name,
        },
      });
      continue;
    }

    await prisma.opportunity.upsert({
      create: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
        name: row.name,
        description: row.description,
        ownerId: row.owner_id,
        status: row.status,
        stage: row.stage_name,
        closeDate: new Date(row.close_date),
        accountId: row.account_id,
        pipeline: row.pipeline,
        amount: Number(row.amount),
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      update: {
        name: row.name,
        description: row.description,
        ownerId: row.owner_id,
        status: row.status,
        stage: row.stage_name,
        closeDate: new Date(row.close_date),
        accountId: row.account_id,
        pipeline: row.pipeline,
        amount: Number(row.amount),
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      where: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
      },
    });

    newMaxLastModifiedAt =
      newMaxLastModifiedAt > new Date(row.last_modified_at)
        ? newMaxLastModifiedAt
        : new Date(row.last_modified_at);
  }

  return newMaxLastModifiedAt.getTime();
}

async function processSalesforceAccounts(
  data: ObjectSyncComplete,
  lastMaxModifiedAt?: Date
): Promise<number> {
  const { rows } = await (lastMaxModifiedAt
    ? sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Description' AS description,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Industry' AS industry,
    _supaglue_raw_data->>'Website' AS website,
    _supaglue_raw_data->>'Industry' AS industry,
    _supaglue_raw_data->>'NumberOfEmployees' AS number_of_employees,
    _supaglue_raw_data->>'Fax' AS fax,
    _supaglue_raw_data->>'BillingCity' AS billing_city,
    _supaglue_raw_data->>'BillingCountry' AS billing_country,
    _supaglue_raw_data->>'BillingPostalCode' AS billing_city,
    _supaglue_raw_data->>'BillingState' AS billing_state,
    _supaglue_raw_data->>'BillingStreet' AS billing_street,
    _supaglue_raw_data->>'ShippingCity' AS shipping_city,
    _supaglue_raw_data->>'ShippingCountry' AS shipping_country,
    _supaglue_raw_data->>'ShippingPostalCode' AS shipping_city,
    _supaglue_raw_data->>'ShippingState' AS shipping_state,
    _supaglue_raw_data->>'ShippingStreet' AS shipping_street,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_account
  WHERE _supaglue_last_modified_at > ${lastMaxModifiedAt.toISOString()}
  ORDER BY _supaglue_last_modified_at ASC`
    : sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'Name' AS name,
    _supaglue_raw_data->>'Description' AS description,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Industry' AS industry,
    _supaglue_raw_data->>'Website' AS website,
    _supaglue_raw_data->>'Industry' AS industry,
    _supaglue_raw_data->>'NumberOfEmployees' AS number_of_employees,
    _supaglue_raw_data->>'Fax' AS fax,
    _supaglue_raw_data->>'BillingCity' AS billing_city,
    _supaglue_raw_data->>'BillingCountry' AS billing_country,
    _supaglue_raw_data->>'BillingPostalCode' AS billing_postal_code,
    _supaglue_raw_data->>'BillingState' AS billing_state,
    _supaglue_raw_data->>'BillingStreet' AS billing_street,
    _supaglue_raw_data->>'ShippingCity' AS shipping_city,
    _supaglue_raw_data->>'ShippingCountry' AS shipping_country,
    _supaglue_raw_data->>'ShippingPostalCode' AS shipping_postal_code,
    _supaglue_raw_data->>'ShippingState' AS shipping_state,
    _supaglue_raw_data->>'ShippingStreet' AS shipping_street,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_account
  ORDER BY _supaglue_last_modified_at ASC`);

  let newMaxLastModifiedAt: Date = lastMaxModifiedAt || new Date(0);

  for (const row of rows) {
    if (row.is_deleted) {
      await prisma.account.delete({
        where: {
          id: row.id,
          customerId: row.customer_id,
          providerName: row.provider_name,
        },
      });
      continue;
    }

    const addresses = [
      row.shipping_city ||
      row.shipping_country ||
      row.shipping_postal_code ||
      row.shipping_state ||
      row.shipping_street
        ? {
            addressType: "shipping",
            street1: row.shipping_street,
            street2: null,
            city: row.shipping_city,
            state: row.shipping_state,
            postalCode: row.shipping_postal_code,
            country: row.shipping_country,
          }
        : null,
      row.billing_city ||
      row.billing_country ||
      row.billing_postal_code ||
      row.billing_state ||
      row.billing_street
        ? {
            addressType: "billing",
            street1: row.billing_street,
            street2: null,
            city: row.billing_city,
            state: row.billing_state,
            postalCode: row.billing_postal_code,
            country: row.billing_country,
          }
        : null,
    ].filter(Boolean);

    const phoneNumbers = [
      row.phone ? { phoneNumber: row.phone, phoneNumberType: "primary" } : null,
      row.fax ? { phoneNumber: row.fax, phoneNumberType: "fax" } : null,
    ].filter(Boolean);

    await prisma.account.upsert({
      create: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
        name: row.name,
        description: row.description,
        ownerId: row.owner_id,
        industry: row.industry,
        website: row.website,
        numberOfEmployees: row.number_of_employees
          ? Math.min(parseInt(row.number_of_employees), TEN_BILLION)
          : undefined,
        addresses,
        phoneNumbers,
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      update: {
        name: row.name,
        description: row.description,
        ownerId: row.owner_id,
        industry: row.industry,
        website: row.website,
        numberOfEmployees: row.number_of_employees
          ? Math.min(parseInt(row.number_of_employees), TEN_BILLION)
          : undefined,
        addresses,
        phoneNumbers,
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      where: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
      },
    });
    newMaxLastModifiedAt =
      newMaxLastModifiedAt > new Date(row.last_modified_at)
        ? newMaxLastModifiedAt
        : new Date(row.last_modified_at);
  }

  return newMaxLastModifiedAt.getTime();
}

async function processSalesforceContacts(
  data: ObjectSyncComplete,
  lastMaxModifiedAt?: Date
): Promise<number> {
  const { rows } = await (lastMaxModifiedAt
    ? sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'FirstName' AS first_name,
    _supaglue_raw_data->>'LastName' AS last_name,
    _supaglue_raw_data->>'AccountId' AS account_id,
    _supaglue_raw_data->>'OwnerId' AS account_id,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'Phone' AS phone,
    _supaglue_raw_data->>'MobilePhone' AS mobile_phone,
    _supaglue_raw_data->>'MailingCity' AS mailing_city,
    _supaglue_raw_data->>'MailingCountry' AS mailing_country,
    _supaglue_raw_data->>'MailingPostalCode' AS mailing_postal_code,
    _supaglue_raw_data->>'MailingState' AS mailing_state,
    _supaglue_raw_data->>'MailingStreet' AS mailing_street,
    _supaglue_raw_data->>'OtherCity' AS other_city,
    _supaglue_raw_data->>'OtherCountry' AS other_country,
    _supaglue_raw_data->>'OtherPostalCode' AS other_postal_code,
    _supaglue_raw_data->>'OtherState' AS other_state,
    _supaglue_raw_data->>'OtherStreet' AS other_street,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_contact
  WHERE _supaglue_last_modified_at > ${lastMaxModifiedAt.toISOString()}
  ORDER BY _supaglue_last_modified_at ASC`
    : sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'FirstName' AS first_name,
    _supaglue_raw_data->>'LastName' AS last_name,
    _supaglue_raw_data->>'AccountId' AS account_id,
    _supaglue_raw_data->>'OwnerId' AS account_id,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'Phone' AS phone,
    _supaglue_raw_data->>'MobilePhone' AS mobile_phone,
    _supaglue_raw_data->>'Fax' AS fax_phone,
    _supaglue_raw_data->>'MailingCity' AS mailing_city,
    _supaglue_raw_data->>'MailingCountry' AS mailing_country,
    _supaglue_raw_data->>'MailingPostalCode' AS mailing_postal_code,
    _supaglue_raw_data->>'MailingState' AS mailing_state,
    _supaglue_raw_data->>'MailingStreet' AS mailing_street,
    _supaglue_raw_data->>'OtherCity' AS other_city,
    _supaglue_raw_data->>'OtherCountry' AS other_country,
    _supaglue_raw_data->>'OtherPostalCode' AS other_postal_code,
    _supaglue_raw_data->>'OtherState' AS other_state,
    _supaglue_raw_data->>'OtherStreet' AS other_street,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_contact
  ORDER BY _supaglue_last_modified_at ASC`);

  let newMaxLastModifiedAt: Date = lastMaxModifiedAt || new Date(0);

  for (const row of rows) {
    if (row.is_deleted) {
      await prisma.contact.delete({
        where: {
          id: row.id,
          customerId: row.customer_id,
          providerName: row.provider_name,
        },
      });
      continue;
    }

    const addresses = [
      row.mailing_city ||
      row.mailing_country ||
      row.mailing_postal_code ||
      row.mailing_state ||
      row.mailing_street
        ? {
            addressType: "mailing",
            street1: row.mailing_street,
            street2: null,
            city: row.mailing_city,
            state: row.mailing_state,
            postalCode: row.mailing_postal_code,
            country: row.mailing_country,
          }
        : null,
      row.other_city ||
      row.other_country ||
      row.other_postal_code ||
      row.other_state ||
      row.other_street
        ? {
            addressType: "other",
            street1: row.other_street,
            street2: null,
            city: row.other_city,
            state: row.other_state,
            postalCode: row.other_postal_code,
            country: row.other_country,
          }
        : null,
    ].filter(Boolean);

    const phoneNumbers = [
      row.phone ? { phoneNumber: row.phone, phoneNumberType: "primary" } : null,
      row.mobile_phone
        ? { phoneNumber: row.mobile_phone, phoneNumberType: "mobile" }
        : null,
      row.fax_phone
        ? { phoneNumber: row.fax_phone, phoneNumberType: "fax" }
        : null,
    ].filter(Boolean);

    await prisma.contact.upsert({
      create: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
        accountId: row.account_id,
        ownerId: row.owner_id,
        firstName: row.first_name,
        lastName: row.last_name,
        emailAddresses: row.email
          ? [{ emailAddress: row.email, emailAddressType: "primary" }]
          : [],
        phoneNumbers,
        addresses,
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      update: {
        accountId: row.account_id,
        ownerId: row.owner_id,
        firstName: row.first_name,
        lastName: row.last_name,
        emailAddresses: row.email
          ? [{ emailAddress: row.email, emailAddressType: "primary" }]
          : [],
        phoneNumbers,
        addresses,
        lastActivityAt: row.last_activity_at
          ? new Date(row.last_activity_at)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      where: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
      },
    });

    newMaxLastModifiedAt =
      newMaxLastModifiedAt > new Date(row.last_modified_at)
        ? newMaxLastModifiedAt
        : new Date(row.last_modified_at);
  }

  return newMaxLastModifiedAt.getTime();
}

async function processSalesforceLeads(
  data: ObjectSyncComplete,
  lastMaxModifiedAt?: Date
): Promise<number> {
  const { rows } = await (lastMaxModifiedAt
    ? sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'FirstName' AS first_name,
    _supaglue_raw_data->>'LastName' AS last_name,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Title' AS title,
    _supaglue_raw_data->>'Company' AS company,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'Phone' AS phone,
    _supaglue_raw_data->>'ConvertedDate' AS converted_date,
    _supaglue_raw_data->>'LeadSource' AS lead_source,
    _supaglue_raw_data->>'ConvertedAccountId' AS converted_account_id,
    _supaglue_raw_data->>'ConvertedContactId' AS converted_contact_id,
    _supaglue_raw_data->>'Street' AS street,
    _supaglue_raw_data->>'City' AS city,
    _supaglue_raw_data->>'State' AS state,
    _supaglue_raw_data->>'PostalCode' AS postal_code,
    _supaglue_raw_data->>'Country' AS country,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_lead
  WHERE _supaglue_last_modified_at > ${lastMaxModifiedAt.toISOString()}
  ORDER BY _supaglue_last_modified_at ASC`
    : sql`
  SELECT
    _supaglue_raw_data->>'Id' AS id,
    ${data.customer_id} AS customer_id,
    ${data.provider_name} AS provider_name,
    _supaglue_raw_data->>'FirstName' AS first_name,
    _supaglue_raw_data->>'LastName' AS last_name,
    _supaglue_raw_data->>'OwnerId' AS owner_id,
    _supaglue_raw_data->>'Title' AS title,
    _supaglue_raw_data->>'Company' AS company,
    _supaglue_raw_data->>'Email' AS email,
    _supaglue_raw_data->>'Phone' AS phone,
    _supaglue_raw_data->>'ConvertedDate' AS converted_date,
    _supaglue_raw_data->>'LeadSource' AS lead_source,
    _supaglue_raw_data->>'ConvertedAccountId' AS converted_account_id,
    _supaglue_raw_data->>'ConvertedContactId' AS converted_contact_id,
    _supaglue_raw_data->>'Street' AS street,
    _supaglue_raw_data->>'City' AS city,
    _supaglue_raw_data->>'State' AS state,
    _supaglue_raw_data->>'PostalCode' AS postal_code,
    _supaglue_raw_data->>'Country' AS country,
    _supaglue_raw_data->>'CreatedDate' AS created_at,
    _supaglue_raw_data->>'SystemModstamp' AS updated_at,
    _supaglue_raw_data->>'LastActivityDate' as last_activity_at,
    _supaglue_is_deleted AS is_deleted,
    _supaglue_last_modified_at AS last_modified_at
  FROM supaglue.salesforce_lead
  ORDER BY _supaglue_last_modified_at ASC`);

  let newMaxLastModifiedAt: Date = lastMaxModifiedAt || new Date(0);

  for (const row of rows) {
    if (row.is_deleted) {
      await prisma.lead.delete({
        where: {
          id: row.id,
          customerId: row.customer_id,
          providerName: row.provider_name,
        },
      });
      continue;
    }

    await prisma.lead.upsert({
      create: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
        firstName: row.first_name,
        lastName: row.last_name,
        ownerId: row.owner_id,
        title: row.title,
        company: row.company,
        emailAddresses: row.email
          ? [{ emailAddress: row.email, emailAddressType: "primary" }]
          : [],
        phoneNumbers: row.phone
          ? { phoneNumber: row.phone, phoneNumberType: "primary" }
          : [],
        leadSource: row.lead_source,
        convertedAccountId: row.converted_account_id,
        convertedContactId: row.converted_contact_id,
        convertedDate: row.converted_date
          ? new Date(row.converted_date)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      update: {
        firstName: row.first_name,
        lastName: row.last_name,
        ownerId: row.owner_id,
        title: row.title,
        emailAddresses: row.email
          ? [{ emailAddress: row.email, emailAddressType: "primary" }]
          : [],
        phoneNumbers: row.phone
          ? { phoneNumber: row.phone, phoneNumberType: "primary" }
          : [],
        company: row.company,
        leadSource: row.lead_source,
        convertedAccountId: row.converted_account_id,
        convertedContactId: row.converted_contact_id,
        convertedDate: row.converted_date
          ? new Date(row.converted_date)
          : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      },
      where: {
        id: row.id,
        customerId: row.customer_id,
        providerName: row.provider_name,
      },
    });

    newMaxLastModifiedAt =
      newMaxLastModifiedAt > new Date(row.last_modified_at)
        ? newMaxLastModifiedAt
        : new Date(row.last_modified_at);
  }

  return newMaxLastModifiedAt.getTime();
}

const SYNC_METHODS: Record<
  ObjectSyncComplete["provider_name"],
  Record<
    ObjectSyncComplete["object"],
    (data: ObjectSyncComplete, lastMaxLastModifiedAt?: Date) => Promise<number>
  >
> = {
  salesforce: {
    User: processSalesforceUsers,
    Opportunity: processSalesforceOpportunities,
    Account: processSalesforceAccounts,
    Contact: processSalesforceContacts,
    Lead: processSalesforceLeads,
  },
};

const transformSyncedData = inngest.createFunction(
  { name: "Transform data from Supaglue" },
  { event: "supaglue/sync.complete" },
  async ({ event, step }) => {
    // TODO: need to have something in place to make sure that at most
    // one of these handlers is running at a time for a given provider/customer/object
    const data = event.data as ObjectSyncComplete;

    if (data.webhook_event_type !== "sync.complete") {
      return { event, body: "Not a sync.complete event" };
    }

    if (!(data.type === "object" && data.object_type === "standard")) {
      return { event, body: "Not a standard object sync" };
    }

    if (data.result !== "SUCCESS") {
      return { event, body: "Not a sync.complete SUCCESS event" };
    }

    if (!SYNC_METHODS[data.provider_name]?.[data.object]) {
      return { event, body: "No sync method found" };
    }

    // Find high watermark for this sync
    const lastMaxLastModifiedAt = await step.run(
      "Get high watermark",
      async () => getHighWatermark(data)
    );

    const newMaxLastModifiedAt = await step.run(
      `${data.provider_name} ${data.object} Sync`,
      async () =>
        SYNC_METHODS[data.provider_name][data.object](
          data,
          lastMaxLastModifiedAt ? new Date(lastMaxLastModifiedAt) : undefined
        )
    );

    // record the high watermark seen
    if (newMaxLastModifiedAt) {
      await step.run("Record high watermark", async () => {
        const state = {
          type: data.type,
          objectType: data.object_type,
          object: data.object,
          providerName: data.provider_name,
          customerId: data.customer_id,
          maxLastModifiedAt: new Date(newMaxLastModifiedAt),
        };
        await prisma.syncState.upsert({
          create: state,
          update: state,
          where: {
            type_objectType_object_providerName_customerId: {
              type: data.type,
              objectType: data.object_type,
              object: data.object,
              providerName: data.provider_name,
              customerId: data.customer_id,
            },
          },
        });
      });
    }

    return {
      event,
      body: `Successfully updated ${data.object} from staging table`,
    };
  }
);

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve(inngest, [transformSyncedData]);
