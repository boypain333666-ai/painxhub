import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  component: ChatPage,
});

type Msg = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
};

function ChatPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const meQ = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const peerQ = useQuery({
    queryKey: ["conv-peer", id, meQ.data],
    enabled: !!meQ.data,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_members")
        .select("user_id, profile:profiles(username, display_name, avatar_url)")
        .eq("conversation_id", id);
      const other = (data ?? []).find((m) => m.user_id !== meQ.data);
      return other?.profile as { username: string; display_name: string | null; avatar_url: string | null } | null;
    },
  });

  const msgsQ = useQuery({
    queryKey: ["messages", id],
    queryFn: async (): Promise<Msg[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, created_at, sender_id")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`msgs-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgsQ.data?.length]);

  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!meQ.data) throw new Error("not signed in");
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: meQ.data,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto flex h-[calc(100dvh-6rem)] max-w-md flex-col px-4 pt-4">
      <header className="glass mb-3 flex items-center gap-3 rounded-2xl p-2.5">
        <Link to="/messages" className="grid size-8 place-items-center rounded-full hover:bg-white/5">
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar url={peerQ.data?.avatar_url ?? null} name={peerQ.data?.display_name ?? peerQ.data?.username ?? "?"} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{peerQ.data?.display_name ?? peerQ.data?.username ?? "Chat"}</div>
          <div className="truncate text-xs text-muted-foreground">@{peerQ.data?.username}</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-2">
        {msgsQ.data?.map((m) => {
          const mine = m.sender_id === meQ.data;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm " +
                  (mine ? "bg-gradient-primary text-primary-foreground" : "glass")
                }
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {msgsQ.data?.length === 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">Say hi 👋</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate(text.trim());
        }}
        className="glass mt-2 mb-2 flex items-center gap-2 rounded-full p-1.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="bg-gradient-primary grid size-9 place-items-center rounded-full text-primary-foreground disabled:opacity-50"
        >
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string; size?: number }) {
  if (url) return <img src={url} alt="" className="size-9 rounded-full object-cover" />;
  return (
    <div className="bg-gradient-brand grid size-9 place-items-center rounded-full font-display text-sm font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
