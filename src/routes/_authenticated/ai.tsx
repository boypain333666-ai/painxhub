import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { chatWithPainX } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  component: AIPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AIPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hey — I'm **Pain X AI**. Ask me anything: writing help, code, ideas, translation, or just to think out loud." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(chatWithPainX);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next.map(({ role, content }) => ({ role, content })) } });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply || "…" }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6">
      <header className="mb-3 flex items-center gap-3">
        <div className="bg-gradient-brand grid size-10 place-items-center rounded-2xl shadow-lg">
          <Sparkles className="size-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">Pain X AI</h1>
          <p className="text-xs text-muted-foreground">Your creative co-pilot</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}
        {loading && (
          <div className="glass inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="sticky bottom-24 pb-2">
        <div className="glass-strong flex items-end gap-2 rounded-3xl p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder="Ask Pain X AI…"
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-gradient-primary grid size-10 shrink-0 place-items-center rounded-full text-primary-foreground disabled:opacity-50"
            aria-label="Send"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={"flex gap-2 " + (isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="bg-gradient-brand grid size-8 shrink-0 place-items-center rounded-full">
          <Sparkles className="size-4 text-white" />
        </div>
      )}
      <div
        className={
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap " +
          (isUser
            ? "bg-gradient-primary text-primary-foreground rounded-br-md"
            : "glass rounded-bl-md")
        }
      >
        {msg.content}
      </div>
      {isUser && (
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}
