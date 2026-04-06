"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditable = Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }

      if (event.key === "n" && !event.metaKey && !event.ctrlKey && !isEditable) {
        event.preventDefault();
        document.getElementById("new-item-trigger")?.click();
      }

      if (event.key === "c" && !event.metaKey && !event.ctrlKey && !isEditable) {
        event.preventDefault();
        document.getElementById("copy-mode-trigger")?.click();
      }

      if (event.key === "1" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        router.push("/bridge");
      }

      if (event.key === "2" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        router.push("/drop");
      }

      if (event.key === "3" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        router.push("/inbox");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return null;
}