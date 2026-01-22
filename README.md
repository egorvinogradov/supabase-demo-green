# Supabase Demo

Single-page demo that fetches leads with nested contacts and contact methods,
plus an update form for any of those records.

The Supabase client + queries live in `data.js` so developers can focus on the
integration code without UI noise.

## Setup

1. Edit `config.js` and paste your Supabase project URL and anon key.
2. Start a local server:
   - `python3 -m http.server 5173`
3. Open `http://localhost:5173` in your browser.

## Notes

- Tables expected: `leads`, `contacts`, `contact_methods`.
- Records are connected via UUID arrays:
  - `leads.contacts` -> `contacts.uuid`
  - `contacts.contact_method_uuids` -> `contact_methods.uuid`
