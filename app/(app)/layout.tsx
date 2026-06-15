import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/app/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: session.user.role,
        }}
      />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
