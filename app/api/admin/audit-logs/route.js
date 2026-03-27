import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin/auth";

const asInt = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
};

export async function GET(request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const company = String(url.searchParams.get("company") ?? "").trim();
    const actorEmail = String(url.searchParams.get("actorEmail") ?? "").trim();
    const action = String(url.searchParams.get("action") ?? "").trim();
    const dateFrom = String(url.searchParams.get("dateFrom") ?? "").trim();
    const dateTo = String(url.searchParams.get("dateTo") ?? "").trim();
    const limit = Math.min(asInt(url.searchParams.get("limit"), 50), 500);
    const offset = asInt(url.searchParams.get("offset"), 0);

    const supabase = createServiceClient();
    let allowedVisitorIds = null;

    if (company) {
      const { data: matchingVisitors, error: matchingVisitorsError } = await supabase
        .from("vip_visitor")
        .select("id")
        .ilike("clientCompany", `%${company}%`)
        .limit(1000);

      if (matchingVisitorsError) {
        return NextResponse.json({ success: false, error: matchingVisitorsError.message }, { status: 500 });
      }

      allowedVisitorIds = (matchingVisitors ?? []).map((row) => String(row.id));
      if (allowedVisitorIds.length === 0) {
        return NextResponse.json({ success: true, items: [], limit, offset });
      }
    }

    let query = supabase
      .from("vip_visitor_admin_audit_logs")
      .select("id,created_at,actor_user_id,actor_email,action,visitor_id,before,after,meta")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (allowedVisitorIds) query = query.in("visitor_id", allowedVisitorIds);
    if (actorEmail) query = query.ilike("actor_email", `%${actorEmail}%`);
    if (action) query = query.eq("action", action);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000+07:00`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999+07:00`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const visitorIds = [...new Set((data ?? []).map((row) => String(row.visitor_id ?? "").trim()).filter(Boolean))];
    let companyByVisitorId = {};

    if (visitorIds.length > 0) {
      const { data: visitors, error: visitorsError } = await supabase
        .from("vip_visitor")
        .select("id,clientCompany")
        .in("id", visitorIds.map((id) => Number(id)).filter(Number.isFinite));

      if (visitorsError) {
        return NextResponse.json({ success: false, error: visitorsError.message }, { status: 500 });
      }

      companyByVisitorId = Object.fromEntries(
        (visitors ?? []).map((visitor) => [String(visitor.id), visitor.clientCompany || ""])
      );
    }

    const items = (data ?? []).map((row) => ({
      ...row,
      company_name: companyByVisitorId[String(row.visitor_id ?? "").trim()] || "",
    }));

    return NextResponse.json({ success: true, items, limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
