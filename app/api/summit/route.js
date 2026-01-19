import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import nodemailer from "nodemailer";

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

    const meetingRoom = toBoolean(data.meetingRoom);
    const foodRequired = toBoolean(data.foodRequired);
    const souvenir = toBoolean(data.souvenir);

    const insertPayload = {
      timestamp: data.timestamp ?? new Date().toISOString(),
      clientCompany: data.clientCompany ?? "",
      vipCompany: data.vipCompany ?? "",
      vipPosition: data.vipPosition ?? "",
      nationality: data.nationality ?? "",
      contactPhone: data.contactPhone ?? "",
      totalGuests: data.totalGuests ?? null,
      visitDateTime: data.visitDateTime ?? null,
      meetingRoom,
      transportType: data.transportType ?? "",
      carBrand: data.carBrand ?? "",
      carLicense: data.carLicense ?? "",
      foodRequired,
      meals: data.meals ?? "",
      foodNote: data.foodNote ?? "",
      souvenir,
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

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM;
    const securityEmail = process.env.SECURITY_EMAIL;
    const housekeepingEmail = process.env.HOUSEKEEPING_EMAIL;
    const managerEmail = process.env.MANAGER_EMAIL;

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

    const shouldSendSecurity =
      data.transportType === "personal" &&
      String(data.carBrand ?? "").trim() &&
      String(data.carLicense ?? "").trim();

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

    const housekeepingText = [
      "แจ้งงานสำหรับแม่บ้าน",
      `เวลาที่มาถึง: ${visitDateTime}`,
      `ต้องการอาหาร: ${foodRequiredText}`,
      `มื้ออาหาร: ${meals}`,
      `จำนวนผู้เข้าร่วม: ${data.totalGuests ?? "-"}`,
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
      `เวลาที่มาถึง: ${visitDateTime}`,
      `ต้องการห้องประชุม: ${meetingRoomText}`,
      `ประเภทรถ: ${transportTypeText}`,
      `ยี่ห้อรถ: ${data.carBrand ?? "-"}`,
      `ทะเบียนรถ: ${data.carLicense ?? "-"}`,
      `ต้องการอาหาร: ${foodRequiredText}`,
      `มื้ออาหาร: ${meals}`,
      `หมายเหตุอาหาร: ${data.foodNote ?? "-"}`,
      `ของที่ระลึก: ${souvenirText}`,
      `ผู้ดูแลภายใน: ${data.hostName ?? "-"}`,
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

    if (shouldSendSecurity) {
      const securityText = [
        "แจ้งการเข้าพบแขก VIP (รถส่วนตัว)",
        `เวลาที่มาถึง: ${visitDateTime}`,
        `ยี่ห้อรถ: ${data.carBrand ?? "-"}`,
        `ทะเบียนรถ: ${data.carLicense ?? "-"}`,
        `ผู้ประสานงาน: ${data.contactPhone ?? "-"}`,
        `บริษัทลูกค้า: ${data.clientCompany ?? "-"}`,
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
