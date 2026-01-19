import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function POST(request) {
  try {
    const data = await request.json();
    const supabase = await createClient();
    const toBoolean = (value) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        return value === "yes" || value === "true";
      }
      return null;
    };

    const insertPayload = {
      timestamp: data.timestamp ?? new Date().toISOString(),
      clientCompany: data.clientCompany ?? "",
      vipCompany: data.vipCompany ?? "",
      vipPosition: data.vipPosition ?? "",
      nationality: data.nationality ?? "",
      contactPhone: data.contactPhone ?? "",
      totalGuests: data.totalGuests ?? null,
      visitDateTime: data.visitDateTime ?? null,
      meetingRoom: toBoolean(data.meetingRoom),
      transportType: data.transportType ?? "",
      carBrand: data.carBrand ?? "",
      carLicense: data.carLicense ?? "",
      foodRequired: toBoolean(data.foodRequired),
      meals: data.meals ?? "",
      foodNote: data.foodNote ?? "",
      souvenir: toBoolean(data.souvenir),
      hostName: data.hostName ?? "",
    };

    const { error } = await supabase
      .from("vip_visitor")
      .insert([insertPayload]);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
