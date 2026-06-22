"use client";

import { useState, useEffect, useCallback } from "react";

export type PushState = "loading" | "unsupported" | "denied" | "enabled" | "disabled" | "error";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer;
}

export function usePushSubscription() {
  const [pushState, setPushState] = useState<PushState>("loading");
  const [pushError, setPushError] = useState<string | null>(null);

  const detect = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    if ((Notification as any).permission === "denied") {
      setPushState("denied");
      return;
    }
    try {
      // getRegistration() resolves immediately — no hanging like .ready does
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) {
        setPushState("disabled");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setPushState(sub ? "enabled" : "disabled");
    } catch {
      setPushState("disabled");
    }
  }, []);

  useEffect(() => { detect(); }, [detect]);

  const enable = useCallback(async () => {
    setPushError(null);
    try {
      const perm = await (Notification as any).requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }

      // Get or register the service worker
      let reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      }

      // Wait for the SW to become active (with 10s timeout)
      const activeReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("SW activation timeout")), 10_000)),
      ]);

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setPushError("Chybí VAPID klíč — zkontroluj proměnné prostředí (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
        setPushState("disabled");
        return;
      }

      const sub = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Uložení odběru selhalo");

      setPushState("enabled");
    } catch (e: any) {
      console.error("[push] enable error:", e);
      setPushError(e?.message ?? "Aktivace push notifikací selhala");
      setPushState("disabled");
    }
  }, []);

  const disable = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState("disabled");
    } catch {
      setPushState("disabled");
    }
  }, []);

  return { pushState, pushError, enable, disable };
}
