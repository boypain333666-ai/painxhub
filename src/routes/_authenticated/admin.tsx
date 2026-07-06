import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Search, BadgeCheck, Ban, Clock, Crown, Lock } from "lucide-react";
import {
  listUsers,
  setVerified,
  setBanned,
  suspendUser,
  grantAdmin,
  listVerificationRequests,
} from "@/lib/admin.functions";
import { VerifiedBadge } from "@/components/verified-badge";

const ADMIN_KEY = "painxxlord";
const STORAGE_KEY = "painx.admin.unlocked";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [unlocked, setUnlocked] = useState<boolean>(
    typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1"
  );
  const [key, setKey] = useState("");

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10">
        <div className="glass rounded-3xl p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-black/40">
            <Lock className="size-6 text-brand-red" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Admin Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your admin key to continue.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (key.trim() === ADMIN_KEY) {
                sessionStorage.setItem(STORAGE_KEY, "1");
                setUnlocked(true);
              } else {
                toast.error("Wrong key");
                setKey("");
              }
            }}
            className="mt-5 space-y-3"
          >
            <input
              type="password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="admin key"
              className="glass w-full rounded-2xl px-4 py-3 text-center text-sm outline-none"
            />
            <button className="bg-gradient-primary w-full rounded-full py-3 text-sm font-semibold text-primary-foreground">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }
  return <Dashboard onLock={() => { sessionStorage.removeItem(STORAGE_KEY); setUnlocked(false); }} />;
}

function Dashboard({ onLock }: { onLock: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const fList = useServerFn(listUsers);
  const fReqs = useServerFn(listVerificationRequests);
  const fVerify = useServerFn(setVerified);
  const fBan = useServerFn(setBanned);
  const fSuspend = useServerFn(suspendUser);
  const fGrant = useServerFn(grantAdmin);

  const usersQ = useQuery({
    queryKey: ["admin", "users", q],
    queryFn: () => fList({ data: { q } }),
  });
  const reqsQ = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => fReqs({ data: undefined as any }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const mVerify = useMutation({
    mutationFn: (v: { userId: string; verified: boolean }) => fVerify({ data: v }),
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mBan = useMutation({
    mutationFn: (v: { userId: string; banned: boolean }) => fBan({ data: v }),
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mSuspend = useMutation({
    mutationFn: (v: { userId: string; days: number }) => fSuspend({ data: v }),
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mGrant = useMutation({
    mutationFn: (v: { userId: string; makeAdmin: boolean }) => fGrant({ data: v }),
    onSuccess: () => { toast.success("Updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-brand-red" />
          <h1 className="font-display text-2xl font-bold">Admin</h1>
        </div>
        <button onClick={onLock} className="glass rounded-full px-3 py-1.5 text-xs">Lock</button>
      </header>

      {/* Verification requests */}
      <section className="glass mb-4 rounded-3xl p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <BadgeCheck className="size-4 text-brand-red" />
          Verification requests
          <span className="ml-auto text-xs text-muted-foreground">
            {reqsQ.data?.length ?? 0} pending
          </span>
        </h2>
        {reqsQ.data && reqsQ.data.length === 0 && (
          <p className="text-xs text-muted-foreground">No pending requests.</p>
        )}
        <div className="space-y-2">
          {reqsQ.data?.map((r: any) => (
            <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-black/20 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {r.profiles?.display_name ?? r.profiles?.username}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  @{r.profiles?.username} · {r.reason ?? "no reason"}
                </div>
              </div>
              <button
                onClick={() => mVerify.mutate({ userId: r.user_id, verified: true })}
                className="rounded-full bg-brand-red px-3 py-1.5 text-xs font-semibold text-white"
              >
                Grant
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* User list */}
      <section className="glass rounded-3xl p-4">
        <div className="glass mb-3 flex items-center gap-2 rounded-2xl px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-2">
          {usersQ.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {usersQ.data?.map((u: any) => {
            const suspended = u.suspended_until && new Date(u.suspended_until) > new Date();
            return (
              <div key={u.id} className="rounded-2xl bg-black/20 p-3">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-brand grid size-9 place-items-center rounded-full text-sm font-bold text-white">
                    {(u.display_name ?? u.username ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.verified && <VerifiedBadge size={12} tappable={false} />}
                      {u.is_admin && <Crown className="size-3 text-brand-yellow" />}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      @{u.username}
                      {u.banned && <span className="ml-1 text-brand-red">· BANNED</span>}
                      {suspended && <span className="ml-1 text-brand-yellow">· suspended</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ActionBtn
                    onClick={() => mVerify.mutate({ userId: u.id, verified: !u.verified })}
                    active={u.verified}
                    color="red"
                  >
                    <BadgeCheck className="size-3" /> {u.verified ? "Unverify" : "Verify"}
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => mBan.mutate({ userId: u.id, banned: !u.banned })}
                    active={u.banned}
                    color="red"
                  >
                    <Ban className="size-3" /> {u.banned ? "Unban" : "Ban"}
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => {
                      const days = suspended ? 0 : Number(prompt("Suspend for how many days?", "7") ?? "0");
                      if (!Number.isNaN(days)) mSuspend.mutate({ userId: u.id, days });
                    }}
                    active={!!suspended}
                    color="yellow"
                  >
                    <Clock className="size-3" /> {suspended ? "Unsuspend" : "Suspend"}
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => mGrant.mutate({ userId: u.id, makeAdmin: !u.is_admin })}
                    active={u.is_admin}
                    color="purple"
                  >
                    <Crown className="size-3" /> {u.is_admin ? "Revoke" : "Admin"}
                  </ActionBtn>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ActionBtn({
  children, onClick, active, color,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; color: "red" | "yellow" | "purple" }) {
  const base = "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ";
  const on =
    color === "red" ? "bg-brand-red text-white"
    : color === "yellow" ? "bg-brand-yellow text-black"
    : "bg-brand-purple text-white";
  const off = "glass text-muted-foreground";
  return (
    <button onClick={onClick} className={base + (active ? on : off)}>
      {children}
    </button>
  );
}
