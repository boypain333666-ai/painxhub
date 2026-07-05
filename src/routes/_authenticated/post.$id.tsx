import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, Heart, Send, Loader2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/post/$id")({
  component: PostPage,
});

function PostPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const meQ = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const postQ = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, image_url, created_at, author_id, profiles:author_id(username, display_name, avatar_url, verified), likes(user_id), bookmarks(user_id)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const commentsQ = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, profiles:author_id(username, display_name, avatar_url)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!meQ.data) throw new Error("not signed in");
      const { error } = await supabase.from("comments").insert({ post_id: id, author_id: meQ.data, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleLike = useMutation({
    mutationFn: async (liked: boolean) => {
      if (!meQ.data) throw new Error("not signed in");
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", id).eq("user_id", meQ.data);
      } else {
        await supabase.from("likes").insert({ post_id: id, user_id: meQ.data });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", id] }),
  });

  const toggleBookmark = useMutation({
    mutationFn: async (bookmarked: boolean) => {
      if (!meQ.data) throw new Error("not signed in");
      if (bookmarked) {
        await supabase.from("bookmarks").delete().eq("post_id", id).eq("user_id", meQ.data);
      } else {
        await supabase.from("bookmarks").insert({ post_id: id, user_id: meQ.data });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", id] }),
  });

  const p = postQ.data as any;
  const liked = p?.likes?.some((l: any) => l.user_id === meQ.data) ?? false;
  const bookmarked = p?.bookmarks?.some((b: any) => b.user_id === meQ.data) ?? false;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/feed" className="glass grid size-9 place-items-center rounded-full">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-bold">Post</h1>
      </div>

      {postQ.isLoading && <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading…</div>}
      {!postQ.isLoading && !p && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Post not found.</div>
      )}
      {p && (
        <article className="glass mb-3 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <Avatar url={p.profiles?.avatar_url} name={p.profiles?.display_name ?? p.profiles?.username ?? "?"} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{p.profiles?.display_name ?? p.profiles?.username}</div>
              <div className="text-xs text-muted-foreground">
                @{p.profiles?.username} · {formatDistanceToNowStrict(new Date(p.created_at))} ago
              </div>
            </div>
          </div>
          <p className="mt-3 text-[15px] whitespace-pre-wrap">{p.content}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <button
              onClick={() => toggleLike.mutate(liked)}
              className={"flex items-center gap-1.5 " + (liked ? "text-brand-red" : "text-muted-foreground")}
            >
              <Heart className={"size-4 " + (liked ? "fill-current" : "")} />
              {p.likes?.length ?? 0}
            </button>
            <button
              onClick={() => toggleBookmark.mutate(bookmarked)}
              className={"ml-auto " + (bookmarked ? "text-brand-yellow" : "text-muted-foreground")}
            >
              <Bookmark className={"size-4 " + (bookmarked ? "fill-current" : "")} />
            </button>
          </div>
        </article>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) addComment.mutate(text.trim());
        }}
        className="glass mb-3 flex items-center gap-2 rounded-full p-1.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || addComment.isPending}
          className="bg-gradient-primary grid size-9 place-items-center rounded-full text-primary-foreground disabled:opacity-50"
        >
          {addComment.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>

      <div className="space-y-2">
        {commentsQ.data?.map((c: any) => (
          <div key={c.id} className="glass flex gap-3 rounded-2xl p-3">
            <Avatar url={c.profiles?.avatar_url} name={c.profiles?.display_name ?? c.profiles?.username ?? "?"} />
            <div className="min-w-0 flex-1">
              <div className="text-xs">
                <span className="font-semibold">@{c.profiles?.username}</span>{" "}
                <span className="text-muted-foreground">· {formatDistanceToNowStrict(new Date(c.created_at))} ago</span>
              </div>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null | undefined; name: string }) {
  if (url) return <img src={url} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
