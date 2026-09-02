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
  CARD,
  EmptyState,
  ErrorNote,
  Field,
  FIELD,
  FieldGrid,
  INPUT,
  LABEL,
  LookupCard,
  PanelLink,
  ResultHeader,
  StatusPill,
} from "../tools-ui";

// One server by its internal panel ID. Unlike the rest of v2 this is wired to
// the live action: the panel lookups only read, so there is nothing here that a
// redesign canvas could damage, and a real result is the only way to see how the
// table behaves with real names and real limits.

export default function ServerLookup() {
  const [internalId, setInternalId] = useState("");
  const [server, setServer] = useState<LookupServer | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = internalId.trim();
    if (!id) {
      setServer(null);
      return setError("Enter an internal server ID.");
    }
    setError("");
    startTransition(async () => {
      const res = await lookupServer(id);
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
      <LookupCard
        title="Look up a server"
        hint="The numeric ID from the panel URL (/admin/servers/view/1428), not the short identifier."
        pending={pending}
        onSubmit={submit}
      >
        <div className={FIELD}>
          <label htmlFor="internal-id" className={LABEL}>
            Internal ID
          </label>
          <input
            id="internal-id"
            inputMode="numeric"
            value={internalId}
            disabled={pending}
            onChange={(e) => setInternalId(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1428"
            className={INPUT}
          />
        </div>
      </LookupCard>

      {error ? <ErrorNote message={error} /> : null}

      {server ? (
        <ServerDetails server={server} />
      ) : error ? null : (
        <EmptyState
          icon={Server}
          title="No server looked up yet"
          sub="Enter an internal server ID above to see its limits, owner and links."
        />
      )}
    </>
  );
}

function ServerDetails({ server }: { server: LookupServer }) {
  return (
    <div className={`flex flex-col ${CARD}`}>
      <ResultHeader
        icon={Server}
        title={server.name}
        subtitle={`Internal ID ${server.id}`}
      >
        <StatusPill status={server.status} />
      </ResultHeader>

      <FieldGrid>
        <Field label="Identifier" value={server.identifier} mono />
        <Field label="Owner" value={server.ownerEmail} />
        <Field label="Service ID" value={server.externalId} mono />
        <Field
          label="Node"
          value={server.nodeId === null ? null : `#${server.nodeId}`}
        />
        <Field label="RAM" value={formatMB(server.memory)} />
        <Field label="Disk" value={formatMB(server.disk)} />
        <Field label="CPU" value={formatCpu(server.cpu)} />
        <Field
          label="Owner ID"
          value={server.ownerId ? `#${server.ownerId}` : null}
        />
      </FieldGrid>

      <div className="flex flex-wrap items-center gap-[10px] border-t border-[#243033]! p-[24px]">
        <PanelLink href={panelServerUrl(server.id)}>Open in panel</PanelLink>
        {server.externalId ? (
          <PanelLink href={whmcsServiceUrl(server.externalId)}>
            Open in WHMCS
          </PanelLink>
        ) : null}
        {server.nodeId === null ? null : (
          <PanelLink href={panelNodeUrl(server.nodeId)}>Open node</PanelLink>
        )}
      </div>
    </div>
  );
}
