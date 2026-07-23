"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ann = { id: string; message: string; mode: string };

/**
 * Shows Super Admin announcements as a popup on portal load. 'recurring' ones
 * reappear every login; 'once' ones are dismissed for the institute (recorded
 * via the dismiss_announcement RPC). Multiple queue up and are stepped through.
 */
export default function Announcements() {
  const [items, setItems] = useState<Ann[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_active_announcements").then(({ data }) => {
      if (Array.isArray(data)) setItems(data as Ann[]);
    });
  }, []);

  if (items.length === 0 || idx >= items.length) return null;
  const a = items[idx];
  const remaining = items.length - idx;

  async function next() {
    if (a.mode === "once") {
      const supabase = createClient();
      await supabase.rpc("dismiss_announcement", { p_id: a.id });
    }
    setIdx((i) => i + 1);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-sheen w-full max-w-md rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Megaphone className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-medium">Announcement</h3>
            <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-muted-strong">
              {a.message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[12px] text-muted">
            {remaining > 1 ? `${remaining} messages` : ""}
          </span>
          <button
            onClick={next}
            className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            {remaining > 1 ? "Next" : a.mode === "once" ? "Got it" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
