// Client-safe pieces of the panel lookup tools: the normalized shapes the
// server actions hand back, the outbound links each result offers, and the small
// display helpers. Panel credentials live in lib/ptero.ts and never reach the
// client - these types are the only thing the browser ever sees.

// One game server, flattened out of the Pterodactyl application API.
export type LookupServer = {
  id: number; // internal (admin panel) id
  identifier: string; // short id the customer sees
  name: string;
  status: string; // active | suspended | installing | ...
  memory: number; // MB, 0 = unlimited
  disk: number; // MB, 0 = unlimited
  cpu: number; // %, 0 = unlimited
  externalId: string | null; // WHMCS service id, when the server was provisioned from it
  nodeId: number | null;
  ownerId: number;
  ownerEmail: string | null;
};

export type LookupUser = {
  id: number;
  uuid: string;
  username: string;
  email: string;
  fullName: string;
  externalId: string | null; // WHMCS client id
  rootAdmin: boolean;
  twoFactor: boolean;
  createdAt: string;
  servers: LookupServer[];
};

export type LookupNode = {
  id: number;
  name: string;
  fqdn: string;
  maintenance: boolean;
  memory: number; // MB
  memoryAllocated: number; // MB
  disk: number; // MB
  diskAllocated: number; // MB
  servers: LookupServer[];
};

// Where the "open in ..." links point. Both are public bases so they can be
// built in the browser; override per environment if the panel or billing host
// ever moves.
const PANEL_BASE = (
  process.env.NEXT_PUBLIC_PANEL_URL || "https://panel.gravelhost.com"
).replace(/\/+$/, "");
const WHMCS_BASE = (
  process.env.NEXT_PUBLIC_WHMCS_URL || "https://gravelhost.com"
).replace(/\/+$/, "");

export const panelServerUrl = (id: number) => `${PANEL_BASE}/admin/servers/view/${id}`;
export const panelUserUrl = (id: number) => `${PANEL_BASE}/admin/users/view/${id}`;
export const panelNodeUrl = (id: number) => `${PANEL_BASE}/admin/nodes/view/${id}`;
export const whmcsServiceUrl = (externalId: string) =>
  `${WHMCS_BASE}/admin/clientsservices.php?id=${encodeURIComponent(externalId)}`;
export const whmcsClientUrl = (externalId: string) =>
  `${WHMCS_BASE}/admin/clientssummary.php?userid=${encodeURIComponent(externalId)}`;

// Pterodactyl uses 0 for "no limit" on memory, disk and CPU.
export function formatMB(mb: number): string {
  if (!mb) return "Unlimited";
  if (mb % 1024 === 0) return `${mb / 1024} GB`;
  return `${mb.toLocaleString()} MB`;
}

export function formatCpu(cpu: number): string {
  return cpu ? `${cpu}%` : "Unlimited";
}

// Panel timestamps are ISO strings; fall back to the raw value if one ever isn't.
export function formatPanelDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || "-";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
