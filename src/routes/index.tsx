import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Sparkles, Zap, MessageCircleHeart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/feed" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-dvh">
      {/* nav */}
      <header className="mx-auto flex max-w-md items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight">Pain X</span>
        </div>
        <Link
          to="/auth"
          className="glass rounded-full px-4 py-2 text-sm font-semibold"
        >
          Sign in
        </Link>
      </header>

      {/* hero */}
      <main className="mx-auto max-w-md px-5 pb-16">
        <div className="pt-6">
          <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
            <Sparkles className="size-3.5 text-brand-yellow" />
            AI-powered social, made for humans
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[0.95] font-bold tracking-tight">
            Feel it. <br />
            <span className="text-gradient">Share it.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            A raw, expressive social network with a built-in AI companion that
            actually helps you write, think, and connect.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/auth"
              className="bg-gradient-primary glow rounded-full px-6 py-3.5 text-center font-semibold text-primary-foreground"
            >
              Create your account
            </Link>
            <Link
              to="/auth"
              className="glass rounded-full px-6 py-3.5 text-center font-semibold"
            >
              I already have one
            </Link>
          </div>
        </div>

        {/* feature grid */}
        <div className="mt-14 grid grid-cols-2 gap-3">
          <Feature icon={<Zap className="size-5 text-brand-yellow" />} title="Fast feed" body="Infinite scroll, no ads, no noise." />
          <Feature icon={<MessageCircleHeart className="size-5 text-brand-red" />} title="React, comment" body="Say it with a like, love, or laugh." />
          <Feature icon={<Sparkles className="size-5 text-brand-purple" />} title="Pain X AI" body="Your creative co-pilot, built in." />
          <Feature icon={<Users className="size-5 text-brand-green" />} title="Real people" body="Follow, chat, grow your world." />
        </div>

        <p className="mt-14 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Pain X Social
        </p>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2">{icon}</div>
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function Logo() {
  return (
    <div className="bg-gradient-brand grid size-9 place-items-center rounded-xl font-display text-lg font-bold text-white shadow-lg">
      X
    </div>
  );
}
