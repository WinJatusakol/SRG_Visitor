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

const asInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
};

export async function GET(request) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const visitorId = String(url.searchParams.get("visitorId") ?? "").trim();
    const actorEmail = String(url.searchParams.get("actorEmail") ?? "").trim();
    const action = String(url.searchParams.get("action") ?? "").trim();
    const limit = Math.min(asInt(url.searchParams.get("limit"), 50), 500);
    const offset = asInt(url.searchParams.get("offset"), 0);

    const supabase = createServiceClient();
    let query = supabase
      .from("vip_visitor_admin_audit_logs")
      .select("id,created_at,actor_user_id,actor_email,action,visitor_id,before,after,meta")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (visitorId) query = query.eq("visitor_id", visitorId);
    if (actorEmail) query = query.ilike("actor_email", `%${actorEmail}%`);
    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: data ?? [], limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
