import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BadgeCheck, Shield } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setDisplayName(profileQ.data.display_name ?? "");
      setBio(profileQ.data.bio ?? "");
      setWebsite(profileQ.data.website ?? "");
      setLocation(profileQ.data.location ?? "");
    }
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          bio: bio || null,
          website: website || null,
          location: location || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile", "me"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (profileQ.isLoading) {
    return <div className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  const p = profileQ.data!;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-2xl font-bold">Profile</h1>

      <div className="glass mt-5 rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-brand grid size-16 place-items-center rounded-2xl font-display text-2xl font-bold text-white shadow-lg">
            {(p.display_name ?? p.username).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 font-display text-lg font-bold">
              <span className="truncate">{p.display_name ?? p.username}</span>
              {p.verified && <VerifiedBadge size={16} />}
            </div>
            <div className="text-sm text-muted-foreground">@{p.username}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/verify"
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold"
          >
            <BadgeCheck className="size-3.5 text-brand-red" />
            {p.verified ? "Verified" : "Get verified"}
          </Link>
          <Link
            to="/admin"
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold"
          >
            <Shield className="size-3.5" /> Admin
          </Link>
        </div>
      </div>

      <div className="glass mt-4 space-y-3 rounded-3xl p-5">
        <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
        <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell the world" multiline />
        <Field label="Website" value={website} onChange={setWebsite} placeholder="https://" />
        <Field label="Location" value={location} onChange={setLocation} placeholder="Somewhere" />
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-gradient-primary mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save profile
        </button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, multiline,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          maxLength={200}
          className="glass w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      )}
    </label>
  );
}
