"use client";

import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";  

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; type: "success" | "error"; title: string; message: string }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    };
  }, []);

  const showPopup = (type: "success" | "error", title: string, message: string, autoCloseMs = 1400) => {
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = null;
    setPopup({ open: true, type, title, message });
    if (autoCloseMs > 0) {
      popupTimeoutRef.current = setTimeout(() => {
        setPopup((p) => ({ ...p, open: false }));
      }, autoCloseMs);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      showPopup("error", "เข้าสู่ระบบไม่สำเร็จ", error.message, 2000);
    } else {
      const check = await fetch("/api/admin/auth-check", { method: "GET" }).then((r) => r.json().catch(() => ({})));
      if (check?.success === true && check?.allowed === true) {
        showPopup("success", "เข้าสู่ระบบสำเร็จ", "กำลังเข้าสู่หน้าแอดมิน...", 900);
        setTimeout(() => {
          router.refresh();
          router.push("/admin");
        }, 650);
        return;
      }

      await supabase.auth.signOut();
      setLoading(false);
      showPopup("error", "ไม่มีสิทธิ์เข้าใช้งาน", "บัญชีนี้ไม่มีสิทธิ์เข้าหน้าแอดมิน", 2200);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {popup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setPopup((p) => ({ ...p, open: false }));
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  popup.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {popup.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-gray-900">{popup.title}</div>
                <div className="mt-1 text-sm text-gray-600">{popup.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
