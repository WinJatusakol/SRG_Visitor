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
    const { data, error } = await supabase
      .from("vip_visitor")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

