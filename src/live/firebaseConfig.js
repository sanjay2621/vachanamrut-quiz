// Firebase web config for live games (Realtime Database + Anonymous auth).
// Not committed: it comes from the VITE_FIREBASE_CONFIG environment variable (the JSON
// object from Firebase console → Project settings → Your apps → Web app), set in
// .env.local for local dev and in Vercel → Settings → Environment Variables for the site.
// The values still end up in the public JS (that's how Firebase web apps work); access
// is controlled by the database rules in live-database-rules.json.
// Unset or invalid → live games are switched off (no buttons shown).
function readConfig() {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return c && c.apiKey && c.databaseURL ? c : null;
  } catch {
    return null;
  }
}

export const FIREBASE_CONFIG = readConfig();
