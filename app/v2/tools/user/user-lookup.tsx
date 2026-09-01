"use client";

import { useState, useTransition } from "react";
import { CircleUser } from "lucide-react";
import { lookupUser } from "@/app/(app)/tools/actions";
import {
  formatPanelDate,
  panelUserUrl,
  whmcsClientUrl,
  type LookupUser,
} from "@/app/(app)/tools/constants";
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
  SectionCaption,
  ServerTable,
} from "../tools-ui";

// A customer by panel username or email, with every server they own. Two fields
// where the other tools have one, so the search card's row splits in half the
// way the disputes form does.
//
// A search that matched nothing is not an error - the panel answers 200 with an
// empty list - so it gets its own empty state rather than the red note.

export default function UserLookup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<LookupUser | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() && !email.trim()) {
      setUser(null);
      return setError("Enter a username or an email.");
    }
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
      <LookupCard
        title="Look up a customer"
        hint="Either one is enough; giving both narrows the match."
        pending={pending}
        onSubmit={submit}
      >
        <div className={FIELD}>
          <label htmlFor="panel-username" className={LABEL}>
            Username
          </label>
          <input
            id="panel-username"
            value={username}
            disabled={pending}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="panel username"
            className={INPUT}
          />
        </div>
        <div className={FIELD}>
          <label htmlFor="panel-email" className={LABEL}>
            Email
          </label>
          <input
            id="panel-email"
            type="email"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className={INPUT}
          />
        </div>
      </LookupCard>

      {error ? <ErrorNote message={error} /> : null}

      {user ? (
        <>
          <UserDetails user={user} />

          <div className="flex flex-col gap-[12px]">
            <SectionCaption>Servers ({user.servers.length})</SectionCaption>
            <ServerTable
              servers={user.servers}
              emptyLabel="This customer has no servers."
            />
          </div>
        </>
      ) : error ? null : searched ? (
        <EmptyState
          icon={CircleUser}
          title="No panel user matched that search"
          sub="Check the spelling, or try the other field."
        />
      ) : (
        <EmptyState
          icon={CircleUser}
          title="No customer looked up yet"
          sub="Search by username or email to see a customer and their servers."
        />
      )}
    </>
  );
}

function UserDetails({ user }: { user: LookupUser }) {
  return (
    <div className={`flex flex-col ${CARD}`}>
      <ResultHeader
        icon={CircleUser}
        title={user.username}
        subtitle={user.email}
      >
        <PanelLink href={panelUserUrl(user.id)}>Open in panel</PanelLink>
        {user.externalId ? (
          <PanelLink href={whmcsClientUrl(user.externalId)}>
            Open in WHMCS
          </PanelLink>
        ) : null}
      </ResultHeader>

      <FieldGrid>
        <Field label="User ID" value={`#${user.id}`} />
        <Field label="Name" value={user.fullName} />
        <Field label="Client ID" value={user.externalId} mono />
        <Field label="UUID" value={user.uuid} mono />
        <Field label="Two-factor" value={user.twoFactor ? "Enabled" : "Off"} />
        <Field label="Panel admin" value={user.rootAdmin ? "Yes" : "No"} />
        <Field label="Created" value={formatPanelDate(user.createdAt)} />
        <Field label="Servers" value={String(user.servers.length)} />
      </FieldGrid>
    </div>
  );
}
