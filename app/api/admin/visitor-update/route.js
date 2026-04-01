import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/admin/auth";

const isRecord = (value) => value && typeof value === "object" && !Array.isArray(value);

const AUDIT_TABLE = "vip_visitor_admin_audit_logs";

const stableStringify = (value) => {
  if (value == null) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
};

const valuesEqual = (a, b) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") return stableStringify(a) === stableStringify(b);
  return String(a) === String(b);
};

const asText = (value) => (typeof value === "string" ? value.trim() : "");

const guestSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "-";
  const parts = items
    .map((g, index) => {
      const fullName = [asText(g.firstName), asText(g.middleName), asText(g.lastName)].filter(Boolean).join(" ");
      return fullName || `à¸„à¸™à¸—à¸µà¹ˆ ${index + 1}`;
    })
    .filter(Boolean);
  const text = parts.join(", ");
  return text.length > 220 ? `${text.slice(0, 220)}â€¦` : text;
};

const internalAttendeeSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "-";
  const parts = items
    .map((g, index) => {
      const fullName = [asText(g.firstName), asText(g.lastName)].filter(Boolean).join(" ");
      const position = asText(g.position);
      const line = [fullName, position].filter(Boolean).join(" / ");
      return line || `à¸„à¸™à¸—à¸µà¹ˆ ${index + 1}`;
    })
    .filter(Boolean);
  const text = parts.join(", ");
  return text.length > 220 ? `${text.slice(0, 220)}â€¦` : text;
};

const carSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "-";
  const parts = items
    .map((c, index) => {
      const brand = asText(c.brand);
      const license = asText(c.license);
      const line = [brand, license].filter(Boolean).join(" / ");
      return line || `à¸„à¸±à¸™à¸—à¸µà¹ˆ ${index + 1}`;
    })
    .filter(Boolean);
  const text = parts.join(", ");
  return text.length > 220 ? `${text.slice(0, 220)}â€¦` : text;
};

const shuttleSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "-";
  const parts = items
    .map((s, index) => {
      const date = asText(s.date);
      const time = asText(s.time);
      const pickup = asText(s.pickup);
      const destination = asText(s.destination);
      const line = [date, time, pickup && destination ? `${pickup} -> ${destination}` : ""]
        .filter(Boolean)
        .join(" | ");
      return line || `à¸£à¸²à¸¢à¸à¸²à¸£à¸—à¸µà¹ˆ ${index + 1}`;
    })
    .filter(Boolean);
  const text = parts.join(", ");
  return text.length > 220 ? `${text.slice(0, 220)}â€¦` : text;
};

