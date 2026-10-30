// Ponte verso il backend (Supabase). L'account è facoltativo: senza le variabili d'ambiente
// l'app resta solo locale e niente di questo file viene caricato.
// La libreria si scarica solo al primo uso, così chi non usa l'account non la paga.

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudAvailable = Boolean(URL && ANON_KEY);

const STORAGE_KEY = "lowcor-auth";
let clientPromise = null;
const sessionListeners = new Set();

// C'è una sessione salvata su questo dispositivo? Si controlla senza caricare la libreria
export function hasStoredSession() {
  try {
    return cloudAvailable && localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getClient() {
  if (!cloudAvailable) {
    return Promise.reject(new Error("cloud_unavailable"));
  }
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) => {
      const client = createClient(URL, ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Niente token negli URL: email confermata e password reimpostata passano da un codice
          detectSessionInUrl: false,
          storageKey: STORAGE_KEY,
        },
      });
      client.auth.onAuthStateChange((_event, session) => {
        sessionListeners.forEach((listener) => listener(session));
      });
      return client;
    });
  }
  return clientPromise;
}

// Avvisa a ogni login, logout o rinnovo della sessione, da quando la libreria è caricata
export function onSessionChange(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

// Le funzioni del database rispondono { data, error }: qui diventano un valore o un'eccezione
async function rpc(name, args) {
  const client = await getClient();
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw error;
  }
  return data;
}

async function auth(call) {
  const client = await getClient();
  const { data, error } = await call(client.auth);
  if (error) {
    throw error;
  }
  return data;
}

// ---- Account ----

export function signUp({ email, password, displayName, legalVersion }) {
  return auth((client) =>
    client.signUp({
      email: email.trim(),
      password,
      options: {
        // Il database rifiuta la registrazione se questi consensi mancano
        data: { display_name: displayName.trim(), legal_version: legalVersion, health_consent: "true" },
      },
    })
  );
}

export function verifySignup(email, token) {
  return auth((client) => client.verifyOtp({ email: email.trim(), token: token.trim(), type: "signup" }));
}

export function resendSignup(email) {
  return auth((client) => client.resend({ type: "signup", email: email.trim() }));
}

export function signIn(email, password) {
  return auth((client) => client.signInWithPassword({ email: email.trim(), password }));
}

export async function signOut() {
  const client = await getClient();
  // Esce da questo dispositivo; gli altri restano collegati finché scade il loro token
  await client.auth.signOut({ scope: "local" });
}

export async function signOutEverywhere() {
  const client = await getClient();
  await client.auth.signOut({ scope: "global" });
}

export function requestPasswordReset(email) {
  return auth((client) => client.resetPasswordForEmail(email.trim()));
}

export async function resetPassword(email, token, password) {
  await auth((client) => client.verifyOtp({ email: email.trim(), token: token.trim(), type: "recovery" }));
  return auth((client) => client.updateUser({ password }));
}

export async function getSession() {
  const client = await getClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function getProfile(userId) {
  const client = await getClient();
  const { data, error } = await client.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export function updateProfile(displayName) {
  return rpc("update_profile", { p_display_name: displayName });
}

export function acceptLegal(version) {
  return rpc("accept_legal", { p_version: version });
}

export async function getConsent(userId) {
  const client = await getClient();
  const { data, error } = await client.from("consents").select("legal_version").eq("user_id", userId).maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export function exportMyData() {
  return rpc("export_my_data");
}

export async function deleteAccount() {
  await rpc("delete_account");
  const client = await getClient();
  await client.auth.signOut({ scope: "local" });
}

// ---- Dati ----

export async function loadState(userId) {
  const client = await getClient();
  const { data, error } = await client
    .from("user_state")
    .select("data, revision, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export function saveState(data, baseRevision) {
  return rpc("save_state", { p_data: data, p_base_revision: baseRevision });
}

// ---- Persone collegate ----

export function createInvite() {
  return rpc("create_invite");
}

export function acceptInvite(token) {
  return rpc("accept_invite", { p_token: token });
}

export function myConnections() {
  return rpc("my_connections");
}

export function setShareLevel(viewerId, level) {
  return rpc("set_share_level", { p_viewer: viewerId, p_level: level });
}

export function removeConnection(otherId) {
  return rpc("remove_connection", { p_other: otherId });
}

export function publishSchedule(from, to, items) {
  return rpc("publish_schedule", { p_from: from, p_to: to, p_items: items });
}

export function sharedSchedule(from, to) {
  return rpc("shared_schedule", { p_from: from, p_to: to });
}
