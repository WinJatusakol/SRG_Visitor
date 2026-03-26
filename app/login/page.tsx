"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
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

  const showPopup = (
    type: "success" | "error",
    title: string,
    message: string,
    autoCloseMs = 1400
  ) => {
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = null;
    setPopup({ open: true, type, title, message });
    if (autoCloseMs > 0) {
      popupTimeoutRef.current = setTimeout(() => {
        setPopup((prev) => ({ ...prev, open: false }));
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
      showPopup("error", "เข้าสู่ระบบไม่สำเร็จ", error.message, 2200);
      return;
    }

    const check = await fetch("/api/admin/auth-check", { method: "GET" }).then((r) =>
      r.json().catch(() => ({}))
    );

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
    showPopup(
      "error",
      "ไม่มีสิทธิ์เข้าใช้งาน",
      "บัญชีนี้ไม่มีสิทธิ์เข้าหน้าแอดมิน",
      2400
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4efe5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,239,204,0.9),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(120,139,100,0.22),_transparent_36%),linear-gradient(135deg,_#f8f3ea_0%,_#f1e7d8_100%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(120,139,100,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(120,139,100,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden lg:block">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#788B64]/20 bg-white/75 px-4 py-2 text-sm font-semibold text-[#5f6f4f] shadow-sm backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                Secure Admin Access
              </div>

              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight text-[#1b2a18]">
                Evolve Purity
                <br />
                <span className="text-[#788B64]">Admin Console</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-[#495543]">
                จัดการรายการจอง ตรวจสอบประวัติการแก้ไข และดูข้อมูลผู้เข้าเยี่ยมชมในพื้นที่เดียว
                สำหรับผู้ดูแลระบบเท่านั้น
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <FeatureCard
                  title="Booking Review"
                  text="ตรวจสอบรายการจองและเปิดดูรายละเอียดได้อย่างรวดเร็ว"
                />
                <FeatureCard
                  title="Audit Log"
                  text="ติดตามการแก้ไข ยกเลิก และเปลี่ยนสถานะย้อนหลัง"
                />
                <FeatureCard
                  title="Admin Only"
                  text="เข้าถึงได้เฉพาะบัญชีที่ได้รับสิทธิ์สำหรับงานแอดมิน"
                />
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="overflow-hidden rounded-[28px] border border-[#e2cca8]/70 bg-white/92 shadow-[0_20px_80px_rgba(78,61,29,0.12)] backdrop-blur">
              <div className="border-b border-[#e8dcc2] bg-[linear-gradient(135deg,_rgba(250,239,204,0.75),_rgba(255,255,255,0.9))] px-7 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1b2a18] text-white shadow-sm">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#788B64]">
                      Admin Sign In
                    </div>
                    <h2 className="mt-1 text-2xl font-bold text-[#1b2a18]">เข้าสู่ระบบแอดมิน</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5b6556]">
                  ใช้อีเมลและรหัสผ่านของบัญชีผู้ดูแลระบบเพื่อเข้าสู่หน้า admin dashboard
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5 px-7 py-7">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-[#334030]">
                    อีเมล
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#d8ccb7] bg-[#fcfaf5] px-4 py-3 text-sm text-[#1b2a18] outline-none transition focus:border-[#788B64] focus:bg-white focus:ring-4 focus:ring-[#788B64]/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-[#334030]">
                    รหัสผ่าน
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[#d8ccb7] bg-[#fcfaf5] px-4 py-3 text-sm text-[#1b2a18] outline-none transition focus:border-[#788B64] focus:bg-white focus:ring-4 focus:ring-[#788B64]/10"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-[#e8dcc2] bg-[#faf6ee] px-4 py-3 text-sm text-[#5b6556]">
                  เข้าสู่ระบบได้เฉพาะบัญชีที่มีสิทธิ์แอดมินเท่านั้น หากล็อกอินสำเร็จแต่ไม่มีสิทธิ์
                  ระบบจะพาออกให้อัตโนมัติ
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b2a18] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#24371f] disabled:cursor-not-allowed disabled:bg-[#9aa690]"
                >
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>

      {popup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setPopup((prev) => ({ ...prev, open: false }));
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                  popup.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {popup.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-gray-900">{popup.title}</div>
                <div className="mt-1 text-sm leading-6 text-gray-600">{popup.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-[0_10px_40px_rgba(78,61,29,0.06)] backdrop-blur">
      <div className="text-sm font-bold uppercase tracking-[0.16em] text-[#788B64]">{title}</div>
      <p className="mt-3 text-sm leading-6 text-[#55614f]">{text}</p>
    </div>
  );
}
