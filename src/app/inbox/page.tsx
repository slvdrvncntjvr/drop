import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { InboxBoard } from "@/components/inbox-board";
import { getInboxBoardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function InboxPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialData = await getInboxBoardData(session.user.id);

  return (
    <AppShell activePath="/inbox" title="Inbox" subtitle="Unified timeline" userEmail={session.user.email}>
      <InboxBoard initialData={initialData} />
    </AppShell>
  );
}
