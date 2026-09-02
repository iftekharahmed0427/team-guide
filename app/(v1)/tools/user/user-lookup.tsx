"use client";

import { useState, useTransition } from "react";
import { CircleUser } from "lucide-react";
import { lookupUser } from "@/lib/actions/tools";
import {
  formatPanelDate,
  panelUserUrl,
  whmcsClientUrl,
  type LookupUser,
} from "@/lib/tools-constants";
import {
  ErrorNote,
  ExternalLinkButton,
  Field,
  LookupButton,
  Placeholder,
  ServerTable,
  inputCls,
  labelCls,
} from "../lookup-ui";

export default function UserLookup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<LookupUser | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() && !email.trim()) return setError("Enter a username or an email.");
    setError("");
    startTransition(async () => {
      const res = await lookupUser({ username, email });
      setSearched(true);
      if ("error" in res) {
        setUser(null);
        setError(res.error);
        return;
      }
      setUser(res.user);
    });
  }

  return (
    <>
      <form onSubmit={submit} className="border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium">Look up a customer</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className={labelCls}>
              Username
            </label>
            <input
              id="username"
              value={username}
              disabled={pending}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="panel username"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled={pending}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">Either one is enough; both narrows the match.</span>
          <LookupButton pending={pending} label="Look up" />
        </div>
      </form>

      {error ? <ErrorNote message={error} /> : null}

      {user ? (
        <>
          <UserDetails user={user} />
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">
              Servers ({user.servers.length})
            </p>
            <ServerTable servers={user.servers} emptyLabel="This customer has no servers." />
          </div>
        </>
      ) : null}

      {!user && !error && searched ? (
        <Placeholder>No panel user matched that username or email.</Placeholder>
      ) : null}
      {!searched && !error ? (
        <Placeholder>Search by username or email to see a customer and their servers.</Placeholder>
      ) : null}
    </>
  );
}

function UserDetails({ user }: { user: LookupUser }) {
  return (
    <div className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <CircleUser size={18} strokeWidth={1.75} className="shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.username}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExternalLinkButton href={panelUserUrl(user.id)}>Open in panel</ExternalLinkButton>
          {user.externalId ? (
            <ExternalLinkButton href={whmcsClientUrl(user.externalId)}>
              Open in WHMCS
            </ExternalLinkButton>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="User ID" value={`#${user.id}`} />
        <Field label="Name" value={user.fullName} />
        <Field label="Client ID" value={user.externalId} mono />
        <Field label="UUID" value={user.uuid} mono />
        <Field label="Two-factor" value={user.twoFactor ? "Enabled" : "Off"} />
        <Field label="Panel admin" value={user.rootAdmin ? "Yes" : "No"} />
        <Field label="Created" value={formatPanelDate(user.createdAt)} />
        <Field label="Servers" value={String(user.servers.length)} />
      </div>
    </div>
  );
}
