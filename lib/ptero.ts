import type { LookupNode, LookupServer, LookupUser } from "@/lib/tools-constants";

// Pterodactyl application API client behind the /tools lookups. Server-side
// only: it reads the panel key from the environment and is imported by the tools
// server actions, never by a client component.
//
// Auth is the panel application key plus the X-GH-Bypass header the edge in
// front of the panel expects - without the bypass header the request comes back
// as a challenge page instead of JSON.

const DEFAULT_PANEL_URL = "https://panel.gravelhost.com";
const TIMEOUT_MS = 15_000;
// A node lookup resolves one owner email per distinct server owner. Cap the
// fan-out so a busy node can't fire hundreds of parallel requests at the panel.
const OWNER_EMAIL_CONCURRENCY = 6;
const OWNER_EMAIL_MAX = 150;

// Every failure the tools surface to the user is one of these; anything else is
// a real bug and should bubble up as a 500.
export class PteroError extends Error {}

// Each endpoint can be overridden with a full URL (PTERO_SERVERS / PTERO_USERS /
// PTERO_NODE) for a panel that doesn't follow the default layout; otherwise it
// is derived from PTERO_URL. Trailing slashes are stripped so callers can always
// join with "/".
function endpoint(kind: "servers" | "users" | "nodes"): string {
  const override = {
    servers: process.env.PTERO_SERVERS,
    users: process.env.PTERO_USERS,
    nodes: process.env.PTERO_NODE,
  }[kind];
  const base =
    override ||
    `${(process.env.PTERO_URL || DEFAULT_PANEL_URL).replace(/\/+$/, "")}/api/application/${kind}`;
  return base.replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const key = process.env.PTERO_KEY;
  if (!key) {
    throw new PteroError("The panel API key is not configured. Set PTERO_KEY on the server.");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  const bypass = process.env.GH_BYPASS_SECRET;
  if (bypass) headers["X-GH-Bypass"] = bypass;
  return headers;
}

type Json = Record<string, unknown>;

const obj = (v: unknown): Json => (typeof v === "object" && v !== null ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const bool = (v: unknown): boolean => v === true || v === 1 || v === "1";
// Ids and emails come back as strings, numbers, null or "" depending on the
// field; normalize all of it to "a value or nothing".
const text = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

async function request(url: string, notFound: string): Promise<Json> {
  const headers = authHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new PteroError(
      timedOut ? "The panel did not respond in time." : "Could not reach the panel.",
    );
  }

  if (!res.ok) {
    if (res.status === 404) throw new PteroError(notFound);
    if (res.status === 401 || res.status === 403) {
      throw new PteroError("The panel rejected our API key.");
    }
    if (res.status === 429) {
      throw new PteroError("The panel is rate limiting us. Try again in a moment.");
    }
    throw new PteroError(`The panel returned an error (${res.status}).`);
  }

  try {
    return obj(await res.json());
  } catch {
    throw new PteroError("The panel returned a response we could not read.");
  }
}

// Pterodactyl nests includes under attributes.relationships; some panel versions
// hoist them to the top level, so accept both.
function relationship(node: Json, name: string): unknown[] {
  const nested = obj(obj(obj(node.attributes).relationships)[name]);
  const top = obj(obj(node.relationships)[name]);
  return arr(nested.data ?? top.data);
}

function toServer(raw: unknown): LookupServer {
  const wrapper = obj(raw);
  const a = obj(wrapper.attributes ?? wrapper);
  const limits = obj(a.limits);
  const status = text(a.status);
  return {
    id: num(a.id),
    identifier: str(a.identifier),
    name: str(a.name),
    // `suspended` is the flag support actually cares about; `status` is null on a
    // healthy server and carries installing/transfer states otherwise.
    status: bool(a.suspended) ? "suspended" : (status ?? "active"),
    memory: num(limits.memory),
    disk: num(limits.disk),
    cpu: num(limits.cpu),
    externalId: text(a.external_id),
    nodeId: a.node == null ? null : num(a.node),
    ownerId: num(a.user),
    // Present only when the request asked for ?include=user.
    ownerEmail: text(obj(obj(obj(a.relationships).user).attributes).email),
  };
}

// Fill in the owner email for servers that didn't carry one, one request per
// distinct owner, bounded in both fan-out and total. A missing email is never
// worth failing the whole lookup over.
async function attachOwnerEmails(servers: LookupServer[]): Promise<void> {
  const ids = [
    ...new Set(servers.filter((s) => !s.ownerEmail && s.ownerId > 0).map((s) => s.ownerId)),
  ].slice(0, OWNER_EMAIL_MAX);
  if (ids.length === 0) return;

  const headers = authHeaders();
  const usersUrl = endpoint("users");
  const emails = new Map<number, string>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const res = await fetch(`${usersUrl}/${id}`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) continue;
        const email = text(obj(obj(await res.json()).attributes).email);
        if (email) emails.set(id, email);
      } catch {
        // ignore per-owner failures
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(OWNER_EMAIL_CONCURRENCY, ids.length) }, worker),
  );

  for (const s of servers) {
    if (!s.ownerEmail) s.ownerEmail = emails.get(s.ownerId) ?? null;
  }
}

