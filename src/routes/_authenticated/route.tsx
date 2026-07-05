import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { Home, Sparkles, User, MessageCircle, Bell, Compass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
    <div className="min-h-dvh pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const { pathname } = useLocation();

  const unreadQ = useQuery({
    queryKey: ["unread-notifs"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  const items = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/discover", label: "Discover", icon: Compass },
    { to: "/ai", label: "AI", icon: Sparkles },
    { to: "/messages", label: "Chat", icon: MessageCircle },
    { to: "/notifications", label: "Alerts", icon: Bell, badge: unreadQ.data ?? 0 },
    { to: "/profile", label: "Me", icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="glass-strong flex items-center justify-around rounded-full px-1.5 py-1.5">
          {items.map(({ to, label, icon: Icon, ...rest }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            const badge = "badge" in rest ? (rest as { badge: number }).badge : 0;
            return (
              <Link
                key={to}
                to={to}
                className={
                  "relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-1.5 py-2 text-[10px] font-medium transition-all " +
                  (active ? "bg-gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground")
                }
              >
                <Icon className="size-5" />
                <span className="text-[9px]">{label}</span>
                {badge > 0 && (
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-brand-red text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
