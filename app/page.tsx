"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";

type TransportType = "personal" | "public";
type YesNo = "yes" | "no";

type VisitFormState = {
  clientCompany: string;
  vipCompany: string;
  vipPosition: string;
  nationality: string;
  contactPhone: string;
  totalGuests: string;
  visitDate: string;
  visitTime: string;
  meetingRoom: YesNo | "";
  transportType: TransportType | "";
  carBrand: string;
  carLicense: string;
  foodRequired: YesNo | "";
  meals: string[];
  foodNote: string;
  souvenir: YesNo | "";
  hostName: string;
};

type DialogType = "success" | "error";

type DialogState = {
  open: boolean;
  type: DialogType;
  message: string;
};

const timeSlots: string[] = [];
for (let hour = 6; hour <= 21; hour += 1) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
}

const initialState: VisitFormState = {
  clientCompany: "",
  vipCompany: "",
  vipPosition: "",
  nationality: "",
  contactPhone: "",
  totalGuests: "",
  visitDate: "",
  visitTime: "",
  meetingRoom: "",
  transportType: "",
  carBrand: "",
  carLicense: "",
  foodRequired: "",
  meals: [],
  foodNote: "",
  souvenir: "",
  hostName: "",
};

export default function Home() {
  const [form, setForm] = useState<VisitFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "error",
    message: "กรุณากรอกข้อมูลให้ครบถ้วน",
  });
  const [minVisitDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "contactPhone") {
      value = value.replace(/\D/g, "");
    }

    if (name === "foodRequired") {
      return setForm((prev) => ({
        ...prev,
        foodRequired: value as YesNo,
        meals: value === "yes" ? prev.meals : [],
        foodNote: value === "yes" ? prev.foodNote : "",
      }));
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMealsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setForm((prev) => {
      if (checked) {
        if (prev.meals.includes(value)) {
          return prev;
        }
        return {
          ...prev,
          meals: [...prev.meals, value],
        };
      }
      return {
        ...prev,
        meals: prev.meals.filter((meal) => meal !== value),
      };
    });
  };

  const validate = () => {
    const messages: string[] = [];

    if (!form.clientCompany.trim()) {
      messages.push("กรุณากรอกบริษัทลูกค้าที่พาแขก VIP มา");
    }
    if (!form.vipCompany.trim()) {
      messages.push("กรุณากรอกบริษัทของแขก VIP");
    }
    if (!form.vipPosition.trim()) {
      messages.push("กรุณากรอกตำแหน่งของแขก VIP");
    }
    if (!form.nationality.trim()) {
      messages.push("กรุณากรอกสัญชาติ");
    }
    if (!form.contactPhone.trim()) {
      messages.push("กรุณากรอกเบอร์ผู้ประสานงาน");
    }
    if (!form.totalGuests.trim()) {
      messages.push("กรุณากรอกจำนวนผู้เข้าร่วม");
    }
    if (!form.visitDate.trim()) {
      messages.push("กรุณาเลือกวันที่มาถึง");
    }
    if (!form.visitTime.trim()) {
      messages.push("กรุณาเลือกเวลาที่มาถึง");
    }
    if (form.visitDate && form.visitTime) {
      const selected = new Date(`${form.visitDate}T${form.visitTime}`);
      const now = new Date();
      if (selected.getTime() < now.getTime()) {
        messages.push(
          "กรุณาเลือกวันและเวลาที่มาถึงให้เป็นเวลาหลังจากปัจจุบัน"
        );
      }
    }
    if (!form.meetingRoom) {
      messages.push("กรุณาระบุว่าต้องการห้องประชุมหรือไม่");
    }
    if (!form.transportType) {
      messages.push("กรุณาเลือกประเภทรถ");
    }
    if (form.transportType === "personal") {
      if (!form.carBrand.trim()) {
        messages.push("กรุณากรอกยี่ห้อรถสำหรับรถส่วนตัว");
      }
      if (!form.carLicense.trim()) {
        messages.push("กรุณากรอกทะเบียนรถสำหรับรถส่วนตัว");
      }
    }
    if (!form.foodRequired) {
      messages.push("กรุณาระบุว่าจะรับอาหารหรือไม่");
    }
    if (form.foodRequired === "yes" && form.meals.length === 0) {
      messages.push("กรุณาเลือกมื้ออาหารที่ต้องการ");
    }
    if (!form.souvenir) {
      messages.push("กรุณาระบุว่าจะรับของที่ระลึกหรือไม่");
    }
    if (!form.hostName.trim()) {
      messages.push("กรุณากรอกชื่อพนักงานที่ดูแล");
    }

    return messages;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const messages = validate();
    if (messages.length > 0) {
      const combined = messages.join("\n");
      setDialog({
        open: true,
        type: "error",
        message: combined,
      });
      return;
    }

    const visitDateTimeValue =
      form.visitDate && form.visitTime
        ? `${form.visitDate}T${form.visitTime}`
        : "";

    const payload = {
      timestamp: new Date().toISOString(),
      clientCompany: form.clientCompany,
      vipCompany: form.vipCompany,
      vipPosition: form.vipPosition,
      nationality: form.nationality,
      contactPhone: form.contactPhone,
      totalGuests: Number(form.totalGuests),
      visitDateTime: visitDateTimeValue,
      meetingRoom: form.meetingRoom === "yes",
      transportType: form.transportType,
      carBrand: form.transportType === "personal" ? form.carBrand : "",
      carLicense: form.transportType === "personal" ? form.carLicense : "",
      foodRequired: form.foodRequired === "yes",
      meals: form.meals.join(","),
      foodNote: form.foodNote,
      souvenir: form.souvenir === "yes",
      hostName: form.hostName,
    };

    try {
      setSubmitting(true);
      const response = await fetch("/api/summit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        const message =
          result.error ?? `Request failed with status ${response.status}`;
        setDialog({
          open: true,
          type: "error",
          message,
        });
        return;
      }

      setForm(initialState);
      setDialog({
        open: true,
        type: "success",
        message: result.warning
          ? `${result.warning}\nส่งข้อมูลสำเร็จ ขอบคุณค่ะ`
          : "ส่งข้อมูลสำเร็จ ขอบคุณค่ะ",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      setDialog({
        open: true,
        type: "error",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const meetingRoomYes = form.meetingRoom === "yes";
  const transportPersonal = form.transportType === "personal";
  const foodRequiredYes = form.foodRequired === "yes";

  return (
    <div className="min-h-screen bg-[#003951] px-4 py-10 font-sans text-black flex items-center justify-center">
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${
                  dialog.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {dialog.type === "success" ? "✓" : "!"}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-black">
                  {dialog.type === "success" ? "สำเร็จ" : "กรุณาตรวจสอบข้อมูล"}
                </h2>
                <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line text-sm text-zinc-800">
                  {dialog.message}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                onClick={() =>
                  setDialog((prev) => ({
                    ...prev,
                    open: false,
                  }))
                }
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="relative mx-auto w-full max-w-4xl rounded-2xl border border-white/30 bg-white/95 px-8 py-10 shadow-xl">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Sustain Republix logo"
            width={80}
            height={80}
            className="h-20 w-auto"
            priority
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          แบบฟอร์มแจ้งเข้าพบแขก VIP
        </h1>
        <p className="mt-3 text-sm text-zinc-700 text-center">
          กรอกข้อมูลให้ครบถ้วนเพื่อแจ้งหน่วยงานที่เกี่ยวข้อง และบันทึกลงระบบฐานข้อมูล
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              ข้อมูลลูกค้าและแขก VIP
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  บริษัทลูกค้าที่พาแขก VIP มา
                </label>
                <input
                  type="text"
                  name="clientCompany"
                  value={form.clientCompany}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น บริษัท ABC จำกัด"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  แขก VIP มาจากบริษัท
                </label>
                <input
                  type="text"
                  name="vipCompany"
                  value={form.vipCompany}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น บริษัท XYZ จำกัด"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  ตำแหน่งของแขก VIP
                </label>
                <input
                  type="text"
                  name="vipPosition"
                  value={form.vipPosition}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น CEO, Director"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">สัญชาติ</label>
                <input
                  type="text"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น Thai, Japanese"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  เบอร์ลูกค้าที่จะพาแขกมา
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น 08x-xxx-xxxx"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  จำนวนผู้เข้าร่วมทั้งหมด
                </label>
                <input
                  type="number"
                  min={1}
                  name="totalGuests"
                  value={form.totalGuests}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น 5"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              กำหนดการเข้าพบและสถานที่
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  วันที่มาถึง
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={form.visitDate}
                  onChange={handleChange}
                  min={minVisitDate}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  เวลาที่มาถึง
                </label>
                <select
                  name="visitTime"
                  value={form.visitTime}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">เลือกเวลาที่มาถึง</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  ต้องการห้องประชุมหรือไม่
                </label>
                <div className="mt-1 flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="meetingRoom"
                      value="yes"
                      checked={meetingRoomYes}
                      onChange={handleChange}
                    />
                    <span>ต้องการ</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="meetingRoom"
                      value="no"
                      checked={form.meetingRoom === "no"}
                      onChange={handleChange}
                    />
                    <span>ไม่ต้องการ</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">ประเภทรถ</label>
                <select
                  name="transportType"
                  value={form.transportType}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">เลือกประเภทรถ</option>
                  <option value="personal">รถส่วนตัว</option>
                  <option value="public">รถสาธารณะ</option>
                </select>
              </div>

              {transportPersonal && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">ยี่ห้อรถ</label>
                    <input
                      type="text"
                      name="carBrand"
                      value={form.carBrand}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="เช่น Toyota, Honda"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">ทะเบียนรถ</label>
                    <input
                      type="text"
                      name="carLicense"
                      value={form.carLicense}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="เช่น 1กก 1234"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              อาหารและของที่ระลึก
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  ต้องการจัดอาหารหรือไม่
                </label>
                <div className="mt-1 flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="foodRequired"
                      value="yes"
                      checked={foodRequiredYes}
                      onChange={handleChange}
                    />
                    <span>ต้องการ</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="foodRequired"
                      value="no"
                      checked={form.foodRequired === "no"}
                      onChange={handleChange}
                    />
                    <span>ไม่ต้องการ</span>
                  </label>
                </div>
              </div>

              {foodRequiredYes && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    มื้ออาหารที่ต้องการ
                  </label>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="เช้า"
                        checked={form.meals.includes("เช้า")}
                        onChange={handleMealsChange}
                      />
                      <span>เช้า</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="กลางวัน"
                        checked={form.meals.includes("กลางวัน")}
                        onChange={handleMealsChange}
                      />
                      <span>กลางวัน</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="เย็น"
                        checked={form.meals.includes("เย็น")}
                        onChange={handleMealsChange}
                      />
                      <span>เย็น</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                หมายเหตุ/แพ้อาหาร/ไม่รับประทานอะไร
              </label>
              <textarea
                name="foodNote"
                value={form.foodNote}
                onChange={handleChange}
                rows={3}
                disabled={!foodRequiredYes}
                className={`rounded-md border px-3 py-2 text-sm outline-none ${
                  foodRequiredYes
                    ? "border-zinc-300 bg-white focus:border-zinc-900"
                    : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                }`}
                placeholder="ระบุว่าแพ้อาหารอะไร หรือไม่ทานอะไรบ้าง"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">ของที่ระลึก</label>
              <div className="mt-1 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="souvenir"
                    value="yes"
                    checked={form.souvenir === "yes"}
                    onChange={handleChange}
                  />
                  <span>ต้องการ</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="souvenir"
                    value="no"
                    checked={form.souvenir === "no"}
                    onChange={handleChange}
                  />
                  <span>ไม่ต้องการ</span>
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              ข้อมูลผู้ดูแลภายในองค์กร
            </h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                ชื่อพนักงานที่ดูแล/ร่วมคุยกับลูกค้า
              </label>
              <input
                type="text"
                name="hostName"
                value={form.hostName}
                onChange={handleChange}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="ระบุชื่อ-นามสกุล"
              />
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
              onClick={() => {
                setForm(initialState);
                setDialog({
                  open: false,
                  type: "error",
                  message: "มีข้อผิดพลาดบางอย่างเกิดขึ้น กรุณาทำรายการใหม่อีกครั้ง",
                });
              }}
              disabled={submitting}
            >
              ล้างฟอร์ม
            </button>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? "กำลังส่งข้อมูล..." : "ส่งข้อมูล"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
