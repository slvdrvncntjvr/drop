import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { DropBoard } from "@/components/drop-board";
import { getDropBoardData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function DropPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialFiles = await getDropBoardData(session.user.id);

  return (
    <AppShell activePath="/drop" title="Drop" subtitle="Quick file transfer" userEmail={session.user.email}>
      <DropBoard initialFiles={initialFiles} />
    </AppShell>
  );
}
