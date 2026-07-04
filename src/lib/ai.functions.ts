import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableAI } from "./ai-gateway.server";

const SYSTEM_PROMPT = `You are Pain X AI — the built-in AI companion for Pain X Social.
You are warm, sharp, and useful. Help users write posts, brainstorm captions, code, learn, translate, and think through ideas.
Use markdown for formatting. Keep answers focused. If asked for code, use fenced code blocks with a language tag.`;

const ChatInput = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(50),
});

export const chatWithPainX = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const reply = await callLovableAI([
      { role: "system", content: SYSTEM_PROMPT },
      ...data.messages,
    ]);
    return { reply };
  });
