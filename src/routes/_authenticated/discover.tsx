import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, UserPlus, UserCheck, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/discover")({
  component: DiscoverPage,
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verified: boolean;
};

function DiscoverPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const meQ = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const peopleQ = useQuery({
    queryKey: ["discover", q, meQ.data],
    enabled: !!meQ.data,
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url, verified")
        .neq("id", meQ.data!)
        .limit(30);
      if (q.trim()) {
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      } else {
        query = query.order("created_at", { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });

  const followingQ = useQuery({
    queryKey: ["following", meQ.data],
    enabled: !!meQ.data,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", meQ.data!);
      return new Set((data ?? []).map((r) => r.following_id));
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async ({ userId, following }: { userId: string; following: boolean }) => {
      if (!meQ.data) throw new Error("not signed in");
      if (following) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", meQ.data).eq("following_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: meQ.data, following_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["following"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const startDm = useMutation({
    mutationFn: async (other: string) => {
      const { data, error } = await supabase.rpc("get_or_create_dm", { _other: other });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (conv) => navigate({ to: "/messages/$id", params: { id: conv } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="mb-4 font-display text-2xl font-bold">Discover</h1>
      <div className="glass mb-4 flex items-center gap-2 rounded-full px-4 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="space-y-2">
        {peopleQ.isLoading && <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</div>}
        {peopleQ.data?.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">No people found.</div>
        )}
        {peopleQ.data?.map((p) => {
          const isFollowing = followingQ.data?.has(p.id) ?? false;
          return (
            <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              <Avatar url={p.avatar_url} name={p.display_name ?? p.username} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{p.display_name ?? p.username}</span>
                  {p.verified && <span className="text-brand-purple">✓</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                {p.bio && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.bio}</div>}
              </div>
              <button
                onClick={() => toggleFollow.mutate({ userId: p.id, following: isFollowing })}
                className={
                  "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold " +
                  (isFollowing ? "glass" : "bg-gradient-primary text-primary-foreground")
                }
              >
                {isFollowing ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button
                onClick={() => startDm.mutate(p.id)}
                disabled={startDm.isPending}
                className="glass grid size-8 place-items-center rounded-full"
                aria-label="Message"
              >
                {startDm.isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) return <img src={url} alt="" className="size-11 shrink-0 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-11 shrink-0 place-items-center rounded-full font-display font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
