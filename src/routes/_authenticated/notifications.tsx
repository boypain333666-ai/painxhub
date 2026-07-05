import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Heart, MessageCircle, UserPlus, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

type Notif = {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function NotificationsPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<Notif[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, read, created_at, post_id, actor:actor_id(username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as Notif[];
    },
  });

  useEffect(() => {
    // Mark all as read
    supabase.from("notifications").update({ read: true }).eq("read", false).then(() => {
      qc.invalidateQueries({ queryKey: ["unread-notifs"] });
    });
    const ch = supabase
      .channel("notif-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl font-bold">Notifications</h1>
      <div className="space-y-2">
        {q.isLoading && <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</div>}
        {q.data?.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <Bell className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
        {q.data?.map((n) => (
          <div key={n.id} className="glass flex items-center gap-3 rounded-2xl p-3">
            <div className="relative">
              <Avatar url={n.actor?.avatar_url ?? null} name={n.actor?.display_name ?? n.actor?.username ?? "?"} />
              <div className="bg-gradient-primary absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-primary-foreground">
                {n.type === "like" && <Heart className="size-3" />}
                {n.type === "comment" && <MessageCircle className="size-3" />}
                {n.type === "follow" && <UserPlus className="size-3" />}
              </div>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">@{n.actor?.username ?? "someone"}</span>{" "}
              <span className="text-muted-foreground">
                {n.type === "like" && "liked your post"}
                {n.type === "comment" && "commented on your post"}
                {n.type === "follow" && "started following you"}
              </span>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNowStrict(new Date(n.created_at))} ago
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt="" className="size-10 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-10 place-items-center rounded-full font-display text-sm font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
