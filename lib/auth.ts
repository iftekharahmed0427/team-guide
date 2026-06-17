import { cache } from "react";
import { headers, cookies } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { invite } from "../db/app-schema";

const bootstrapAdmins = (process.env.AUTH_BOOTSTRAP_ADMINS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

type Access = { allowed: boolean; role: "admin" | "member" };

async function resolveAccess(email?: string | null): Promise<Access> {
  if (!email) return { allowed: false, role: "member" };
  const normalized = email.toLowerCase();

  if (bootstrapAdmins.includes(normalized)) {
    return { allowed: true, role: "admin" };
  }

  const rows = await db
    .select()
    .from(invite)
    .where(eq(invite.email, normalized))
    .limit(1);

  if (rows.length > 0) {
    return { allowed: true, role: rows[0].role === "admin" ? "admin" : "member" };
  }

  return { allowed: false, role: "member" };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
  plugins: [
    admin({
      defaultRole: "member",
      adminRoles: ["admin"],
    }),
  ],
  // Invite-only: a new account can only be created if its email is a bootstrap
  // admin or has a matching invite. The role is assigned from that match.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const { allowed, role } = await resolveAccess(user.email);
          if (!allowed) {
            throw new APIError("FORBIDDEN", {
              message:
                "This account is not on the team allow list. Ask an admin to invite you.",
            });
          }
          return { data: { ...user, role } };
        },
      },
    },
  },
});

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Stub session used only outside production so the app can be developed without
// completing the Discord OAuth flow. Run with NODE_ENV=production (e.g.
// `next build && next start`) to enforce the real, invite-only auth gate.
const DEV_SESSION = {
  user: {
    id: "dev-user",
    name: "Dev User",
    email: "dev@localhost",
    emailVerified: true,
    image: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "dev-session",
    token: "dev",
    userId: "dev-user",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as unknown as NonNullable<Session>;

// Name of the cookie that turns on the admin "view as member" preview.
export const VIEW_AS_COOKIE = "tg_view_as_member";

// The real, un-downgraded session. Cached per request so repeated calls in one
// render don't re-validate the session. Falls back to a stub admin session in
// development so pages render without logging in. Use this only for the preview
// toggle itself (so an admin can always turn the preview back off).
export const getRealSession = cache(async (): Promise<Session> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session || IS_PRODUCTION) return session;
  return DEV_SESSION;
});

// True when a real admin has switched on the "view as member" preview.
export async function isViewingAsMember(): Promise<boolean> {
  const real = await getRealSession();
  if (real?.user.role !== "admin") return false;
  return (await cookies()).get(VIEW_AS_COOKIE)?.value === "1";
}

// Canonical session accessor for server components and mutating actions. When an
// admin is previewing as a member, the role is downgraded to "member" so every
// page, nav item, and admin-gated action behaves exactly as it would for a real
// team member. This can only ever DOWNGRADE privileges, never grant them.
export async function getSession(): Promise<Session> {
  const session = await getRealSession();
  if (session?.user.role === "admin") {
    const previewing = (await cookies()).get(VIEW_AS_COOKIE)?.value === "1";
    if (previewing) {
      return { ...session, user: { ...session.user, role: "member" } } as NonNullable<Session>;
    }
  }
  return session;
}
