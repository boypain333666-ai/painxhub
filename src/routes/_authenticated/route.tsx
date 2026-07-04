import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { Home, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  return (
    <div className="min-h-dvh pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const items = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/ai", label: "Pain X AI", icon: Sparkles },
    { to: "/profile", label: "Profile", icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="glass-strong flex items-center justify-around rounded-full px-2 py-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all " +
                  (active ? "bg-gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground")
                }
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
