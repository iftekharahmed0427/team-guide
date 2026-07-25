"use client";

import { useState, useTransition } from "react";
import { Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
import { lookupNode } from "../actions";
import { formatMB, panelNodeUrl, type LookupNode } from "../constants";
import {
  ErrorNote,
  ExternalLinkButton,
  LookupButton,
  Placeholder,
  ServerTable,
  inputCls,
  labelCls,
} from "../lookup-ui";

export default function NodeLookup() {
  const [nodeId, setNodeId] = useState("");
  const [node, setNode] = useState<LookupNode | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = nodeId.trim();
    if (!id) return setError("Enter a node ID.");
    setError("");
    startTransition(async () => {
      const res = await lookupNode(id);
      setSearched(true);
      if ("error" in res) {
        setNode(null);
        setError(res.error);
        return;
      }
      setNode(res.node);
    });
  }

  return (
    <>
      <form onSubmit={submit} className="border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium">Look up a node</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="nodeId" className={labelCls}>
              Node ID
            </label>
            <input
              id="nodeId"
              inputMode="numeric"
              value={nodeId}
              disabled={pending}
              onChange={(e) => setNodeId(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 12"
              className={inputCls}
            />
          </div>
          <LookupButton pending={pending} label="Look up" />
        </div>
        <p className="mt-3 text-xs text-muted">
          Lists every server on the node with its owner, so you can see who a node incident affects.
        </p>
      </form>

      {error ? <ErrorNote message={error} /> : null}

      {node ? (
        <>
          <NodeSummary node={node} />
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">
              Servers ({node.servers.length})
            </p>
            <ServerTable
              servers={node.servers}
              showOwner
              emptyLabel="No servers are deployed on this node."
            />
          </div>
        </>
      ) : null}

      {!node && !error && !searched ? (
        <Placeholder>Enter a node ID to see its servers and who they belong to.</Placeholder>
      ) : null}
    </>
  );
}

function NodeSummary({ node }: { node: LookupNode }) {
  const pct = (used: number, total: number) =>
    total > 0 ? ` · ${Math.round((used / total) * 100)}%` : "";

  return (
    <div className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Cpu size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{node.name}</p>
            <p className="truncate text-xs text-muted">
              {node.fqdn || `Node #${node.id}`}
              {node.maintenance ? " - in maintenance" : ""}
            </p>
          </div>
        </div>
        <ExternalLinkButton href={panelNodeUrl(node.id)}>Open in panel</ExternalLinkButton>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <Metric
          icon={Server}
          label="Servers"
          value={String(node.servers.length)}
          sub={node.maintenance ? "Node is in maintenance" : "deployed on this node"}
        />
        <Metric
          icon={MemoryStick}
          label="Memory"
          value={formatMB(node.memoryAllocated)}
          sub={`of ${formatMB(node.memory)}${pct(node.memoryAllocated, node.memory)}`}
        />
        <Metric
          icon={HardDrive}
          label="Disk"
          value={formatMB(node.diskAllocated)}
          sub={`of ${formatMB(node.disk)}${pct(node.diskAllocated, node.disk)}`}
        />
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon size={13} strokeWidth={1.75} />
        {label}
      </div>
      <p className="mt-1 truncate text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}
