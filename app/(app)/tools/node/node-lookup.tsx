"use client";

import { useState, useTransition } from "react";
import { Cpu } from "lucide-react";
import { lookupNode } from "@/lib/actions/tools";
import {
  formatMB,
  panelNodeUrl,
  type LookupNode,
} from "@/lib/tools-constants";
import {
  CARD,
  EmptyState,
  ErrorNote,
  FIELD,
  INPUT,
  LABEL,
  LookupCard,
  PanelLink,
  ResultHeader,
  SectionCaption,
  ServerTable,
} from "../tools-ui";

// Every server on a node with its owner's email resolved, so an incident on a
// node turns into a list of the customers it affects.
//
// The node's own numbers go in the three stat cards the disputes page uses,
// since capacity is the thing being read at a glance here.

export default function NodeLookup() {
  const [nodeId, setNodeId] = useState("");
  const [node, setNode] = useState<LookupNode | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = nodeId.trim();
    if (!id) {
      setNode(null);
      return setError("Enter a node ID.");
    }
    setError("");
    startTransition(async () => {
      const res = await lookupNode(id);
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
      <LookupCard
        title="Look up a node"
        hint="Lists every server on the node with its owner, so you can see who a node incident affects."
        pending={pending}
        onSubmit={submit}
      >
        <div className={FIELD}>
          <label htmlFor="node-id" className={LABEL}>
            Node ID
          </label>
          <input
            id="node-id"
            inputMode="numeric"
            value={nodeId}
            disabled={pending}
            onChange={(e) => setNodeId(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 12"
            className={INPUT}
          />
        </div>
      </LookupCard>

      {error ? <ErrorNote message={error} /> : null}

      {node ? (
        <>
          <NodeSummary node={node} />

          <div className="flex flex-col gap-[12px]">
            <SectionCaption>Servers ({node.servers.length})</SectionCaption>
            <ServerTable
              servers={node.servers}
              showOwner
              emptyLabel="No servers are deployed on this node."
            />
          </div>
        </>
      ) : error ? null : (
        <EmptyState
          icon={Cpu}
          title="No node looked up yet"
          sub="Enter a node ID above to see its capacity and who it hosts."
        />
      )}
    </>
  );
}

// Allocation as a share of the node's total, dropped when the panel reports a
// total of zero rather than dividing by it.
const pct = (used: number, total: number) =>
  total > 0 ? ` · ${Math.round((used / total) * 100)}%` : "";

// A node's allocation runs to five figures of megabytes, which overflows a stat
// card, so the cards round to GB or TB and the table keeps the exact figure.
// formatMB is not reusable here: it reads 0 as "unlimited", which is right for a
// limit but wrong for an amount already handed out.
const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function allocatedMB(mb: number): string {
  const gb = mb / 1024;
  return gb >= 1024 ? `${round(gb / 1024)} TB` : `${round(gb)} GB`;
}

function NodeSummary({ node }: { node: LookupNode }) {
  const stats = [
    {
      key: "servers",
      value: String(node.servers.length),
      label: "Servers",
      sub: "deployed on this node",
    },
    {
      key: "memory",
      value: allocatedMB(node.memoryAllocated),
      label: "Memory",
      sub: `of ${formatMB(node.memory)}${pct(node.memoryAllocated, node.memory)}`,
    },
    {
      key: "disk",
      value: allocatedMB(node.diskAllocated),
      label: "Disk",
      sub: `of ${formatMB(node.disk)}${pct(node.diskAllocated, node.disk)}`,
    },
  ];

  return (
    <div className={`flex flex-col ${CARD}`}>
      <ResultHeader
        icon={Cpu}
        title={node.name}
        subtitle={node.fqdn || `Node #${node.id}`}
      >
        {node.maintenance ? (
          <span className="shrink-0 rounded-[6px] bg-[#f59e0b]/15 px-[8px] py-[3px] text-[11px] font-semibold text-[#f59e0b] uppercase">
            Maintenance
          </span>
        ) : null}
        <PanelLink href={panelNodeUrl(node.id)}>Open in panel</PanelLink>
      </ResultHeader>

      <div className="flex items-start gap-[12px] p-[24px]">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="flex min-w-0 flex-1 flex-col gap-[12px] overflow-hidden rounded-[8px] bg-[#0e1217] p-[20px]"
          >
            <p className="truncate text-[32px] font-bold text-[#e2e8f0]">
              {stat.value}
            </p>
            <div className="flex flex-col gap-[2px]">
              <p className="text-[13px] font-bold text-[#94a3b8] uppercase">
                {stat.label}
              </p>
              <p className="truncate text-[12px] font-normal text-[#64748b]">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
