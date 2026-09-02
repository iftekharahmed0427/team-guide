"use client";

import { useState, useTransition } from "react";
import { Server } from "lucide-react";
import { lookupServer } from "@/lib/actions/tools";
import {
  formatCpu,
  formatMB,
  panelNodeUrl,
  panelServerUrl,
  whmcsServiceUrl,
  type LookupServer,
} from "@/lib/tools-constants";
import {
  ErrorNote,
  ExternalLinkButton,
  Field,
  LookupButton,
  Placeholder,
  StatusBadge,
  inputCls,
  labelCls,
} from "../lookup-ui";

export default function ServerLookup() {
  const [internalId, setInternalId] = useState("");
  const [server, setServer] = useState<LookupServer | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = internalId.trim();
    if (!id) return setError("Enter an internal server ID.");
    setError("");
    startTransition(async () => {
      const res = await lookupServer(id);
      setSearched(true);
      if ("error" in res) {
        setServer(null);
        setError(res.error);
        return;
      }
      setServer(res.server);
    });
  }

  return (
    <>
      <form onSubmit={submit} className="border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium">Look up a server</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="internalId" className={labelCls}>
              Internal ID
            </label>
            <input
              id="internalId"
              inputMode="numeric"
              value={internalId}
              disabled={pending}
              onChange={(e) => setInternalId(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 1428"
              className={inputCls}
            />
          </div>
          <LookupButton pending={pending} label="Look up" />
        </div>
        <p className="mt-3 text-xs text-muted">
          The numeric ID from the panel URL (/admin/servers/view/1428), not the short identifier.
        </p>
      </form>

      {error ? <ErrorNote message={error} /> : null}
      {server ? <ServerDetails server={server} /> : null}
      {!server && !error && !searched ? (
        <Placeholder>Enter an internal server ID to see its details.</Placeholder>
      ) : null}
    </>
  );
}

function ServerDetails({ server }: { server: LookupServer }) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Server size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground" title={server.name}>
              {server.name}
            </p>
            <p className="text-xs text-muted">Internal ID {server.id}</p>
          </div>
        </div>
        <StatusBadge status={server.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Identifier" value={server.identifier} mono />
        <Field label="Owner" value={server.ownerEmail} />
        <Field label="Service ID" value={server.externalId} mono />
        <Field label="Node" value={server.nodeId === null ? null : `#${server.nodeId}`} />
        <Field label="RAM" value={formatMB(server.memory)} />
        <Field label="Disk" value={formatMB(server.disk)} />
        <Field label="CPU" value={formatCpu(server.cpu)} />
        <Field label="Owner ID" value={server.ownerId ? `#${server.ownerId}` : null} />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-4">
        <ExternalLinkButton href={panelServerUrl(server.id)}>Open in panel</ExternalLinkButton>
        {server.externalId ? (
          <ExternalLinkButton href={whmcsServiceUrl(server.externalId)}>
            Open in WHMCS
          </ExternalLinkButton>
        ) : null}
        {server.nodeId === null ? null : (
          <ExternalLinkButton href={panelNodeUrl(server.nodeId)}>Open node</ExternalLinkButton>
        )}
      </div>
    </div>
  );
}
