import { useState } from "react";

/**
 * Red verified badge (Pain X verified). Tap to see explainer.
 */
export function VerifiedBadge({ size = 14, tappable = true }: { size?: number; tappable?: boolean }) {
  const [open, setOpen] = useState(false);
  const el = (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="inline-block shrink-0 drop-shadow-[0_0_6px_rgba(255,60,80,0.6)]"
      aria-label="Verified"
    >
      <path
        fill="#ff2f4a"
        d="M12 1.5l2.3 1.7 2.85-.35.85 2.75 2.55 1.35-1 2.7 1 2.7-2.55 1.35-.85 2.75-2.85-.35L12 17.8l-2.3-1.7-2.85.35-.85-2.75L3.45 12.3l1-2.7-1-2.7 2.55-1.35.85-2.75L9.7 3.2 12 1.5z"
      />
      <path
        d="M8.5 12.2l2.4 2.4 4.6-5"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  if (!tappable) return el;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex align-middle"
        aria-label="Verified — see details"
      >
        {el}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-strong max-w-sm rounded-3xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-black/40">
              <VerifiedBadge size={40} tappable={false} />
            </div>
            <h3 className="font-display text-lg font-bold">This account is verified</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pain X has confirmed this account is authentic and notable. Verified members apply
              through their profile — the admin team reviews every request.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="bg-gradient-primary mt-5 w-full rounded-full py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
