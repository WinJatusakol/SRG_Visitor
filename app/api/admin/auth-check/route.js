import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, allowed: false, reason: "unauthorized" }, { status: 200 });
    }

    const adminEmails = String(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const adminDomains = String(process.env.ADMIN_EMAIL_DOMAINS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    const email = String(user.email ?? "").trim().toLowerCase();
    const domain = email.includes("@") ? email.split("@").pop() ?? "" : "";
    const allowed =
      adminEmails.length === 0 && adminDomains.length === 0
        ? true
        : adminEmails.includes(email) || (domain && adminDomains.includes(domain));
    return NextResponse.json({ success: true, allowed }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
