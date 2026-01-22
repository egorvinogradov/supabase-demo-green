import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const TABLES = {
  lead: "leads",
  contact: "contacts",
  contact_method: "contact_methods",
};

export const hasConfig =
  SUPABASE_URL.includes("supabase.co") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const unique = (items) => [...new Set(items.filter(Boolean))];

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const fetchLeadsWithNested = async () => {
  const { data: leads, error: leadError } = await supabase
    .from(TABLES.lead)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (leadError) {
    throw leadError;
  }

  const leadContactUuids = unique(
    leads.flatMap((lead) => ensureArray(lead.contacts))
  );

  let contacts = [];
  if (leadContactUuids.length > 0) {
    const { data, error } = await supabase
      .from(TABLES.contact)
      .select("*")
      .in("uuid", leadContactUuids);
    if (error) {
      throw error;
    }
    contacts = data;
  }

  const contactMethodsUuids = unique(
    contacts.flatMap((contact) =>
      ensureArray(contact.contact_method_uuids)
    )
  );

  let contactMethods = [];
  if (contactMethodsUuids.length > 0) {
    const { data, error } = await supabase
      .from(TABLES.contact_method)
      .select("*")
      .in("uuid", contactMethodsUuids);
    if (error) {
      throw error;
    }
    contactMethods = data;
  }

  const contactsByUuid = new Map(
    contacts.map((contact) => [contact.uuid, contact])
  );
  const methodsByUuid = new Map(
    contactMethods.map((method) => [method.uuid, method])
  );

  const leadsWithNested = leads.map((lead) => {
    const nestedContacts = ensureArray(lead.contacts)
      .map((uuid) => contactsByUuid.get(uuid))
      .filter(Boolean)
      .map((contact) => ({
        ...contact,
        contact_methods: ensureArray(contact.contact_method_uuids)
          .map((uuid) => methodsByUuid.get(uuid))
          .filter(Boolean),
      }));

    return {
      ...lead,
      contacts: nestedContacts,
    };
  });

  return {
    leads: leadsWithNested,
    contacts,
    contactMethods,
  };
};

export const updateRecord = async ({ target, uuid, field, value }) => {
  const payload = { [field]: value };
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from(TABLES[target])
    .update(payload)
    .eq("uuid", uuid);

  if (error) {
    throw error;
  }
};
