"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdminStatusSync() {
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let active = true;

    const run = async () => {
      try {
        const response = await fetch("/api/admin/sync-visitor-statuses", {
          method: "POST",
        });
        const result = await response.json().catch(() => ({}));

        if (!active || !response.ok || result?.success === false) return;
        if (Number(result?.updatedCount ?? 0) > 0) {
          router.refresh();
        }
      } catch {}
    };

    void run();

    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
