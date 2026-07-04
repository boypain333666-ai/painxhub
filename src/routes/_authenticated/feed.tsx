import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Heart, MessageCircle, Send, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    verified: boolean;
  } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

function FeedPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [content, setContent] = useState("");

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const postsQ = useQuery({
    queryKey: ["posts"],
    queryFn: async (): Promise<Post[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, image_url, created_at, author_id, profiles!posts_author_id_fkey(username, display_name, avatar_url, verified), likes(user_id), comments(id)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Post[];
    },
  });

  const createPost = useMutation({
    mutationFn: async (text: string) => {
      const user = meQ.data;
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("posts").insert({ content: text, author_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Posted!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const user = meQ.data;
      if (!user) throw new Error("Not signed in");
      if (liked) {
        const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-brand grid size-9 place-items-center rounded-xl font-display font-bold text-white">X</div>
          <h1 className="font-display text-2xl font-bold">Feed</h1>
        </div>
        <button onClick={signOut} className="glass rounded-full p-2.5" aria-label="Sign out">
          <LogOut className="size-4" />
        </button>
      </header>

      {/* Composer */}
      <div className="glass mb-4 rounded-3xl p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's the pain today?"
          rows={3}
          maxLength={500}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{content.length}/500</span>
          <button
            onClick={() => createPost.mutate(content.trim())}
            disabled={!content.trim() || createPost.isPending}
            className="bg-gradient-primary flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {createPost.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Post
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {postsQ.isLoading && <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Loading feed…</div>}
        {postsQ.data?.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No posts yet. Be the first.</p>
          </div>
        )}
        {postsQ.data?.map((p) => {
          const liked = meQ.data ? p.likes.some((l) => l.user_id === meQ.data!.id) : false;
          return (
            <article key={p.id} className="glass rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <Avatar url={p.profiles?.avatar_url} name={p.profiles?.display_name ?? p.profiles?.username ?? "?"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <span className="truncate">{p.profiles?.display_name ?? p.profiles?.username}</span>
                    {p.profiles?.verified && <span className="text-brand-purple">✓</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    @{p.profiles?.username} · {formatDistanceToNowStrict(new Date(p.created_at))} ago
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[15px] whitespace-pre-wrap">{p.content}</p>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <button
                  onClick={() => toggleLike.mutate({ postId: p.id, liked })}
                  className={"flex items-center gap-1.5 " + (liked ? "text-brand-red" : "text-muted-foreground")}
                >
                  <Heart className={"size-4 " + (liked ? "fill-current" : "")} />
                  {p.likes.length}
                </button>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageCircle className="size-4" />
                  {p.comments.length}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null | undefined; name: string }) {
  const initials = name.slice(0, 1).toUpperCase();
  if (url) return <img src={url} alt="" className="size-10 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-10 place-items-center rounded-full font-display text-sm font-bold text-white">
      {initials}
    </div>
  );
}
