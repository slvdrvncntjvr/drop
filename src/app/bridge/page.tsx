import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { BridgeBoard } from "@/components/bridge-board";
import { getBridgeBoardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BridgePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialItems = await getBridgeBoardData(session.user.id);

  return (
    <AppShell activePath="/bridge" title="Bridge" subtitle="Live clipboard bridge" userEmail={session.user.email}>
      <BridgeBoard initialItems={initialItems} />
    </AppShell>
  );
}
