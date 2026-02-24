import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const isAllowedTable = (table) =>
  [
    "hosts",
    "executive_hosts",
    "meeting_rooms",
    "site_visit_areas",
    "souvenir_gift_sets",
    "food_menu_options",
    "allergy_options",
  ].includes(table);

const orderForTable = (query, table) => {
  if (table === "meeting_rooms") {
    return query.order("sort_index", { ascending: true }).order("code", { ascending: true });
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

const requireAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return user;
};

export async function GET(request) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const table = String(url.searchParams.get("table") ?? "").trim();
    if (!isAllowedTable(table)) {
      return NextResponse.json({ success: false, error: "Invalid table" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await orderForTable(supabase.from(table).select("*"), table);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, items: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAdmin();
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
      const groupKey = typeof insertData.group_key === "string" ? insertData.group_key : "";
      insertData.sort_index = await nextSortIndex(supabase, table, groupKey);
    }

    if (table !== "meeting_rooms") {
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
    const user = await requireAdmin();
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
