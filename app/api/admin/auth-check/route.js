import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin/auth";

export async function GET() {
  try {
    const access = await getAdminAccess();
    return NextResponse.json(
      { success: true, allowed: access.allowed, reason: access.reason },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
