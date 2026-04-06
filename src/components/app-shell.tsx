import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/bridge", label: "Bridge" },
  { href: "/drop", label: "Drop" },
  { href: "/inbox", label: "Inbox" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  activePath,
  title,
  subtitle,
  userEmail,
  children,
}: {
  activePath: string;
  title: string;
  subtitle: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <KeyboardShortcuts />
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 p-4 lg:p-6">
        <header className="app-shell flex flex-col gap-4 rounded-[2rem] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Drop Board</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="hero-title text-2xl font-semibold text-white">{title}</h1>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                {subtitle}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300/80">Signed in as {userEmail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 transition",
                    activePath === item.href ? "bg-sky-400 text-slate-950" : "text-slate-200/75 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}