export async function POST(request) {
  try {
    const user = await requireAdminUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id;
    const data = isRecord(body?.data) ? body.data : null;
    const guests = Array.isArray(body?.guests) ? body.guests : null;
    const cars = Array.isArray(body?.cars) ? body.cars : null;
    const internalAttendees = Array.isArray(body?.internalAttendees) ? body.internalAttendees : null;
    const shuttleSchedules = Array.isArray(body?.shuttleSchedules) ? body.shuttleSchedules : null;
    const foodPreferences = body?.foodPreferences === null ? null : isRecord(body?.foodPreferences) ? body.foodPreferences : undefined;
    const siteVisit = body?.siteVisit === null ? null : isRecord(body?.siteVisit) ? body.siteVisit : undefined;
    const souvenirPreferences =
      body?.souvenirPreferences === null ? null : isRecord(body?.souvenirPreferences) ? body.souvenirPreferences : undefined;

    if (!data) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }
    if (!Number.isFinite(Number(id)) && typeof id !== "string") {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const updatePayload = {};
    const allowedKeys = [
      "clientCompany",
      "companyAddress",
      "country",
      "visitorType",
      "visitorTypeOther",
      "contactPhone",
      "purposeOfVisit",
      "welcomeMessage",
      "visitDateTime",
      "meetingRoomSelection",
      "transportType",
      "submittedBy",
      "status",
    ];
    for (const key of allowedKeys) {
      if (key in data) {
        updatePayload[key] = data[key];
      }
    }

    const supabase = createServiceClient();
    const { data: beforeRow } = await supabase
      .from("vip_visitor")
      .select(
        "id,status,visitDateTime,clientCompany,companyAddress,country,visitorType,visitorTypeOther,contactPhone,purposeOfVisit,welcomeMessage,meetingRoomSelection,transportType,submittedBy"
      )
      .eq("id", id)
      .maybeSingle();

    const shouldLoadGuests = Array.isArray(guests);
    const shouldLoadInternalAttendees = Array.isArray(internalAttendees);
    const shouldLoadCars = Array.isArray(cars);
    const shouldLoadShuttle = Array.isArray(shuttleSchedules);
    const shouldLoadFood = foodPreferences !== undefined;
    const shouldLoadSiteVisit = siteVisit !== undefined;
    const shouldLoadSouvenir = souvenirPreferences !== undefined;

    const [
      { data: beforeGuestRows },
      { data: beforeInternalRows },
      { data: beforeCarRows },
      { data: beforeShuttleRow },
      { data: beforeFoodRow },
      { data: beforeSiteVisitRow },
      { data: beforeSouvenirRow },
    ] = await Promise.all([
      shouldLoadGuests
        ? supabase
            .from("vip_visitor_guests")
            .select("sortIndex,prefix,firstName,middleName,lastName,position,halal,vegan,allergies,allergyOther")
            .eq("visitorId", id)
            .order("sortIndex", { ascending: true })
        : Promise.resolve({ data: null }),
      shouldLoadInternalAttendees
        ? supabase
            .from("vip_visitor_internal_attendees")
            .select("sortIndex,firstName,lastName,position")
            .eq("visitorId", id)
            .order("sortIndex", { ascending: true })
        : Promise.resolve({ data: null }),
      shouldLoadCars
        ? supabase
            .from("vip_visitor_cars")
            .select("sortIndex,brand,license")
            .eq("visitorId", id)
            .order("sortIndex", { ascending: true })
        : Promise.resolve({ data: null }),
      shouldLoadShuttle
        ? supabase.from("vip_visitor_shuttle").select("schedules").eq("visitorId", id).maybeSingle()
        : Promise.resolve({ data: null }),
      shouldLoadFood ? supabase.from("vip_visitor_food").select("foodPreferences").eq("visitorId", id).maybeSingle() : Promise.resolve({ data: null }),
      shouldLoadSiteVisit ? supabase.from("vip_visitor_site_visit").select("siteVisit").eq("visitorId", id).maybeSingle() : Promise.resolve({ data: null }),
      shouldLoadSouvenir ? supabase.from("vip_visitor_souvenir").select("souvenirPreferences").eq("visitorId", id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    if ("visitDateTime" in updatePayload) {
      const nextVisitDateTime = String(updatePayload.visitDateTime ?? "").trim();
      if (nextVisitDateTime) {
        const { data: currentRow, error: currentError } = await supabase
          .from("vip_visitor")
          .select("status")
          .eq("id", id)
          .single();
        if (currentError) {
          return NextResponse.json({ success: false, error: currentError.message }, { status: 500 });
        }

        const nextStatusValue =
          "status" in updatePayload ? Number(updatePayload.status) : Number(currentRow?.status);
        const nextStatus = Number.isFinite(nextStatusValue) ? nextStatusValue : null;

        if (nextStatus !== 0 && nextStatus !== 2) {
          const { data: conflicts, error: conflictError } = await supabase
            .from("vip_visitor")
            .select("id,status")
            .eq("visitDateTime", nextVisitDateTime)
            .neq("id", id)
            .or("status.eq.1,status.is.null")
            .limit(1);

          if (conflictError) {
            return NextResponse.json({ success: false, error: conflictError.message }, { status: 500 });
          }

          if (Array.isArray(conflicts) && conflicts.length > 0) {
            return NextResponse.json(
              { success: false, error: "เวลาที่ท่านเลือกมีการจองแล้ว กรุณาเลือกเวลาอื่น" },
              { status: 409 }
            );
          }
        }

        updatePayload.visitDateTime = nextVisitDateTime;
      } else {
        updatePayload.visitDateTime = null;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("vip_visitor")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "id,status,visitDateTime,clientCompany,companyAddress,country,visitorType,visitorTypeOther,contactPhone,purposeOfVisit,welcomeMessage,meetingRoomSelection,transportType,submittedBy"
      )
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }
    if (!updated?.id) {
      return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
    }

    const visitorId = updated.id;

    if (guests) {
      const { error: delGuestError } = await supabase.from("vip_visitor_guests").delete().eq("visitorId", visitorId);
      if (delGuestError) {
        return NextResponse.json({ success: false, error: delGuestError.message }, { status: 500 });
      }
      const rows = guests.map((g, index) => ({
        visitorId,
        sortIndex: index,
        prefix: typeof g?.prefix === "string" ? g.prefix : "",
        firstName: typeof g?.firstName === "string" ? g.firstName : "",
        middleName: typeof g?.middleName === "string" ? g.middleName : "",
        lastName: typeof g?.lastName === "string" ? g.lastName : "",
        position: typeof g?.position === "string" ? g.position : "",
        halal: typeof g?.halal === "boolean" ? g.halal : false,
        vegan: typeof g?.vegan === "boolean" ? g.vegan : false,
        allergies: Array.isArray(g?.allergies) ? g.allergies.filter(Boolean) : [],
        allergyOther: typeof g?.allergyOther === "string" ? g.allergyOther : "",
      }));
      if (rows.length > 0) {
        const { error: insGuestError } = await supabase.from("vip_visitor_guests").insert(rows);
        if (insGuestError) {
          return NextResponse.json({ success: false, error: insGuestError.message }, { status: 500 });
        }
      }
    }

    if (internalAttendees) {
      const { error: delInternalError } = await supabase
        .from("vip_visitor_internal_attendees")
        .delete()
        .eq("visitorId", visitorId);
      if (delInternalError) {
        return NextResponse.json({ success: false, error: delInternalError.message }, { status: 500 });
      }
      const rows = internalAttendees.map((a, index) => ({
        visitorId,
        sortIndex: index,
        firstName: typeof a?.firstName === "string" ? a.firstName : "",
        lastName: typeof a?.lastName === "string" ? a.lastName : "",
        position: typeof a?.position === "string" ? a.position : "",
      }));
      if (rows.length > 0) {
        const { error: insInternalError } = await supabase
          .from("vip_visitor_internal_attendees")
          .insert(rows);
        if (insInternalError) {
          return NextResponse.json({ success: false, error: insInternalError.message }, { status: 500 });
        }
      }
    }

    if (cars) {
      const { error: delCarError } = await supabase.from("vip_visitor_cars").delete().eq("visitorId", visitorId);
      if (delCarError) {
        return NextResponse.json({ success: false, error: delCarError.message }, { status: 500 });
      }
      const rows = cars.map((c, index) => ({
        visitorId,
        sortIndex: index,
        brand: typeof c?.brand === "string" ? c.brand : "",
        license: typeof c?.license === "string" ? c.license : "",
      }));
      if (rows.length > 0) {
        const { error: insCarError } = await supabase.from("vip_visitor_cars").insert(rows);
        if (insCarError) {
          return NextResponse.json({ success: false, error: insCarError.message }, { status: 500 });
        }
      }
    }

    if (shuttleSchedules !== null) {
      const { error: delShuttleError } = await supabase.from("vip_visitor_shuttle").delete().eq("visitorId", visitorId);
      if (delShuttleError) {
        return NextResponse.json({ success: false, error: delShuttleError.message }, { status: 500 });
      }
      if (shuttleSchedules.length > 0) {
        const { error: insShuttleError } = await supabase
          .from("vip_visitor_shuttle")
          .insert([{ visitorId, schedules: shuttleSchedules }]);
        if (insShuttleError) {
          return NextResponse.json({ success: false, error: insShuttleError.message }, { status: 500 });
        }
      }
    }

    if (foodPreferences !== undefined) {
      await supabase.from("vip_visitor_food").delete().eq("visitorId", visitorId);
      if (foodPreferences) {
        const { error } = await supabase.from("vip_visitor_food").insert([{ visitorId, foodPreferences }]);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    if (siteVisit !== undefined) {
      await supabase.from("vip_visitor_site_visit").delete().eq("visitorId", visitorId);
      if (siteVisit) {
        const { error } = await supabase.from("vip_visitor_site_visit").insert([{ visitorId, siteVisit }]);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    if (souvenirPreferences !== undefined) {
      await supabase.from("vip_visitor_souvenir").delete().eq("visitorId", visitorId);
      if (souvenirPreferences) {
        const { error } = await supabase.from("vip_visitor_souvenir").insert([{ visitorId, souvenirPreferences }]);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    const changes = [];
    const beforeData = isRecord(beforeRow) ? beforeRow : {};
    const afterData = isRecord(updated) ? updated : {};
    for (const key of allowedKeys) {
      if (!(key in updatePayload)) continue;
      const from = beforeData[key];
      const to = afterData[key];
      if (!valuesEqual(from, to)) {
        changes.push({ field: key, from, to });
      }
    }

    if (shouldLoadGuests) {
      const beforeGuests = Array.isArray(beforeGuestRows)
        ? beforeGuestRows.map((g) => ({
            prefix: asText(g?.prefix),
            firstName: asText(g?.firstName),
            middleName: asText(g?.middleName),
            lastName: asText(g?.lastName),
            position: asText(g?.position),
            halal: Boolean(g?.halal),
            vegan: Boolean(g?.vegan),
            allergies: Array.isArray(g?.allergies) ? g.allergies.map(asText).filter(Boolean) : [],
            allergyOther: asText(g?.allergyOther),
          }))
        : [];
      const afterGuests = Array.isArray(guests)
        ? guests.map((g) => ({
            prefix: asText(g?.prefix),
            firstName: asText(g?.firstName),
            middleName: asText(g?.middleName),
            lastName: asText(g?.lastName),
            position: asText(g?.position),
            halal: Boolean(g?.halal),
            vegan: Boolean(g?.vegan),
            allergies: Array.isArray(g?.allergies) ? g.allergies.map(asText).filter(Boolean) : [],
            allergyOther: asText(g?.allergyOther),
          }))
        : [];
      if (!valuesEqual(beforeGuests, afterGuests)) {
        changes.push({ field: "guests", from: guestSummary(beforeGuests), to: guestSummary(afterGuests) });
      }
    }
    if (shouldLoadInternalAttendees) {
      const beforeInternal = Array.isArray(beforeInternalRows)
        ? beforeInternalRows.map((g) => ({
            firstName: asText(g?.firstName),
            lastName: asText(g?.lastName),
            position: asText(g?.position),
          }))
        : [];
      const afterInternal = Array.isArray(internalAttendees)
        ? internalAttendees.map((g) => ({
            firstName: asText(g?.firstName),
            lastName: asText(g?.lastName),
            position: asText(g?.position),
          }))
        : [];
      if (!valuesEqual(beforeInternal, afterInternal)) {
        changes.push({
          field: "internalAttendees",
          from: internalAttendeeSummary(beforeInternal),
          to: internalAttendeeSummary(afterInternal),
        });
      }
    }
    if (shouldLoadCars) {
      const beforeCars = Array.isArray(beforeCarRows)
        ? beforeCarRows.map((c) => ({
            brand: asText(c?.brand),
            license: asText(c?.license),
          }))
        : [];
      const afterCars = Array.isArray(cars)
        ? cars.map((c) => ({
            brand: asText(c?.brand),
            license: asText(c?.license),
          }))
        : [];
      if (!valuesEqual(beforeCars, afterCars)) {
        changes.push({ field: "cars", from: carSummary(beforeCars), to: carSummary(afterCars) });
      }
    }
    if (shouldLoadShuttle) {
      const beforeSchedules = isRecord(beforeShuttleRow) && Array.isArray(beforeShuttleRow.schedules)
        ? beforeShuttleRow.schedules
        : [];
      const afterSchedules = Array.isArray(shuttleSchedules) ? shuttleSchedules : [];
      if (!valuesEqual(beforeSchedules, afterSchedules)) {
        changes.push({ field: "shuttleSchedules", from: shuttleSummary(beforeSchedules), to: shuttleSummary(afterSchedules) });
      }
    }
    if (shouldLoadFood) {
      const from = beforeFoodRow?.foodPreferences ?? null;
      const to = foodPreferences ?? null;
      if (!valuesEqual(from, to)) changes.push({ field: "foodPreferences", from, to });
    }
    if (shouldLoadSiteVisit) {
      const from = beforeSiteVisitRow?.siteVisit ?? null;
      const to = siteVisit ?? null;
      if (!valuesEqual(from, to)) changes.push({ field: "siteVisit", from, to });
    }
    if (shouldLoadSouvenir) {
      const from = beforeSouvenirRow?.souvenirPreferences ?? null;
      const to = souvenirPreferences ?? null;
      if (!valuesEqual(from, to)) changes.push({ field: "souvenirPreferences", from, to });
    }

    const summary = { changes };

    try {
      await supabase.from(AUDIT_TABLE).insert([
        {
          actor_user_id: user.id ?? null,
          actor_email: user.email ?? null,
          action: "update",
          visitor_id: String(visitorId),
          before: beforeRow ?? null,
          after: updated ?? null,
          meta: { ip, user_agent: userAgent, summary },
        },
      ]);
    } catch {}

    return NextResponse.json({ success: true, id: visitorId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


