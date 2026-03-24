import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const parsed =
      contentType.includes("multipart/form-data")
        ? await (async () => {
            const formData = await request.formData();
            const raw = formData.get("data");
            const registrationFile = formData.get("registrationFile");
            const data =
              typeof raw === "string"
                ? JSON.parse(raw)
                : raw && typeof raw === "object"
                  ? JSON.parse(String(raw))
                  : {};
            return { data, registrationFile };
          })()
        : { data: await request.json(), registrationFile: null };

    const data = parsed.data ?? {};
    const supabase = createServiceClient();

    const visitDateTimeIso = String(data.visitDateTime ?? "").trim();
    if (visitDateTimeIso) {
      const { data: conflicts, error: conflictError } = await supabase
        .from("vip_visitor")
        .select("id,status")
        .eq("visitDateTime", visitDateTimeIso)
        .or("status.eq.1,status.is.null")
        .limit(1);

      if (conflictError) {
        return NextResponse.json(
          { success: false, error: conflictError.message },
          { status: 500 }
        );
      }

      if (Array.isArray(conflicts) && conflicts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "วันและเวลานี้มีการจองแล้ว กรุณาเลือกเวลาอื่น",
          },
          { status: 409 }
        );
      }
    }

    const guests = Array.isArray(data.guests) ? data.guests : [];
    
    // Check for overlapping visits
    if (data.visitDateTime) {
      const visitDateStr = data.visitDateTime.substring(0, 10);
      const visitTimeStr = data.visitDateTime.substring(11, 16);
      
      const { data: existingVisits, error: checkError } = await supabase
        .from("vip_visitor")
        .select("id")
        .like("visit_date_time", `${visitDateStr}T${visitTimeStr}%`)
        .limit(1);
        
      if (!checkError && existingVisits && existingVisits.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "มีการจองเข้าเยี่ยมชมในเวลานี้แล้ว กรุณาเลือกเวลาอื่น",
          },
          { status: 409 }
        );
      }
    }

    const cars = Array.isArray(data.cars) ? data.cars : [];
    const shuttleSchedules = Array.isArray(data.shuttleSchedules)
      ? data.shuttleSchedules
      : [];
    const transportType = String(data.transportType ?? "").trim();
    const carCountInput =
      typeof data.carCount === "number" ? data.carCount : Number(data.carCount ?? 0);
    const carCount =
      transportType === "personal"
        ? cars.length > 0
          ? cars.length
          : Number.isFinite(carCountInput)
            ? carCountInput
            : 0
        : 0;
    const meetingRoomSelection = String(data.meetingRoomSelection ?? "").trim();
    const meetingRoom = Boolean(meetingRoomSelection);
    const siteVisit =
      data.siteVisit &&
      typeof data.siteVisit === "object" &&
      !Array.isArray(data.siteVisit)
        ? data.siteVisit
        : null;
    const submittedBy =
      data.submittedBy &&
      typeof data.submittedBy === "object" &&
      !Array.isArray(data.submittedBy)
        ? data.submittedBy
        : null;
    const internalAttendees = Array.isArray(data.internalAttendees)
      ? data.internalAttendees
      : [];
    const foodPreferences =
      data.foodPreferences &&
      typeof data.foodPreferences === "object" &&
      !Array.isArray(data.foodPreferences)
        ? data.foodPreferences
        : null;
    const foodRequired = Boolean(foodPreferences);
    const souvenirPreferences =
      data.souvenirPreferences &&
      typeof data.souvenirPreferences === "object" &&
      !Array.isArray(data.souvenirPreferences)
        ? data.souvenirPreferences
        : null;
    const souvenir = Boolean(souvenirPreferences);
    const totalGuestsInput =
      typeof data.totalGuests === "number" ? data.totalGuests : Number(data.totalGuests ?? 0);
    const totalGuests =
      guests.length > 0 ? guests.length : Number.isFinite(totalGuestsInput) ? totalGuestsInput : null;

    const registrationFileInput = parsed.registrationFile;
    const bucketName =
      process.env.SUPABASE_PRESENTATION_BUCKET || "vip_visitor_attachments";
    const toSafeFilename = (value) =>
      String(value || "")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, " ")
        .trim();

    let registrationFile = null;
    if (registrationFileInput && registrationFileInput instanceof File) {
      const maxSize = 10 * 1024 * 1024;
      if (registrationFileInput.size > maxSize) {
        return NextResponse.json(
          { success: false, error: "ไฟล์แนบใหญ่เกินไป (สูงสุด 10MB)" },
          { status: 400 }
        );
      }

      const originalName = toSafeFilename(registrationFileInput.name);
      const fileExt = originalName.includes(".")
        ? originalName.split(".").pop()
        : "";
      const datedPrefix = new Date().toISOString().slice(0, 10);
      const objectPath = `${datedPrefix}/registration-${randomUUID()}${
        fileExt ? `.${fileExt}` : ""
      }`;
      const arrayBuffer = await registrationFileInput.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const uploadOnce = async () =>
        supabase.storage.from(bucketName).upload(objectPath, bytes, {
          contentType: registrationFileInput.type || "application/octet-stream",
          upsert: false,
        });

      let uploadResult = await uploadOnce();
      if (uploadResult.error) {
        const msg = String(uploadResult.error.message ?? "");
        const isBucketNotFound =
          msg.toLowerCase().includes("bucket not found") ||
          msg.toLowerCase().includes("no such bucket");

        if (isBucketNotFound) {
          const createBucketResult = await supabase.storage.createBucket(
            bucketName,
            { public: true }
          );
          if (createBucketResult.error) {
            const createMsg = String(createBucketResult.error.message ?? "");
            const alreadyExists =
              createMsg.toLowerCase().includes("already exists") ||
              createMsg.toLowerCase().includes("duplicate");
            if (!alreadyExists) {
              return NextResponse.json(
                {
                  success: false,
                  error: `สร้าง bucket ไม่สำเร็จ: ${createBucketResult.error.message}`,
                },
                { status: 500 }
              );
            }
          }

          uploadResult = await uploadOnce();
        }
      }

      if (uploadResult.error) {
        return NextResponse.json(
          { success: false, error: uploadResult.error.message },
          { status: 500 }
        );
      }

      const publicUrlResult = supabase.storage
        .from(bucketName)
        .getPublicUrl(objectPath);

      registrationFile = {
        bucket: bucketName,
        path: objectPath,
        originalName,
        mimeType: registrationFileInput.type || "",
        size: registrationFileInput.size,
        publicUrl: publicUrlResult?.data?.publicUrl ?? "",
      };
    }

    const insertPayload = {
      timestamp: data.timestamp ?? new Date().toISOString(),
      clientCompany: data.clientCompany ?? "",
      companyAddress: data.companyAddress ?? "",
      country: data.country ?? "",
      visitorType: data.visitorType ?? "",
      visitorTypeOther: data.visitorTypeOther ?? "",
      contactPhone: data.contactPhone ?? "",
      purposeOfVisit: data.purposeOfVisit ?? "",
      welcomeMessage: data.welcomeMessage ?? "",
      visitDateTime: visitDateTimeIso || null,
      status: 1,
      meetingRoomSelection,
      transportType,
      submittedBy,
    };

    const { data: insertedVisit, error: insertError } = await supabase
      .from("vip_visitor")
      .insert([insertPayload])
      .select("id")
      .single();

    if (insertError) {
      const msg = String(insertError.message ?? "");
      if (
        msg.includes('column "meetingRoomSelection"') ||
        msg.includes('column "submittedBy"') ||
        msg.includes('column "status"') ||
        msg.includes('column "companyAddress"') ||
        msg.includes('column "country"') ||
        msg.includes('column "visitorType"') ||
        msg.includes('column "visitorTypeOther"') ||
        msg.includes('column "purposeOfVisit"') ||
        msg.includes('column "welcomeMessage"')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ฐานข้อมูลยังไม่มีคอลัมน์สำหรับข้อมูลเพิ่มเติม กรุณาเพิ่มคอลัมน์ companyAddress (text), country (text), visitorType (text), visitorTypeOther (text), purposeOfVisit (text), welcomeMessage (text), meetingRoomSelection (text), submittedBy (jsonb), status (int2) ในตาราง vip_visitor ก่อน',
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    const visitorId = insertedVisit?.id;
    if (!visitorId) {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถสร้างรายการ vip_visitor ได้" },
        { status: 500 }
      );
    }

    const rollback = async () => {
      try {
        await supabase.from("vip_visitor").delete().eq("id", visitorId);
      } catch {}
    };

    if (guests.length > 0) {
      const guestRows = guests.map((guest, index) => ({
        visitorId,
        sortIndex: index,
        prefix: guest?.prefix ?? "",
        firstName: guest?.firstName ?? "",
        middleName: guest?.middleName ?? "",
        lastName: guest?.lastName ?? "",
        position: guest?.position ?? "",
        halal: !!guest?.halal,
        vegan: !!guest?.vegan,
        allergies: Array.isArray(guest?.allergies) ? guest.allergies : [],
        allergyOther: guest?.allergyOther ?? "",
      }));
      const { error: guestError } = await supabase
        .from("vip_visitor_guests")
        .insert(guestRows);
      if (guestError) {
        await rollback();
        const msg = String(guestError.message ?? "");
        if (msg.includes('column "prefix"') || msg.includes('column "halal"') || msg.includes('column "allergies"')) {
          return NextResponse.json(
            {
              success: false,
              error:
                'ฐานข้อมูลยังไม่มีคอลัมน์ใหม่ของผู้เข้าร่วม กรุณาเพิ่มคอลัมน์ prefix (text), halal (boolean), vegan (boolean), allergies (text[]), allergyOther (text) ในตาราง vip_visitor_guests ก่อน',
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { success: false, error: guestError.message },
          { status: 500 }
        );
      }
    }

    if (internalAttendees.length > 0) {
      const internalRows = internalAttendees.map((attendee, index) => ({
        visitorId,
        sortIndex: index,
        firstName: attendee?.firstName ?? "",
        lastName: attendee?.lastName ?? "",
        position: attendee?.position ?? "",
      }));
      const { error: internalError } = await supabase
        .from("vip_visitor_internal_attendees")
        .insert(internalRows);
      if (internalError) {
        await rollback();
        const msg = String(internalError.message ?? "");
        if (msg.includes('relation "vip_visitor_internal_attendees"')) {
          return NextResponse.json(
            {
              success: false,
              error:
                "ฐานข้อมูลยังไม่มีตาราง vip_visitor_internal_attendees กรุณาสร้างตารางสำหรับผู้เข้าร่วมภายในก่อน",
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { success: false, error: internalError.message },
          { status: 500 }
        );
      }
    }

    if (cars.length > 0) {
      const carRows = cars.map((car, index) => ({
        visitorId,
        sortIndex: index,
        brand: car?.brand ?? "",
        license: car?.license ?? "",
      }));
      const { error: carError } = await supabase
        .from("vip_visitor_cars")
        .insert(carRows);
      if (carError) {
        await rollback();
        return NextResponse.json(
          { success: false, error: carError.message },
          { status: 500 }
        );
      }
    }

    if (transportType === "shuttle" && shuttleSchedules.length > 0) {
      const { error: shuttleError } = await supabase
        .from("vip_visitor_shuttle")
        .insert([{ visitorId, schedules: shuttleSchedules }]);
      if (shuttleError) {
        await rollback();
        const msg = String(shuttleError.message ?? "");
        if (msg.includes('relation "vip_visitor_shuttle"')) {
          return NextResponse.json(
            {
              success: false,
              error:
                "ฐานข้อมูลยังไม่มีตาราง vip_visitor_shuttle กรุณาสร้างตารางสำหรับเก็บกำหนดการรถรับ-ส่งก่อน",
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { success: false, error: shuttleError.message },
          { status: 500 }
        );
      }
    }

    if (foodPreferences) {
      const { error: foodError } = await supabase
        .from("vip_visitor_food")
        .insert([{ visitorId, foodPreferences }]);
      if (foodError) {
        await rollback();
        return NextResponse.json(
          { success: false, error: foodError.message },
          { status: 500 }
        );
      }
    }

    if (souvenirPreferences) {
      const { error: souvenirError } = await supabase
        .from("vip_visitor_souvenir")
        .insert([{ visitorId, souvenirPreferences }]);
      if (souvenirError) {
        await rollback();
        return NextResponse.json(
          { success: false, error: souvenirError.message },
          { status: 500 }
        );
      }
    }

    if (siteVisit) {
      const { error: siteVisitError } = await supabase
        .from("vip_visitor_site_visit")
        .insert([{ visitorId, siteVisit }]);
      if (siteVisitError) {
        await rollback();
        return NextResponse.json(
          { success: false, error: siteVisitError.message },
          { status: 500 }
        );
      }
    }

    if (registrationFile) {
      const { error: registrationFileError } = await supabase
        .from("vip_visitor_registration_file")
        .insert([{ visitorId, registrationFile }]);
      if (registrationFileError) {
        await rollback();
        const msg = String(registrationFileError.message ?? "");
        if (msg.includes('column "registrationFile"')) {
          return NextResponse.json(
            {
              success: false,
              error:
                'ฐานข้อมูลยังไม่มีคอลัมน์ registrationFile กรุณาเพิ่มคอลัมน์ registrationFile (jsonb) ในตาราง vip_visitor_registration_file ก่อน',
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { success: false, error: registrationFileError.message },
          { status: 500 }
        );
      }
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM;

    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpPort || Number.isNaN(Number(smtpPort))) missing.push("SMTP_PORT");
    if (!smtpUser) missing.push("SMTP_USER");
    if (!smtpPass) missing.push("SMTP_PASS");
    if (!emailFrom) missing.push("EMAIL_FROM");

    // Fetch from vip_visitor_departments
    const { data: departmentRows, error: departmentError } = await supabase
      .from("vip_visitor_departments")
      .select("id,name,fields,active")
      .eq("active", true);

    const { data: emailRows, error: emailError } = await supabase
      .from("vip_visitor_department_emails")
      .select("department_id,email,active")
      .eq("active", true);

    if (departmentError || emailError) {
      const msg = String(departmentError?.message || emailError?.message || "");
      if (msg.includes('relation "vip_visitor_departments"')) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ฐานข้อมูลยังไม่มีตาราง vip_visitor_departments กรุณาสร้างตารางสำหรับอีเมลผู้รับแผนกต่างๆก่อน",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: departmentError.message },
        { status: 500 }
      );
    }

    if (!departmentRows || departmentRows.length === 0) {
        missing.push("DEPARTMENTS_NOT_CONFIGURED");
    }

    const formatDateTime = (value) => {
      if (!value) {
        return "-";
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return String(value);
      }
      return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(parsed);
    };

    const transportTypeText =
      transportType === "personal"
        ? "รถส่วนตัว"
        : transportType === "shuttle"
          ? "รถรับ-ส่ง"
          : "-";
    const yesNo = (value) => (value ? "ต้องการ" : "ไม่ต้องการ");
    const visitDateTime = formatDateTime(data.visitDateTime);
    const submittedAt = formatDateTime(data.timestamp ?? new Date().toISOString());
    const fpMeals =
      foodPreferences && Array.isArray(foodPreferences.meals)
        ? foodPreferences.meals
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const meals = fpMeals.length > 0 ? fpMeals.join(", ") : "-";
    const foodRequiredText = foodRequired === null ? "-" : yesNo(foodRequired);
    const meetingRoomText = meetingRoom === null ? "-" : yesNo(meetingRoom);
    const souvenirText = souvenir === null ? "-" : yesNo(souvenir);
    const svAreas =
      siteVisit && Array.isArray(siteVisit.areas) ? siteVisit.areas : [];
    const svApproverName =
      siteVisit && typeof siteVisit.approverName === "string"
        ? siteVisit.approverName.trim()
        : "";
    const svApproverPosition =
      siteVisit && typeof siteVisit.approverPosition === "string"
        ? siteVisit.approverPosition.trim()
        : "";
    const siteVisitText =
      svAreas.length > 0
        ? `${svAreas.join(", ")}`
        : "-";
    const siteVisitApproverText =
      svAreas.length > 0
        ? `${svApproverName || "-"} / ${svApproverPosition || "-"}`
        : "-";
    const welcomeMessageText =
      typeof data.welcomeMessage === "string" && data.welcomeMessage.trim()
        ? data.welcomeMessage.trim()
        : "-";

    const sp = souvenirPreferences;
    const spGiftSet =
      sp && typeof sp.giftSet === "string" ? sp.giftSet.trim() : "";
    const spCount =
      sp && Number.isFinite(Number(sp.count)) ? Number(sp.count) : 0;
    const spExtra = sp && typeof sp.extra === "string" ? sp.extra.trim() : "";
    const souvenirDetailText = souvenir
      ? [
          `ประเภท: ${spGiftSet || "-"}`,
          `จำนวนชุด: ${spCount > 0 ? spCount : "-"}`,
          `ของพิเศษ: ${spExtra || "-"}`,
        ].join("\n")
      : "-";

    const fp = foodPreferences;
    const fpMenus =
      fp && typeof fp.menus === "object" && fp.menus ? fp.menus : null;
    const fpSpecialDiet =
      fp && typeof fp.specialDiet === "object" && fp.specialDiet
        ? fp.specialDiet
        : null;

    const menuLines = [];
    if (fpMenus && typeof fpMenus.breakfast === "string" && fpMenus.breakfast.trim()) {
      menuLines.push(`เช้า: ${fpMenus.breakfast}`);
    }
    if (fpMenus && fpMenus.lunch && typeof fpMenus.lunch === "object") {
      const main = typeof fpMenus.lunch.main === "string" ? fpMenus.lunch.main.trim() : "";
      const dessert = typeof fpMenus.lunch.dessert === "string" ? fpMenus.lunch.dessert.trim() : "";
      if (main || dessert) {
        menuLines.push(`กลางวัน: ${main || "-"} | ของหวาน: ${dessert || "-"}`);
      }
    }
    if (fpMenus && fpMenus.dinner && typeof fpMenus.dinner === "object") {
      const main = typeof fpMenus.dinner.main === "string" ? fpMenus.dinner.main.trim() : "";
      const dessert = typeof fpMenus.dinner.dessert === "string" ? fpMenus.dinner.dessert.trim() : "";
      if (main || dessert) {
        menuLines.push(`เย็น: ${main || "-"} | ของหวาน: ${dessert || "-"}`);
      }
    }
    const foodMenuText = menuLines.length > 0 ? menuLines.join("\n") : "-";

    const halalSets =
      fpSpecialDiet && Number.isFinite(Number(fpSpecialDiet.halalSets))
        ? Number(fpSpecialDiet.halalSets)
        : 0;
    const veganSets =
      fpSpecialDiet && Number.isFinite(Number(fpSpecialDiet.veganSets))
        ? Number(fpSpecialDiet.veganSets)
        : 0;
    const dietGuests = [];

    if (guests.length > 0) {
        guests.forEach((guest, index) => {
            const fullName = [guest?.prefix, guest?.firstName, guest?.middleName, guest?.lastName].filter(Boolean).join(" ");
            const nameToUse = fullName || `ผู้เข้าร่วมคนที่ ${index + 1}`;
            
            const dietInfo = [];

            // ฮาลาล/วีแกน
            if (guest?.halal) dietInfo.push("ฮาลาล");
            if (guest?.vegan) dietInfo.push("มังสวิรัติ");

            // แพ้อาหาร
            if (Array.isArray(guest?.allergies) && guest.allergies.length > 0) {
                let allergyDesc = guest.allergies.filter(a => a !== "อื่นๆ" && a !== "ไม่แพ้" && a !== "None").join(", ");
                if (guest.allergies.includes("อื่นๆ") && guest.allergyOther) {
                    allergyDesc += allergyDesc ? `, ${guest.allergyOther}` : guest.allergyOther;
                }
                if (allergyDesc) {
                    dietInfo.push(`แพ้อาหาร: ${allergyDesc}`);
                }
            }

            if (dietInfo.length > 0) {
                dietGuests.push(`- ${nameToUse} : ${dietInfo.join(" ")}`);
            }
        });
    }

    let specialDietText = "-";
    if (dietGuests.length > 0) {
        specialDietText = dietGuests.join("\n");
    } else if (halalSets > 0 || veganSets > 0) {
        // Fallback to total count if no individual data
        specialDietText = `ฮาลาล: ${halalSets || "-"} ชุด, มังสวิรัติ: ${veganSets || "-"} ชุด`;
    }

    const carsText =
      cars.length > 0
        ? cars
            .map(
              (car, index) =>
                `- คันที่ ${index + 1}: ${car?.brand ?? "-"} / ${
                  car?.license ?? "-"
                }`
            )
            .join("\n")
        : "-";
    const shuttleSchedulesText =
      shuttleSchedules.length > 0
        ? shuttleSchedules
            .map(
              (item, index) =>
                `- รายการที่ ${index + 1}: ${item?.date ?? "-"} ${item?.time ?? "-"} | ${
                  item?.pickup ?? "-"
                } -> ${item?.destination ?? "-"}`
            )
            .join("\n")
        : "-";

    const guestsText =
      guests.length > 0
        ? guests
            .map((guest, index) => {
              const fullName = [
                guest?.firstName,
                guest?.middleName,
                guest?.lastName,
              ]
                .filter(Boolean)
                .join(" ");
              const company =
                typeof guest?.company === "string" ? guest.company.trim() : "";
              return `- คนที่ ${index + 1}: ${fullName || "-"} / ${
                company || "-"
              } / ${guest?.position ?? "-"} / ${guest?.nationality ?? "-"}`;
            })
            .join("\n")
        : "-";
    const internalAttendeesText =
      internalAttendees.length > 0
        ? internalAttendees
            .map((attendee, index) => {
              const fullName = [attendee?.firstName, attendee?.lastName]
                .filter(Boolean)
                .join(" ");
              return `- คนที่ ${index + 1}: ${fullName || "-"} / ${
                attendee?.position ?? "-"
              }`;
            })
            .join("\n")
        : "-";

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: true,
          warning: `บันทึกสำเร็จ แต่ระบบอีเมลยังไม่พร้อม (${missing.join(", ")})`,
        },
        { status: 200 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const sbName =
      submittedBy && typeof submittedBy.name === "string"
        ? submittedBy.name.trim()
        : "";
    const sbPosition =
      submittedBy && typeof submittedBy.position === "string"
        ? submittedBy.position.trim()
        : "";
    const submittedByText = sbName
      ? `${sbName} / ${sbPosition || "-"}`
      : "-";

    const mailTasks = [];

    for (const dept of departmentRows) {
      const deptEmails = emailRows.filter(e => e.department_id === dept.id).map(e => e.email);
      if (deptEmails.length === 0) continue;
      
      const fields = Array.isArray(dept.fields) ? dept.fields : [];
      if (fields.length === 0) continue;

      const lines = [`แจ้งการเข้าพบผู้เข้าเยี่ยมชม (ถึงแผนก: ${dept.name})`, `เวลาแจ้ง: ${submittedAt}`];

      if (fields.includes("company")) {
        lines.push(`-- ข้อมูลบริษัท --`);
        lines.push(`ชื่อบริษัทที่เชิญมา: ${data.clientCompany ?? "-"}`);
        lines.push(`ที่อยู่บริษัทที่เชิญมา: ${data.companyAddress ?? "-"}`);
        lines.push(`ประเทศของบริษัทที่เชิญมา: ${data.country ?? "-"}`);
        lines.push(`ประเภทผู้เข้าเยี่ยมชม: ${data.visitorType ?? "-"}${data.visitorTypeOther ? ` - ${data.visitorTypeOther}` : ""}`);
        lines.push(`เบอร์ผู้ประสานงาน: ${data.contactPhone ?? "-"}`);
      }
      
      if (fields.includes("date")) {
        lines.push(`-- วันเวลาที่เข้าเยี่ยมชม --`);
        lines.push(`เวลาที่มาถึง: ${visitDateTime}`);
      }
      
      if (fields.includes("purpose")) {
        lines.push(`-- วัตถุประสงค์ที่เข้าเยี่ยมชม --`);
        lines.push(`วัตถุประสงค์ในการเข้าพบ: ${data.purposeOfVisit ?? "-"}`);
      }

      if (fields.includes("guests")) {
        lines.push(`-- จำนวนและรายชื่อผู้เข้าร่วม --`);
        lines.push(`จำนวนผู้เข้าร่วม: ${totalGuests ?? "-"}`);
        lines.push(`รายชื่อผู้เข้าร่วม:\n${guestsText}`);
      }

      if (fields.includes("cars")) {
        lines.push(`-- ข้อมูลรถเข้า-ออก --`);
        lines.push(`ประเภทรถ: ${transportTypeText}`);
        lines.push(`จำนวนรถ: ${Number.isFinite(carCount) ? carCount : "-"}`);
        if (transportType === "personal") {
            lines.push(`ข้อมูลรถ:\n${carsText}`);
        } else if (transportType === "shuttle") {
            lines.push(`กำหนดการรถรับ-ส่ง:\n${shuttleSchedulesText}`);
        }
      }

      if (fields.includes("meeting_room")) {
        lines.push(`-- ห้องประชุม --`);
        lines.push(`ต้องการห้องประชุม: ${meetingRoomText}`);
        if (meetingRoom) {
            lines.push(`ห้องประชุม: ${meetingRoomSelection || "-"}`);
        }
      }

      if (fields.includes("food")) {
        lines.push(`-- อาหารและของที่ระลึก --`);
        lines.push(`ต้องการอาหาร: ${foodRequiredText}`);
        if (foodRequired) {
            lines.push(`มื้ออาหาร: ${meals}`);
            lines.push(`เมนู: \n${foodMenuText}`);
            lines.push(`อาหารพิเศษและแพ้อาหาร:\n${specialDietText}`);
        }
        lines.push(`ของที่ระลึก: ${souvenirText}`);
        if (souvenir) {
            lines.push(`รายละเอียดของที่ระลึก:\n${souvenirDetailText}`);
        }
      }

      if (fields.includes("site_visit")) {
        lines.push(`-- การเข้าชมพื้นที่ --`);
        lines.push(`การเข้าชม: ${siteVisitText}`);
        lines.push(`ผู้อนุญาต: ${siteVisitApproverText}`);
      }

      if (fields.includes("welcome_board")) {
        lines.push(`-- ข้อความ Welcome Board --`);
        lines.push(`ข้อความ: ${welcomeMessageText}`);
      }

      if (fields.includes("internal")) {
        lines.push(`-- ข้อมูลผู้ดูแลภายใน --`);
        lines.push(`ผู้กรอกฟอร์ม: ${submittedByText}`);
        lines.push(`ผู้เข้าร่วมภายใน:\n${internalAttendeesText}`);
      }

      mailTasks.push(
        transporter.sendMail({
          from: emailFrom,
          to: deptEmails,
          subject: `แจ้งการเข้าพบผู้เข้าเยี่ยมชม - ${dept.name}`,
          text: lines.join("\n"),
        })
      );
    }

    await Promise.all(mailTasks);

    return NextResponse.json({ success: true, emailSent: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
