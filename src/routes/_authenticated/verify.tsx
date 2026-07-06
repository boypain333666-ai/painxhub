import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/verified-badge";

export const Route = createFileRoute("/_authenticated/verify")({
  component: VerifyPage,
});

function VerifyPage() {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const stateQ = useQuery({
    queryKey: ["verify", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const [profile, req] = await Promise.all([
        supabase.from("profiles").select("verified").eq("id", u.user.id).maybeSingle(),
        supabase.from("verification_requests").select("*").eq("user_id", u.user.id).maybeSingle(),
      ]);
      return { verified: !!profile.data?.verified, request: req.data, userId: u.user.id };
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!stateQ.data) return;
      const { error } = await supabase
        .from("verification_requests")
        .upsert(
          { user_id: stateQ.data.userId, reason: reason || null, status: "pending" },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application submitted");
      qc.invalidateQueries({ queryKey: ["verify"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const s = stateQ.data;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <Link to="/profile" className="text-xs text-muted-foreground">← Back to profile</Link>
      <div className="glass mt-3 rounded-3xl p-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/40">
          <VerifiedBadge size={44} tappable={false} />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Pain X Verified</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A red badge shown next to your username, proving your account is authentic.
          $4.99/month after your application is approved.
        </p>

        {s?.verified && (
          <div className="mt-5 rounded-2xl bg-brand-red/10 p-4 text-sm">
            You are verified. Enjoy your red badge.
          </div>
        )}

        {!s?.verified && s?.request?.status === "pending" && (
          <div className="mt-5 rounded-2xl bg-brand-yellow/10 p-4 text-sm">
            Your application is under review. You'll be notified once approved.
          </div>
        )}

        {!s?.verified && (!s?.request || s.request.status === "rejected") && (
          <div className="mt-5 text-left">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Why should you be verified?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Tell the admin team who you are…"
              className="glass w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none"
            />
            <button
              onClick={() => apply.mutate()}
              disabled={apply.isPending}
              className="bg-gradient-primary mt-3 w-full rounded-full py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Apply for verification
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Payment is only charged after your application is approved. Users granted a badge
              directly by an admin never pay.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
