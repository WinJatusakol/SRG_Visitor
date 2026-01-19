import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function POST(request) {
  try {
    const data = await request.json();
    const supabase = await createClient();

    const insertPayload = {
      timestamp: data.timestamp ?? new Date().toISOString(),
      clientCompany: data.clientCompany ?? "",
      vipCompany: data.vipCompany ?? "",
      vipPosition: data.vipPosition ?? "",
      nationality: data.nationality ?? "",
      contactPhone: data.contactPhone ?? "",
      totalGuests: data.totalGuests ?? null,
      visitDateTime: data.visitDateTime ?? null,
      meetingRoom: data.meetingRoom ?? "",
      transportType: data.transportType ?? "",
      carBrand: data.carBrand ?? "",
      carLicense: data.carLicense ?? "",
      foodRequired: data.foodRequired ?? "",
      meals: data.meals ?? "",
      foodNote: data.foodNote ?? "",
      souvenir: data.souvenir ?? "",
      hostName: data.hostName ?? "",
    };

    const { error } = await supabase
      .from("vip_visits")
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
