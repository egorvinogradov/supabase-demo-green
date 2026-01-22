import { fetchLeadsWithNested, hasConfig, updateRecord } from "./data.js";

const FIELD_OPTIONS = {
  lead: ["name", "status", "condition", "address_city"],
  contact: ["comment", "job_title_raw", "label"],
  contact_method: ["comment", "status", "email", "phone"],
};

const connectionStatus = document.getElementById("connection-status");
const updateForm = document.getElementById("update-form");
const updateTarget = document.getElementById("update-target");
const updateRecordSelect = document.getElementById("update-record");
const updateField = document.getElementById("update-field");
const updateValue = document.getElementById("update-value");
const updateStatus = document.getElementById("update-status");
const leadsContainer = document.getElementById("leads-container");

if (!hasConfig) {
  connectionStatus.textContent =
    "Missing Supabase config. Fill in SUPABASE_URL and SUPABASE_ANON_KEY in config.js.";
  connectionStatus.classList.add("error");
}

let cache = {
  leads: [],
  contacts: [],
  contactMethods: [],
};

const formatLeadLabel = (lead) => {
  const name = lead.name || "Unnamed lead";
  return `${name} (${lead.uuid})`;
};

const formatContactLabel = (contact) => {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const label = name || "Unnamed contact";
  return `${label} (${contact.uuid})`;
};

const formatContactMethodLabel = (method) => {
  const label = method.email || method.phone || "Contact method";
  return `${label} (${method.uuid})`;
};

const setSelectOptions = (select, options) => {
  select.innerHTML = "";
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }
};

const renderLeads = (leads) => {
  leadsContainer.innerHTML = "";
  if (leads.length === 0) {
    leadsContainer.textContent = "No leads found.";
    return;
  }

  for (const lead of leads) {
    const card = document.createElement("article");
    card.className = "lead-card";

    const title = document.createElement("h3");
    title.textContent = lead.name || "Unnamed lead";
    card.appendChild(title);

    const meta = document.createElement("p");
    meta.textContent = `UUID: ${lead.uuid || "n/a"} | Status: ${
      lead.status || "n/a"
    }`;
    card.appendChild(meta);

    const contactList = document.createElement("div");
    contactList.className = "contact-list";

    if (lead.contacts.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No contacts linked to this lead.";
      contactList.appendChild(empty);
    }

    for (const contact of lead.contacts) {
      const contactBlock = document.createElement("div");
      contactBlock.className = "contact-card";

      const contactName = document.createElement("h4");
      const fullName = [contact.first_name, contact.last_name]
        .filter(Boolean)
        .join(" ");
      contactName.textContent = fullName || "Unnamed contact";
      contactBlock.appendChild(contactName);

      const contactMeta = document.createElement("p");
      contactMeta.textContent = `UUID: ${contact.uuid || "n/a"} | Label: ${
        contact.label || "n/a"
      }`;
      contactBlock.appendChild(contactMeta);

      if (contact.contact_methods.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No contact methods.";
        contactBlock.appendChild(empty);
      } else {
        const methods = document.createElement("ul");
        for (const method of contact.contact_methods) {
          const item = document.createElement("li");
          const methodLabel = method.email || method.phone || "Contact method";
          item.textContent = `${methodLabel} (UUID: ${method.uuid || "n/a"})`;
          methods.appendChild(item);
        }
        contactBlock.appendChild(methods);
      }

      contactList.appendChild(contactBlock);
    }

    card.appendChild(contactList);
    leadsContainer.appendChild(card);
  }
};

const refreshData = async () => {
  connectionStatus.textContent = "Loading…";
  connectionStatus.classList.remove("error");
  try {
    const results = await fetchLeadsWithNested();
    cache = results;
    renderLeads(results.leads);
    populateUpdateForm(results);
    connectionStatus.textContent = `Loaded ${results.leads.length} lead(s).`;
  } catch (error) {
    connectionStatus.textContent = `Failed to load data: ${error.message}`;
    connectionStatus.classList.add("error");
  }
};

const populateUpdateForm = ({ leads, contacts, contactMethods }) => {
  const target = updateTarget.value;
  let options = [];
  if (target === "lead") {
    options = leads.map((lead) => ({
      value: lead.uuid,
      label: formatLeadLabel(lead),
    }));
  } else if (target === "contact") {
    options = contacts.map((contact) => ({
      value: contact.uuid,
      label: formatContactLabel(contact),
    }));
  } else {
    options = contactMethods.map((method) => ({
      value: method.uuid,
      label: formatContactMethodLabel(method),
    }));
  }

  if (options.length === 0) {
    options = [{ value: "", label: "No records available" }];
  }
  setSelectOptions(updateRecordSelect, options);
  setSelectOptions(
    updateField,
    FIELD_OPTIONS[target].map((field) => ({
      value: field,
      label: field,
    }))
  );
};

updateTarget.addEventListener("change", () => {
  populateUpdateForm(cache);
});

updateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  updateStatus.textContent = "";
  updateStatus.classList.remove("error");

  const target = updateTarget.value;
  const uuid = updateRecordSelect.value;
  const field = updateField.value;
  const value = updateValue.value.trim();

  if (!uuid) {
    updateStatus.textContent = "No record selected.";
    updateStatus.classList.add("error");
    return;
  }

  try {
    await updateRecord({ target, uuid, field, value });

    updateStatus.textContent = "Update successful. Refreshing data...";
    updateValue.value = "";
    await refreshData();
  } catch (error) {
    updateStatus.textContent = `Update failed: ${error.message}`;
    updateStatus.classList.add("error");
  }
});

if (hasConfig) {
  refreshData();
}
