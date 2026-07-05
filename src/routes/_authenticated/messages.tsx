import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesLayout,
});

type ConvRow = {
  id: string;
  last_message_at: string;
  members: { user_id: string; profile: { username: string; display_name: string | null; avatar_url: string | null } | null }[];
};

function MessagesLayout() {
  const { pathname } = useLocation();
  const isChild = pathname !== "/messages" && pathname.startsWith("/messages/");
  if (isChild) return <Outlet />;
  return <MessagesList />;
}

function MessagesList() {
  const meQ = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const convsQ = useQuery({
    queryKey: ["conversations", meQ.data],
    enabled: !!meQ.data,
    queryFn: async (): Promise<ConvRow[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, last_message_at, members:conversation_members(user_id, profile:profiles(username, display_name, avatar_url))")
        .order("last_message_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as unknown as ConvRow[];
    },
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl font-bold">Messages</h1>
      <div className="space-y-2">
        {convsQ.isLoading && <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</div>}
        {convsQ.data?.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No chats yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Start one from Discover.</p>
          </div>
        )}
        {convsQ.data?.map((c) => {
          const other = c.members.find((m) => m.user_id !== meQ.data);
          const p = other?.profile;
          return (
            <Link
              key={c.id}
              to="/messages/$id"
              params={{ id: c.id }}
              className="glass flex items-center gap-3 rounded-2xl p-3"
            >
              <Avatar url={p?.avatar_url ?? null} name={p?.display_name ?? p?.username ?? "?"} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p?.display_name ?? p?.username ?? "Unknown"}</div>
                <div className="truncate text-xs text-muted-foreground">@{p?.username}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatDistanceToNowStrict(new Date(c.last_message_at))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt="" className="size-11 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-11 place-items-center rounded-full font-display font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
