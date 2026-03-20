"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-[#F9F6EF] px-4 py-16">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#E2CCA8]/70 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FAEFCC] text-2xl">
            !
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-[#1b2a18]">
            เกิดข้อผิดพลาดของระบบ
          </h1>
          <p className="mt-2 text-sm text-[#1b2a18]/70">
            ระบบอาจมีการปรับปรุงหรือเชื่อมต่อฐานข้อมูลไม่ได้ชั่วคราว
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-xl bg-[#788B64] px-6 py-2 text-sm font-semibold text-white hover:bg-[#6b7d58]"
            >
              ลองใหม่อีกครั้ง
            </button>
            <Link
              href="/"
              className="rounded-xl border border-[#E2CCA8]/70 px-6 py-2 text-sm font-semibold text-[#1b2a18] hover:bg-[#FAEFCC]"
            >
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
