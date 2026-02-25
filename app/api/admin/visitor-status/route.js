import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const requireAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
};

const AUDIT_TABLE = "vip_visitor_admin_audit_logs";

export async function POST(request) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    const status = Number(body?.status);

    if (!Number.isFinite(status) || ![0, 1, 2].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }
    if (!Number.isFinite(Number(id)) && typeof id !== "string") {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const visitorId = id;

    const { data: beforeRow } = await supabase
      .from("vip_visitor")
      .select("id,status,visitDateTime,vipCompany,hostName")
      .eq("id", visitorId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("vip_visitor")
      .update({ status })
      .eq("id", id)
      .select("id,status,visitDateTime,vipCompany,hostName")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";
    const action = status === 0 ? "cancel" : "status_change";
    const summary = {
      changes: [
        {
          field: "status",
          from: beforeRow?.status ?? null,
          to: data?.status ?? status,
        },
      ],
    };

    try {
      await supabase.from(AUDIT_TABLE).insert([
        {
          actor_user_id: user.id ?? null,
          actor_email: user.email ?? null,
          action,
          visitor_id: String(data?.id ?? visitorId),
          before: beforeRow ?? null,
          after: data ?? null,
          meta: { ip, user_agent: userAgent, summary },
        },
      ]);
    } catch {}

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
