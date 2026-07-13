"use client";
import { LayoutGrid, LogOut, PenTool } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { tokenStorage } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";
const LINKS = [
  { href: "/tasks", label: "Tasks", icon: LayoutGrid },
  { href: "/annotate", label: "Annotate", icon: PenTool },
];
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  function handleLogout() {
    tokenStorage.clear();
    router.replace("/login");
  }
  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/80 backdrop-blur px-6 py-3.5">
      <div className="flex items-center gap-8">
        <span className="font-display font-bold text-ink tracking-tight flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent" />
          Flowdeck
        </span>
        <div className="flex items-center gap-1">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-muted hover:text-ink hover:bg-panel"
                )}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </nav>
  );
}
