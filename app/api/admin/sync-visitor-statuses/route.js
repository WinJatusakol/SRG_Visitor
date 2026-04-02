import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";
import { syncVisitorStatuses } from "@/lib/admin/sync-visitor-statuses";

export async function POST() {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncVisitorStatuses();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
