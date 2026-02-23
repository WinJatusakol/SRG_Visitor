import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
            const file = formData.get("presentationFile");
            const data =
              typeof raw === "string"
                ? JSON.parse(raw)
                : raw && typeof raw === "object"
                  ? JSON.parse(String(raw))
                  : {};
            return { data, file };
          })()
        : { data: await request.json(), file: null };

    const data = parsed.data ?? {};
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

    const meetingRoom = toBoolean(data.meetingRoom);
    const foodRequired = toBoolean(data.foodRequired);
    const souvenir = toBoolean(data.souvenir);

    const guests = Array.isArray(data.guests) ? data.guests : [];
    const cars = Array.isArray(data.cars) ? data.cars : [];
    const carCount =
      typeof data.carCount === "number"
        ? data.carCount
        : Number(data.carCount ?? 0);
    const meetingRoomSelection = String(data.meetingRoomSelection ?? "").trim();
    const siteVisit =
      data.siteVisit &&
      typeof data.siteVisit === "object" &&
      !Array.isArray(data.siteVisit)
        ? data.siteVisit
        : null;
    const executiveHost =
      data.executiveHost &&
      typeof data.executiveHost === "object" &&
      !Array.isArray(data.executiveHost)
        ? data.executiveHost
        : null;
    const submittedBy =
      data.submittedBy &&
      typeof data.submittedBy === "object" &&
      !Array.isArray(data.submittedBy)
        ? data.submittedBy
        : null;
    const foodPreferences =
      data.foodPreferences &&
      typeof data.foodPreferences === "object" &&
      !Array.isArray(data.foodPreferences)
        ? data.foodPreferences
        : null;
    const souvenirPreferences =
      data.souvenirPreferences &&
      typeof data.souvenirPreferences === "object" &&
      !Array.isArray(data.souvenirPreferences)
        ? data.souvenirPreferences
        : null;

    const presentationFileInput = parsed.file;
    const bucketName =
      process.env.SUPABASE_PRESENTATION_BUCKET || "vip_visitor_attachments";
    const toSafeFilename = (value) =>
      String(value || "")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, " ")
        .trim();

    let presentationFile = null;
    if (presentationFileInput && presentationFileInput instanceof File) {
      const maxSize = 10 * 1024 * 1024;
      if (presentationFileInput.size > maxSize) {
        return NextResponse.json(
          { success: false, error: "ไฟล์แนบใหญ่เกินไป (สูงสุด 10MB)" },
          { status: 400 }
        );
      }

      const originalName = toSafeFilename(presentationFileInput.name);
      const fileExt = originalName.includes(".")
        ? originalName.split(".").pop()
        : "";
      const datedPrefix = new Date().toISOString().slice(0, 10);
      const objectPath = `${datedPrefix}/${randomUUID()}${
        fileExt ? `.${fileExt}` : ""
      }`;
      const arrayBuffer = await presentationFileInput.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const uploadResult = await supabase.storage
        .from(bucketName)
        .upload(objectPath, bytes, {
          contentType:
            presentationFileInput.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadResult.error) {
        return NextResponse.json(
          { success: false, error: uploadResult.error.message },
          { status: 500 }
        );
      }

      const publicUrlResult = supabase.storage
        .from(bucketName)
        .getPublicUrl(objectPath);

      presentationFile = {
        bucket: bucketName,
        path: objectPath,
        originalName,
        mimeType: presentationFileInput.type || "",
        size: presentationFileInput.size,
        publicUrl: publicUrlResult?.data?.publicUrl ?? "",
      };
    }

    const insertPayload = {
      timestamp: data.timestamp ?? new Date().toISOString(),
      clientCompany: data.clientCompany ?? "",
      vipCompany: data.vipCompany ?? "",
      vipPosition: data.vipPosition ?? "",
      nationality: data.nationality ?? "",
      contactPhone: data.contactPhone ?? "",
      totalGuests: data.totalGuests ?? null,
      guests: guests.length > 0 ? guests : null,
      visitTopic: data.visitTopic ?? "",
      visitDetail: data.visitDetail ?? "",
      visitDateTime: data.visitDateTime ?? null,
      meetingRoom,
      meetingRoomSelection,
      siteVisit,
      executiveHost,
      transportType: data.transportType ?? "",
      carCount: Number.isFinite(carCount) ? carCount : null,
      cars: cars.length > 0 ? cars : null,
      carBrand: data.carBrand ?? "",
      carLicense: data.carLicense ?? "",
      foodRequired,
      meals: data.meals ?? "",
      foodPreferences,
      souvenir,
      souvenirPreferences,
      presentationFile,
      hostName: data.hostName ?? "",
      submittedBy,
    };

    const { error } = await supabase
      .from("vip_visitor")
      .insert([insertPayload]);

    if (error) {
      const msg = String(error.message ?? "");
      if (
        msg.includes('column "guests"') ||
        msg.includes('column "cars"') ||
        msg.includes('column "carCount"') ||
        msg.includes('column "meetingRoomSelection"') ||
        msg.includes('column "siteVisit"') ||
        msg.includes('column "executiveHost"') ||
        msg.includes('column "foodPreferences"') ||
        msg.includes('column "souvenirPreferences"') ||
        msg.includes('column "presentationFile"') ||
        msg.includes('column "submittedBy"')
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'ฐานข้อมูลยังไม่มีคอลัมน์สำหรับข้อมูลเพิ่มเติม กรุณาเพิ่มคอลัมน์ guests (jsonb), cars (jsonb), carCount (int), meetingRoomSelection (text), siteVisit (jsonb), executiveHost (jsonb), foodPreferences (jsonb), souvenirPreferences (jsonb), presentationFile (jsonb), submittedBy (jsonb) ในตาราง vip_visitor ก่อน',
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM;
    const securityEmail = process.env.SECURITY_EMAIL;
    const housekeepingEmail = process.env.HOUSEKEEPING_EMAIL;
    const managerEmail = process.env.MANAGER_EMAIL;
    const hostEmailMapRaw = process.env.HOST_EMAIL_MAP;

    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpPort || Number.isNaN(Number(smtpPort))) missing.push("SMTP_PORT");
    if (!smtpUser) missing.push("SMTP_USER");
    if (!smtpPass) missing.push("SMTP_PASS");
    if (!emailFrom) missing.push("EMAIL_FROM");
    if (!housekeepingEmail) missing.push("HOUSEKEEPING_EMAIL");
    if (!managerEmail) missing.push("MANAGER_EMAIL");

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
        timeZone: "Asia/Bangkok",
      }).format(parsed);
    };

    const transportTypeText =
      data.transportType === "personal"
        ? "รถส่วนตัว"
        : data.transportType === "public"
          ? "รถสาธารณะ"
          : "-";
    const yesNo = (value) => (value ? "ต้องการ" : "ไม่ต้องการ");
    const visitDateTime = formatDateTime(data.visitDateTime);
    const submittedAt = formatDateTime(data.timestamp ?? new Date().toISOString());
    const meals = data.meals ?? "-";
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
    const fpAllergies =
      fp && typeof fp.allergies === "object" && fp.allergies ? fp.allergies : null;

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
    const specialDietText =
      halalSets > 0 || veganSets > 0
        ? `ฮาลาล: ${halalSets || "-"} ชุด, วีแกน: ${veganSets || "-"} ชุด`
        : "-";

    const allergyItems =
      fpAllergies && Array.isArray(fpAllergies.items) ? fpAllergies.items : [];
    const allergyOther =
      fpAllergies && typeof fpAllergies.other === "string"
        ? fpAllergies.other.trim()
        : "";
    const allergyTextParts = [];
    if (allergyItems.length > 0) {
      allergyTextParts.push(allergyItems.join(", "));
    }
    if (allergyOther) {
      allergyTextParts.push(`อื่นๆ: ${allergyOther}`);
    }
    const allergyText = allergyTextParts.length > 0 ? allergyTextParts.join(" | ") : "-";

    const shouldSendSecurity =
      data.transportType === "personal" &&
      cars.length > 0 &&
      String(cars[0]?.brand ?? data.carBrand ?? "").trim() &&
      String(cars[0]?.license ?? data.carLicense ?? "").trim();

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
              return `- คนที่ ${index + 1}: ${fullName || "-"} / ${
                guest?.position ?? "-"
              } / ${guest?.nationality ?? "-"}`;
            })
            .join("\n")
        : "-";

    if (shouldSendSecurity && !securityEmail) {
      return NextResponse.json(
        {
          success: true,
          warning: "บันทึกสำเร็จ แต่ยังไม่ได้ตั้งค่า SECURITY_EMAIL",
        },
        { status: 200 }
      );
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: true,
          warning: `บันทึกสำเร็จ แต่ยังไม่ได้ตั้งค่าอีเมล: ${missing.join(", ")}`,
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

    let hostEmailMap = null;
    if (hostEmailMapRaw && String(hostEmailMapRaw).trim()) {
      try {
        const parsed = JSON.parse(String(hostEmailMapRaw));
        if (parsed && typeof parsed === "object") {
          hostEmailMap = parsed;
        }
      } catch {}
    }

    const hostName = String(data.hostName ?? "").trim();
    const hostEmail =
      hostEmailMap && hostName && typeof hostEmailMap[hostName] === "string"
        ? String(hostEmailMap[hostName]).trim()
        : "";

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

    const exType =
      executiveHost && typeof executiveHost.type === "string"
        ? executiveHost.type
        : "";
    const executiveHostText = (() => {
      if (exType === "other") {
        const firstName =
          typeof executiveHost.firstName === "string"
            ? executiveHost.firstName.trim()
            : "";
        const middleName =
          typeof executiveHost.middleName === "string"
            ? executiveHost.middleName.trim()
            : "";
        const lastName =
          typeof executiveHost.lastName === "string"
            ? executiveHost.lastName.trim()
            : "";
        const position =
          typeof executiveHost.position === "string"
            ? executiveHost.position.trim()
            : "";
        const fullName = [firstName, middleName, lastName]
          .filter(Boolean)
          .join(" ");
        if (!fullName && !position) return "-";
        return `${fullName || "-"} / ${position || "-"}`;
      }

      const presetName =
        executiveHost && typeof executiveHost.name === "string"
          ? executiveHost.name.trim()
          : "";
      return presetName || "-";
    })();

    const housekeepingText = [
      "แจ้งงานสำหรับแม่บ้าน",
      `เข้ามาพบ: ${data.hostName ?? "-"}`,
      `ผู้บริหารต้อนรับ: ${executiveHostText}`,
      `หัวข้อ: ${data.visitTopic ?? "-"}`,
      `เวลาที่มาถึง: ${visitDateTime}`,
      `ต้องการอาหาร: ${foodRequiredText}`,
      `มื้ออาหาร: ${meals}`,
      `เมนู: \n${foodMenuText}`,
      `อาหารพิเศษ: ${specialDietText}`,
      `แพ้อาหาร: ${allergyText}`,
      `การเข้าชม: ${siteVisitText}`,
      `ผู้อนุญาต: ${siteVisitApproverText}`,
      `จำนวนผู้เข้าร่วม: ${data.totalGuests ?? "-"}`,
      `ของที่ระลึก: ${souvenirText}`,
      `รายละเอียดของที่ระลึก:\n${souvenirDetailText}`,
      `ผู้กรอกฟอร์ม: ${submittedByText}`,
    ].join("\n");

    const managerText = [
      "แจ้งการเข้าพบแขก VIP",
      `เวลาแจ้ง: ${submittedAt}`,
      `บริษัทลูกค้า: ${data.clientCompany ?? "-"}`,
      `บริษัทแขก VIP: ${data.vipCompany ?? "-"}`,
      `ตำแหน่งแขก VIP: ${data.vipPosition ?? "-"}`,
      `สัญชาติ: ${data.nationality ?? "-"}`,
      `เบอร์ผู้ประสานงาน: ${data.contactPhone ?? "-"}`,
      `จำนวนผู้เข้าร่วม: ${data.totalGuests ?? "-"}`,
      `เข้ามาพบ: ${data.hostName ?? "-"}`,
      `หัวข้อ: ${data.visitTopic ?? "-"}`,
      `รายละเอียด: ${data.visitDetail ?? "-"}`,
      `รายชื่อผู้เข้าร่วม:\n${guestsText}`,
      `เวลาที่มาถึง: ${visitDateTime}`,
      `ต้องการห้องประชุม: ${meetingRoomText}`,
      `ห้องประชุม: ${meetingRoom ? meetingRoomSelection || "-" : "-"}`,
      `การเข้าชม: ${siteVisitText}`,
      `ผู้อนุญาต: ${siteVisitApproverText}`,
      `ผู้บริหารต้อนรับ: ${executiveHostText}`,
      `ประเภทรถ: ${transportTypeText}`,
      `จำนวนรถ: ${Number.isFinite(carCount) ? carCount : "-"}`,
      `ข้อมูลรถ:\n${carsText}`,
      `ต้องการอาหาร: ${foodRequiredText}`,
      `มื้ออาหาร: ${meals}`,
      `เมนู: \n${foodMenuText}`,
      `อาหารพิเศษ: ${specialDietText}`,
      `แพ้อาหาร: ${allergyText}`,
      `ของที่ระลึก: ${souvenirText}`,
      `รายละเอียดของที่ระลึก:\n${souvenirDetailText}`,
      `ผู้กรอกฟอร์ม: ${submittedByText}`,
    ].join("\n");

    const hostText = [
      "แจ้งการเข้าพบ (ผู้ถูกเข้าพบ)",
      `เวลาแจ้ง: ${submittedAt}`,
      `เข้ามาพบ: ${data.hostName ?? "-"}`,
      `หัวข้อ: ${data.visitTopic ?? "-"}`,
      `รายละเอียด: ${data.visitDetail ?? "-"}`,
      `เวลาที่มาถึง: ${visitDateTime}`,
      `บริษัทลูกค้า: ${data.clientCompany ?? "-"}`,
      `บริษัทแขก VIP: ${data.vipCompany ?? "-"}`,
      `ตำแหน่งแขก VIP: ${data.vipPosition ?? "-"}`,
      `เบอร์ผู้ประสานงาน: ${data.contactPhone ?? "-"}`,
      `จำนวนผู้เข้าร่วม: ${data.totalGuests ?? "-"}`,
      `รายชื่อผู้เข้าร่วม:\n${guestsText}`,
      `ประเภทรถ: ${transportTypeText}`,
      `จำนวนรถ: ${Number.isFinite(carCount) ? carCount : "-"}`,
      `ข้อมูลรถ:\n${carsText}`,
      `ต้องการห้องประชุม: ${meetingRoomText}`,
      `ห้องประชุม: ${meetingRoom ? meetingRoomSelection || "-" : "-"}`,
      `การเข้าชม: ${siteVisitText}`,
      `ผู้อนุญาต: ${siteVisitApproverText}`,
      `ผู้บริหารต้อนรับ: ${executiveHostText}`,
      `ต้องการอาหาร: ${foodRequiredText}`,
      `มื้ออาหาร: ${meals}`,
      `เมนู: \n${foodMenuText}`,
      `อาหารพิเศษ: ${specialDietText}`,
      `แพ้อาหาร: ${allergyText}`,
      `ของที่ระลึก: ${souvenirText}`,
      `รายละเอียดของที่ระลึก:\n${souvenirDetailText}`,
      `ผู้กรอกฟอร์ม: ${submittedByText}`,
    ].join("\n");

    const mailTasks = [
      transporter.sendMail({
        from: emailFrom,
        to: housekeepingEmail,
        subject: "แจ้งการเข้าพบ VIP (แม่บ้าน)",
        text: housekeepingText,
      }),
      transporter.sendMail({
        from: emailFrom,
        to: managerEmail,
        subject: "แจ้งการเข้าพบ VIP (ผู้จัดการ)",
        text: managerText,
      }),
    ];

    if (hostEmail) {
      mailTasks.push(
        transporter.sendMail({
          from: emailFrom,
          to: hostEmail,
          subject: "แจ้งการเข้าพบ VIP (ผู้ถูกเข้าพบ)",
          text: hostText,
        })
      );
    }

    if (shouldSendSecurity) {
      const securityText = [
        "แจ้งการเข้าพบแขก VIP (รถส่วนตัว)",
        `เข้ามาพบ: ${data.hostName ?? "-"}`,
        `ผู้บริหารต้อนรับ: ${executiveHostText}`,
        `หัวข้อ: ${data.visitTopic ?? "-"}`,
        `เวลาที่มาถึง: ${visitDateTime}`,
        `จำนวนรถ: ${Number.isFinite(carCount) ? carCount : "-"}`,
        `ข้อมูลรถ:\n${carsText}`,
        `ห้องประชุม: ${meetingRoom ? meetingRoomSelection || "-" : "-"}`,
        `ผู้ประสานงาน: ${data.contactPhone ?? "-"}`,
        `บริษัทลูกค้า: ${data.clientCompany ?? "-"}`,
        `ผู้กรอกฟอร์ม: ${submittedByText}`,
      ].join("\n");

      mailTasks.push(
        transporter.sendMail({
          from: emailFrom,
          to: securityEmail,
          subject: "แจ้งการเข้าพบ VIP (ยาม)",
          text: securityText,
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
