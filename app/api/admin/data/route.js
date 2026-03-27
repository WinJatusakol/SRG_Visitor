import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin/auth";

const isAllowedTable = (table) =>
  [
    "meeting_rooms",
    "site_visit_areas",
    "affiliate_companies",
    "souvenir_gift_sets",
    "food_menu_options",
    "allergy_options",
    "vip_visitor_departments",
    "vip_visitor_department_emails",
  ].includes(table);

const orderForTable = (query, table) => {
  if (table === "meeting_rooms") {
    return query.order("sort_index", { ascending: true }).order("code", { ascending: true });
  }
  if (table === "vip_visitor_departments") {
    return query.order("id", { ascending: true });
  }
  if (table === "vip_visitor_department_emails") {
    return query.order("department_id", { ascending: true }).order("id", { ascending: true });
  }
  if (table === "food_menu_options") {
    return query
      .order("group_key", { ascending: true })
      .order("sort_index", { ascending: true })
      .order("value", { ascending: true });
  }
  return query.order("sort_index", { ascending: true }).order("value", { ascending: true });
};

const isOtherOption = (value, labelTh, labelEn) => {
  const v = String(value ?? "").trim();
  const th = String(labelTh ?? "").trim();
  const en = String(labelEn ?? "").trim();
  return v === "อื่นๆ" || th === "อื่นๆ" || en.toLowerCase() === "other";
};

const nextSortIndex = async (supabase, table, groupKey) => {
  let query = supabase.from(table).select("sort_index").order("sort_index", { ascending: false }).limit(1);
  if (table === "food_menu_options" && typeof groupKey === "string" && groupKey.trim()) {
    query = query.eq("group_key", groupKey.trim());
  }
  const { data, error } = await query;
  if (error) return 0;
  const max = Array.isArray(data) && data.length > 0 ? Number(data[0]?.sort_index ?? 0) : 0;
  return Number.isFinite(max) ? max + 1 : 0;
};

export async function GET(request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const table = String(url.searchParams.get("table") ?? "").trim();
    if (!isAllowedTable(table)) {
      return NextResponse.json({ success: false, error: "Invalid table" }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    let query;
    if (table === "vip_visitor_department_emails") {
        query = supabase.from(table).select("*, vip_visitor_departments(name)");
    } else {
        query = supabase.from(table).select("*");
    }
    
    const { data, error } = await orderForTable(query, table);
    
    // Sort array by relation name for emails
    let resultItems = data ?? [];
    if (table === "vip_visitor_department_emails" && !error) {
        resultItems.sort((a, b) => {
            const nameA = a.vip_visitor_departments?.name || "";
            const nameB = b.vip_visitor_departments?.name || "";
            return nameA.localeCompare(nameB);
        });
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, items: resultItems });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const table = String(body?.table ?? "").trim();
    const data = body?.data && typeof body.data === "object" ? body.data : null;

    if (!isAllowedTable(table) || !data) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const insertData = { ...data };

    const active =
      typeof insertData.active === "boolean" ? insertData.active : insertData.active == null ? true : Boolean(insertData.active);
    insertData.active = active;

    if (insertData.sort_index == null || !Number.isFinite(Number(insertData.sort_index))) {
      if (table !== "vip_visitor_departments" && table !== "vip_visitor_department_emails") {
        const groupKey = typeof insertData.group_key === "string" ? insertData.group_key : "";
        insertData.sort_index = await nextSortIndex(supabase, table, groupKey);
      }
    }

    if (table !== "meeting_rooms" && table !== "vip_visitor_departments" && table !== "vip_visitor_department_emails") {
      const labelTh = typeof insertData.label_th === "string" ? insertData.label_th.trim() : "";
      const labelEn = typeof insertData.label_en === "string" ? insertData.label_en.trim() : "";
      if (!labelTh || !labelEn) {
        return NextResponse.json(
          { success: false, error: "label_th and label_en are required" },
          { status: 400 }
        );
      }

      if (typeof insertData.value !== "string" || !insertData.value.trim()) {
        insertData.value = labelTh;
      } else {
        insertData.value = insertData.value.trim();
      }

      if (table === "food_menu_options") {
        const groupKey = typeof insertData.group_key === "string" ? insertData.group_key.trim() : "";
        if (!groupKey) {
          return NextResponse.json(
            { success: false, error: "group_key is required for food_menu_options" },
            { status: 400 }
          );
        }
        insertData.group_key = groupKey;
        if (isOtherOption(insertData.value, labelTh, labelEn)) {
          return NextResponse.json(
            { success: false, error: 'ไม่อนุญาตให้ใช้ "อื่นๆ" ในหมวดอาหาร' },
            { status: 400 }
          );
        }
      } else if (table === "allergy_options") {
        if (isOtherOption(insertData.value, labelTh, labelEn)) {
          insertData.value = "อื่นๆ";
          insertData.sort_index = 999999;
        }
      }
    }

    if (table === "vip_visitor_departments") {
      const name = typeof insertData.name === "string" ? insertData.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { success: false, error: "name is required" },
          { status: 400 }
        );
      }
      insertData.name = name;
      insertData.fields = Array.isArray(insertData.fields) ? insertData.fields : [];
    }

    if (table === "vip_visitor_department_emails") {
      const email = typeof insertData.email === "string" ? insertData.email.trim() : "";
      const department_id = insertData.department_id;
      if (!email || !department_id) {
        return NextResponse.json(
          { success: false, error: "email and department_id are required" },
          { status: 400 }
        );
      }
      insertData.email = email;
      insertData.department_id = department_id;
    }

    const { data: inserted, error } = await supabase.from(table).insert([insertData]).select("*").single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, item: inserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const table = String(body?.table ?? "").trim();
    const id = body?.id;

    if (!isAllowedTable(table) || (!Number.isFinite(Number(id)) && typeof id !== "string")) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
