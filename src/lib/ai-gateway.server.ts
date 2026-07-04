// Lovable AI Gateway helper (server-only).
export async function callLovableAI(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
    }),
  });

  if (res.status === 429) throw new Error("Too many requests. Please slow down.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up in Cloud settings.");
  if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return content;
}