// One server by its internal (admin) id, with its owner attached.
export async function getServer(internalId: string): Promise<LookupServer> {
  const data = await request(
    `${endpoint("servers")}/${encodeURIComponent(internalId)}?include=user`,
    "No server has that internal ID.",
  );
  const server = toServer(data);
  // Falls back to a direct user fetch if the panel ignored ?include=user.
  await attachOwnerEmails([server]);
  return server;
}

// The first user matching the given username and/or email, with their servers.
// Returns null when the filter matched nothing (the panel answers 200 + []).
export async function getUser(filters: {
  username?: string;
  email?: string;
}): Promise<LookupUser | null> {
  const url = new URL(endpoint("users"));
  if (filters.username) url.searchParams.set("filter[username]", filters.username);
  if (filters.email) url.searchParams.set("filter[email]", filters.email);
  url.searchParams.set("include", "servers");

  const data = await request(url.toString(), "No user matched that search.");
  const first = arr(data.data)[0];
  if (!first) return null;

  const wrapper = obj(first);
  const a = obj(wrapper.attributes ?? wrapper);
  const fullName = `${str(a.first_name)} ${str(a.last_name)}`.trim();
  const email = str(a.email);
  return {
    id: num(a.id),
    uuid: str(a.uuid),
    username: str(a.username),
    email,
    fullName,
    externalId: text(a.external_id),
    rootAdmin: bool(a.root_admin),
    twoFactor: bool(a["2fa"] ?? a.two_factor_authenticated),
    createdAt: str(a.created_at),
    // Every server in this list belongs to the user we just looked up.
    servers: relationship(wrapper, "servers")
      .map(toServer)
      .map((s) => ({ ...s, ownerEmail: s.ownerEmail ?? (email || null) })),
  };
}

// One node by id, with every server on it and each server's owner email.
export async function getNode(nodeId: string): Promise<LookupNode> {
  const data = await request(
    `${endpoint("nodes")}/${encodeURIComponent(nodeId)}?include=servers`,
    "No node has that ID.",
  );
  const a = obj(data.attributes ?? data);
  const allocated = obj(a.allocated_resources);
  const servers = relationship(data, "servers").map(toServer);
  await attachOwnerEmails(servers);

  return {
    id: num(a.id),
    name: str(a.name),
    fqdn: str(a.fqdn),
    maintenance: bool(a.maintenance_mode),
    memory: num(a.memory),
    memoryAllocated: num(allocated.memory),
    disk: num(a.disk),
    diskAllocated: num(allocated.disk),
    servers,
  };
}
