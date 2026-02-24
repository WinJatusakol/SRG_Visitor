"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type TransportType = "personal" | "public";
type YesNo = "yes" | "no";

type Guest = {
  firstName: string;
  middleName: string;
  lastName: string;
  company: string;
  position: string;
  nationality: string;
};

type Car = {
  brand: string;
  license: string;
};

type VisitFormState = {
  clientCompany: string;
  vipCompany: string;
  nationality: string;
  contactPhone: string;
  totalGuests: string;
  guests: Guest[];
  visitTopic: string;
  visitDetail: string;
  visitDate: string;
  visitTime: string;
  meetingRoom: YesNo | "";
  meetingRoomSelection: string;
  siteVisitAreas: string[];
  siteVisitApproverName: string;
  siteVisitApproverPosition: string;
  transportType: TransportType | "";
  carCount: string;
  cars: Car[];
  foodRequired: YesNo | "";
  meals: string[];
  breakfastMenu: string;
  breakfastMenuOther: string;
  lunchMenu: string;
  lunchMenuOther: string;
  lunchDessert: string;
  lunchDessertOther: string;
  dinnerMenu: string;
  dinnerMenuOther: string;
  dinnerDessert: string;
  dinnerDessertOther: string;
  halalEnabled: boolean;
  halalCount: string;
  veganEnabled: boolean;
  veganCount: string;
  allergies: string[];
  allergyOther: string;
  souvenir: YesNo | "";
  souvenirGiftSet: string;
  souvenirGiftSetCount: string;
  souvenirExtra: string;
  submittedByName: string;
  submittedByPosition: string;
  hostName: string;
  hostNameOther: string;
  executiveHostChoice: string;
  executiveHostFirstName: string;
  executiveHostMiddleName: string;
  executiveHostLastName: string;
  executiveHostPosition: string;
};

type DialogType = "success" | "error";

type Lang = "th" | "en";

type DialogState = {
  open: boolean;
  type: DialogType;
  message: string;
};

type RefOptionRow = {
  value: string;
  label_th: string | null;
  label_en: string | null;
  sort_index?: number | null;
  active?: boolean | null;
};

type MeetingRoomRow = {
  code: string;
  name_th: string | null;
  name_en: string | null;
  location_th: string | null;
  location_en: string | null;
  capacity: number | null;
  sort_index?: number | null;
  active?: boolean | null;
};

const timeSlots: string[] = [];
for (let hour = 6; hour <= 21; hour += 1) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
}

const fallbackHostOptions: RefOptionRow[] = [
  { value: "Name1", label_th: "Name1", label_en: "Name1", sort_index: 1, active: true },
  { value: "Name2", label_th: "Name2", label_en: "Name2", sort_index: 2, active: true },
];

const fallbackExecutiveHostOptions: RefOptionRow[] = [
  { value: "Name01", label_th: "Name01", label_en: "Name01", sort_index: 1, active: true },
  { value: "Name02", label_th: "Name02", label_en: "Name02", sort_index: 2, active: true },
  { value: "Name03", label_th: "Name03", label_en: "Name03", sort_index: 3, active: true },
];

const fallbackMeetingRoomOptions: MeetingRoomRow[] = [
  {
    code: "001",
    name_th: "ห้องประชุมใหญ่",
    name_en: "Main meeting room",
    location_th: "อาคาร 1 ชั้น 3",
    location_en: "Building 1, Floor 3",
    capacity: 10,
  },
  {
    code: "002",
    name_th: "ห้องประชุมเล็ก",
    name_en: "Small meeting room",
    location_th: "อาคาร 1 ชั้น 2",
    location_en: "Building 1, Floor 2",
    capacity: 6,
  },
  {
    code: "003",
    name_th: "ห้องประชุม A",
    name_en: "Meeting room A",
    location_th: "อาคาร 2 ชั้น 4",
    location_en: "Building 2, Floor 4",
    capacity: 12,
  },
  {
    code: "004",
    name_th: "ห้องประชุม B",
    name_en: "Meeting room B",
    location_th: "อาคาร 2 ชั้น 4",
    location_en: "Building 2, Floor 4",
    capacity: 8,
  },
];

const fallbackSiteVisitAreaOptions: RefOptionRow[] = [
  { value: "โรงงาน", label_th: "โรงงาน", label_en: "Factory", sort_index: 1, active: true },
  { value: "QC", label_th: "QC", label_en: "QC", sort_index: 2, active: true },
  { value: "Warehouse", label_th: "คลังสินค้า", label_en: "Warehouse", sort_index: 3, active: true },
  { value: "Lab", label_th: "ห้องแล็บ", label_en: "Lab", sort_index: 4, active: true },
];

const breakfastMenuOptions = [
  "ขนมปังปิ้ง + เนย/แยม",
  "โจ๊กหมู + ไข่ลวก",
  "ข้าวต้มไก่ + เครื่องเคียง",
  "อื่นๆ",
];

const lunchMenuOptions = [
  "ข้าวกะเพราไก่ + ไข่ดาว",
  "ข้าวผัดอเมริกัน",
  "ผัดไทยกุ้งสด",
  "อื่นๆ",
];

const lunchDessertOptions = ["ผลไม้รวม", "พุดดิ้งนมสด", "บราวนี่ช็อกโกแลต", "อื่นๆ"];

const dinnerMenuOptions = [
  "ข้าวหน้าไก่เทอริยากิ",
  "สเต๊กปลาแซลมอน + สลัด",
  "สปาเก็ตตี้ซอสเห็ดครีม",
  "อื่นๆ",
];

const dinnerDessertOptions = ["ไอศกรีมวานิลลา", "เค้กมะพร้าวอ่อน", "บัวลอยน้ำขิง", "อื่นๆ"];

const allergyOptions = ["ทะเล", "ถั่ว", "นม", "ไข่", "กลูเตน", "งา", "อื่นๆ"];

const fallbackSouvenirGiftSetOptions: RefOptionRow[] = [
  { value: "Giftset 01", label_th: "Giftset 01", label_en: "Giftset 01", sort_index: 1, active: true },
  { value: "Giftset 02", label_th: "Giftset 02", label_en: "Giftset 02", sort_index: 2, active: true },
  { value: "Giftset 03", label_th: "Giftset 03", label_en: "Giftset 03", sort_index: 3, active: true },
];

const createEmptyGuest = (): Guest => ({
  firstName: "",
  middleName: "",
  lastName: "",
  company: "",
  position: "",
  nationality: "",
});

const createEmptyCar = (): Car => ({
  brand: "",
  license: "",
});

const initialState: VisitFormState = {
  clientCompany: "",
  vipCompany: "",
  nationality: "",
  contactPhone: "",
  totalGuests: "",
  guests: [],
  visitTopic: "",
  visitDetail: "",
  visitDate: "",
  visitTime: "",
  meetingRoom: "",
  meetingRoomSelection: "",
  siteVisitAreas: [],
  siteVisitApproverName: "",
  siteVisitApproverPosition: "",
  transportType: "",
  carCount: "",
  cars: [],
  foodRequired: "",
  meals: [],
  breakfastMenu: "",
  breakfastMenuOther: "",
  lunchMenu: "",
  lunchMenuOther: "",
  lunchDessert: "",
  lunchDessertOther: "",
  dinnerMenu: "",
  dinnerMenuOther: "",
  dinnerDessert: "",
  dinnerDessertOther: "",
  halalEnabled: false,
  halalCount: "",
  veganEnabled: false,
  veganCount: "",
  allergies: [],
  allergyOther: "",
  souvenir: "",
  souvenirGiftSet: "",
  souvenirGiftSetCount: "",
  souvenirExtra: "",
  submittedByName: "",
  submittedByPosition: "",
  hostName: "",
  hostNameOther: "",
  executiveHostChoice: "",
  executiveHostFirstName: "",
  executiveHostMiddleName: "",
  executiveHostLastName: "",
  executiveHostPosition: "",
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("th");
  const [form, setForm] = useState<VisitFormState>(initialState);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "error",
    message: "",
  });
  const [minVisitDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );

  const [hostOptions, setHostOptions] =
    useState<RefOptionRow[]>(fallbackHostOptions);
  const [executiveHostOptions, setExecutiveHostOptions] = useState<
    RefOptionRow[]
  >(fallbackExecutiveHostOptions);
  const [meetingRoomOptions, setMeetingRoomOptions] = useState<MeetingRoomRow[]>(
    fallbackMeetingRoomOptions
  );
  const [siteVisitAreaOptions, setSiteVisitAreaOptions] = useState<
    RefOptionRow[]
  >(fallbackSiteVisitAreaOptions);
  const [souvenirGiftSetOptions, setSouvenirGiftSetOptions] = useState<
    RefOptionRow[]
  >(fallbackSouvenirGiftSetOptions);

  const t = (th: string, en: string) => (lang === "th" ? th : en);
  const optionLabel = (option: RefOptionRow) =>
    lang === "th"
      ? (option.label_th ?? option.value)
      : (option.label_en ?? option.value);
  const meetingRoomLabel = (room: MeetingRoomRow, targetLang: Lang) => {
    const capacity = Number(room.capacity ?? 0);
    const name = targetLang === "th" ? room.name_th : room.name_en;
    const location = targetLang === "th" ? room.location_th : room.location_en;
    const displayName = (name ?? room.name_th ?? room.code ?? "").trim();
    const displayLocation = (location ?? room.location_th ?? "").trim();
    const parts = [room.code, displayName, displayLocation].filter(Boolean);
    const base = parts.join(" ").trim();
    return targetLang === "th"
      ? `${base} (ความจุ ${capacity} คน)`
      : `${base} (Capacity ${capacity})`;
  };
  const mealLabel = (value: string) => {
    if (value === "เช้า") return t("เช้า", "Breakfast");
    if (value === "กลางวัน") return t("กลางวัน", "Lunch");
    if (value === "เย็น") return t("เย็น", "Dinner");
    return value;
  };

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [hosts, executives, rooms, areas, giftSets] = await Promise.all([
        supabase
          .from("ref_hosts")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("ref_executive_hosts")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("ref_meeting_rooms")
          .select(
            "code,name_th,name_en,location_th,location_en,capacity,sort_index,active"
          )
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("code", { ascending: true }),
        supabase
          .from("ref_site_visit_areas")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("ref_souvenir_gift_sets")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
      ]);

      if (!hosts.error && Array.isArray(hosts.data) && hosts.data.length > 0) {
        setHostOptions(hosts.data as RefOptionRow[]);
      }
      if (
        !executives.error &&
        Array.isArray(executives.data) &&
        executives.data.length > 0
      ) {
        setExecutiveHostOptions(executives.data as RefOptionRow[]);
      }
      if (!rooms.error && Array.isArray(rooms.data) && rooms.data.length > 0) {
        setMeetingRoomOptions(rooms.data as MeetingRoomRow[]);
      }
      if (!areas.error && Array.isArray(areas.data) && areas.data.length > 0) {
        setSiteVisitAreaOptions(areas.data as RefOptionRow[]);
      }
      if (
        !giftSets.error &&
        Array.isArray(giftSets.data) &&
        giftSets.data.length > 0
      ) {
        setSouvenirGiftSetOptions(giftSets.data as RefOptionRow[]);
      }
    };

    void load();
  }, []);

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

    if (name === "totalGuests") {
      value = value.replace(/\D/g, "");
      return setForm((prev) => {
        const count = Number(value || 0);
        const nextGuests = Array.from(
          { length: Math.max(0, count) },
          (_, index) => prev.guests[index] ?? createEmptyGuest()
        );
        return {
          ...prev,
          totalGuests: value,
          guests: nextGuests,
        };
      });
    }

    if (name === "halalCount" || name === "veganCount") {
      value = value.replace(/\D/g, "");
    }
    if (name === "souvenirGiftSetCount") {
      value = value.replace(/\D/g, "");
    }

    if (name === "breakfastMenu" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        breakfastMenu: value,
        breakfastMenuOther: "",
      }));
    }
    if (name === "lunchMenu" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        lunchMenu: value,
        lunchMenuOther: "",
      }));
    }
    if (name === "lunchDessert" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        lunchDessert: value,
        lunchDessertOther: "",
      }));
    }
    if (name === "dinnerMenu" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        dinnerMenu: value,
        dinnerMenuOther: "",
      }));
    }
    if (name === "dinnerDessert" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        dinnerDessert: value,
        dinnerDessertOther: "",
      }));
    }

    if (name === "meetingRoom") {
      return setForm((prev) => ({
        ...prev,
        meetingRoom: value as YesNo,
        meetingRoomSelection: value === "yes" ? prev.meetingRoomSelection : "",
      }));
    }

    if (name === "foodRequired") {
      return setForm((prev) => ({
        ...prev,
        foodRequired: value as YesNo,
        meals: value === "yes" ? prev.meals : [],
        breakfastMenu: value === "yes" ? prev.breakfastMenu : "",
        breakfastMenuOther: value === "yes" ? prev.breakfastMenuOther : "",
        lunchMenu: value === "yes" ? prev.lunchMenu : "",
        lunchMenuOther: value === "yes" ? prev.lunchMenuOther : "",
        lunchDessert: value === "yes" ? prev.lunchDessert : "",
        lunchDessertOther: value === "yes" ? prev.lunchDessertOther : "",
        dinnerMenu: value === "yes" ? prev.dinnerMenu : "",
        dinnerMenuOther: value === "yes" ? prev.dinnerMenuOther : "",
        dinnerDessert: value === "yes" ? prev.dinnerDessert : "",
        dinnerDessertOther: value === "yes" ? prev.dinnerDessertOther : "",
        halalEnabled: value === "yes" ? prev.halalEnabled : false,
        halalCount: value === "yes" ? prev.halalCount : "",
        veganEnabled: value === "yes" ? prev.veganEnabled : false,
        veganCount: value === "yes" ? prev.veganCount : "",
        allergies: value === "yes" ? prev.allergies : [],
        allergyOther: value === "yes" ? prev.allergyOther : "",
      }));
    }

    if (name === "souvenir") {
      return setForm((prev) => ({
        ...prev,
        souvenir: value as YesNo,
        souvenirGiftSet: value === "yes" ? prev.souvenirGiftSet : "",
        souvenirGiftSetCount: value === "yes" ? prev.souvenirGiftSetCount : "",
        souvenirExtra: value === "yes" ? prev.souvenirExtra : "",
      }));
    }

    if (name === "executiveHostChoice") {
      return setForm((prev) => ({
        ...prev,
        executiveHostChoice: value,
        executiveHostFirstName: value === "อื่นๆ" ? prev.executiveHostFirstName : "",
        executiveHostMiddleName: value === "อื่นๆ" ? prev.executiveHostMiddleName : "",
        executiveHostLastName: value === "อื่นๆ" ? prev.executiveHostLastName : "",
        executiveHostPosition: value === "อื่นๆ" ? prev.executiveHostPosition : "",
      }));
    }

    if (name === "hostName" && value !== "อื่นๆ") {
      return setForm((prev) => ({
        ...prev,
        hostName: value,
        hostNameOther: "",
      }));
    }

    if (name === "transportType") {
      return setForm((prev) => ({
        ...prev,
        transportType: value as TransportType,
        carCount: value === "personal" ? prev.carCount : "",
        cars: value === "personal" ? prev.cars : [],
      }));
    }

    if (name === "carCount") {
      value = value.replace(/\D/g, "");
      return setForm((prev) => {
        const count = Number(value || 0);
        const nextCars = Array.from(
          { length: Math.max(0, count) },
          (_, index) => prev.cars[index] ?? createEmptyCar()
        );
        return {
          ...prev,
          carCount: value,
          cars: nextCars,
        };
      });
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSiteVisitAreaChange = (value: string, checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        return prev.siteVisitAreas.includes(value)
          ? prev
          : { ...prev, siteVisitAreas: [...prev.siteVisitAreas, value] };
      }

      const nextAreas = prev.siteVisitAreas.filter((area) => area !== value);
      return {
        ...prev,
        siteVisitAreas: nextAreas,
        siteVisitApproverName: nextAreas.length > 0 ? prev.siteVisitApproverName : "",
        siteVisitApproverPosition: nextAreas.length > 0 ? prev.siteVisitApproverPosition : "",
      };
    });
  };

  const handleDietToggle = (key: "halal" | "vegan") => {
    setForm((prev) => {
      if (key === "halal") {
        const nextEnabled = !prev.halalEnabled;
        return {
          ...prev,
          halalEnabled: nextEnabled,
          halalCount: nextEnabled ? prev.halalCount : "",
        };
      }
      const nextEnabled = !prev.veganEnabled;
      return {
        ...prev,
        veganEnabled: nextEnabled,
        veganCount: nextEnabled ? prev.veganCount : "",
      };
    });
  };

  const handleAllergyChange = (value: string, checked: boolean) => {
    setForm((prev) => {
      const next = checked
        ? prev.allergies.includes(value)
          ? prev.allergies
          : [...prev.allergies, value]
        : prev.allergies.filter((item) => item !== value);
      return {
        ...prev,
        allergies: next,
        allergyOther: next.includes("อื่นๆ") ? prev.allergyOther : "",
      };
    });
  };

  const handleGuestChange = (
    index: number,
    field: keyof Guest,
    value: string
  ) => {
    setForm((prev) => {
      const nextGuests = prev.guests.map((guest, i) =>
        i === index ? { ...guest, [field]: value } : guest
      );
      return { ...prev, guests: nextGuests };
    });
  };

  const handleCarChange = (index: number, field: keyof Car, value: string) => {
    setForm((prev) => {
      const nextCars = prev.cars.map((car, i) =>
        i === index ? { ...car, [field]: value } : car
      );
      return { ...prev, cars: nextCars };
    });
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
      const nextMeals = prev.meals.filter((meal) => meal !== value);
      return {
        ...prev,
        meals: nextMeals,
        breakfastMenu: nextMeals.includes("เช้า") ? prev.breakfastMenu : "",
        breakfastMenuOther: nextMeals.includes("เช้า") ? prev.breakfastMenuOther : "",
        lunchMenu: nextMeals.includes("กลางวัน") ? prev.lunchMenu : "",
        lunchMenuOther: nextMeals.includes("กลางวัน") ? prev.lunchMenuOther : "",
        lunchDessert: nextMeals.includes("กลางวัน") ? prev.lunchDessert : "",
        lunchDessertOther: nextMeals.includes("กลางวัน") ? prev.lunchDessertOther : "",
        dinnerMenu: nextMeals.includes("เย็น") ? prev.dinnerMenu : "",
        dinnerMenuOther: nextMeals.includes("เย็น") ? prev.dinnerMenuOther : "",
        dinnerDessert: nextMeals.includes("เย็น") ? prev.dinnerDessert : "",
        dinnerDessertOther: nextMeals.includes("เย็น") ? prev.dinnerDessertOther : "",
      };
    });
  };

  const validate = () => {
    const messages: string[] = [];
    const maxPresentationFileSize = 10 * 1024 * 1024;

    if (!form.clientCompany.trim()) {
      messages.push(
        t(
          "กรุณากรอกบริษัทของคุณ",
          "Please enter your company."
        )
      );
    }
    if (!form.vipCompany.trim()) {
      messages.push(
        t(
          "กรุณากรอกบริษัทของแขก VIP",
          "Please enter the VIP guest company."
        )
      );
    }
    if (!form.nationality.trim()) {
      messages.push(t("กรุณากรอกสัญชาติบริษัท", "Please enter the company nationality."));
    }
    if (!form.contactPhone.trim()) {
      messages.push(
        t(
          "กรุณากรอกเบอร์ผู้ประสานงาน",
          "Please enter the contact phone number."
        )
      );
    }
    if (!form.totalGuests.trim()) {
      messages.push(
        t(
          "กรุณากรอกจำนวนผู้เข้าร่วม",
          "Please enter the total number of attendees."
        )
      );
    }
    if (Number(form.totalGuests || 0) > 0) {
      const expectedCount = Number(form.totalGuests || 0);
      for (let index = 0; index < expectedCount; index += 1) {
        const guest = form.guests[index];
        if (!guest) {
          messages.push(
            t(
              `กรุณากรอกข้อมูลผู้เข้าร่วมคนที่ ${index + 1} ให้ครบ`,
              `Please complete attendee #${index + 1}.`
            )
          );
          continue;
        }
        if (!guest.firstName.trim()) {
          messages.push(
            t(
              `กรุณากรอกชื่อผู้เข้าร่วมคนที่ ${index + 1}`,
              `Please enter attendee #${index + 1} first name.`
            )
          );
        }
        if (!guest.lastName.trim()) {
          messages.push(
            t(
              `กรุณากรอกนามสกุลผู้เข้าร่วมคนที่ ${index + 1}`,
              `Please enter attendee #${index + 1} last name.`
            )
          );
        }
        if (!guest.position.trim()) {
          messages.push(
            t(
              `กรุณากรอกตำแหน่งผู้เข้าร่วมคนที่ ${index + 1}`,
              `Please enter attendee #${index + 1} position.`
            )
          );
        }
        if (!guest.nationality.trim()) {
          messages.push(
            t(
              `กรุณากรอกสัญชาติผู้เข้าร่วมคนที่ ${index + 1}`,
              `Please enter attendee #${index + 1} nationality.`
            )
          );
        }
      }
    }
    if (!form.visitTopic.trim()) {
      messages.push(
        t("กรุณากรอกหัวข้อที่จะเข้ามา", "Please enter the visit topic.")
      );
    }
    if (!form.visitDetail.trim()) {
      messages.push(
        t("กรุณากรอกรายละเอียด", "Please enter the visit details.")
      );
    }
    if (!form.visitDate.trim()) {
      messages.push(
        t("กรุณาเลือกวันที่มาถึง", "Please select the arrival date.")
      );
    }
    if (!form.visitTime.trim()) {
      messages.push(
        t("กรุณาเลือกเวลาที่มาถึง", "Please select the arrival time.")
      );
    }
    if (form.visitDate && form.visitTime) {
      const selected = new Date(`${form.visitDate}T${form.visitTime}`);
      const now = new Date();
      if (selected.getTime() < now.getTime()) {
        messages.push(
          t(
            "กรุณาเลือกวันและเวลาที่มาถึงให้เป็นเวลาหลังจากปัจจุบัน",
            "Please choose an arrival date/time in the future."
          )
        );
      }
    }
    if (!form.meetingRoom) {
      messages.push(
        t(
          "กรุณาระบุว่าต้องการห้องประชุมหรือไม่",
          "Please specify whether a meeting room is needed."
        )
      );
    }
    if (form.meetingRoom === "yes" && !form.meetingRoomSelection.trim()) {
      messages.push(
        t("กรุณาเลือกห้องประชุม", "Please select a meeting room.")
      );
    }
    if (form.siteVisitAreas.length > 0) {
      if (!form.siteVisitApproverName.trim()) {
        messages.push(
          t(
            "กรุณากรอกชื่อผู้อนุญาตให้เข้าชม",
            "Please enter the site visit approver name."
          )
        );
      }
      if (!form.siteVisitApproverPosition.trim()) {
        messages.push(
          t(
            "กรุณากรอกตำแหน่งผู้อนุญาตให้เข้าชม",
            "Please enter the site visit approver position."
          )
        );
      }
    }
    if (!form.transportType) {
      messages.push(
        t("กรุณาเลือกประเภทรถ", "Please select the transport type.")
      );
    }
    if (form.transportType === "personal") {
      const count = Number(form.carCount || 0);
      if (!form.carCount.trim() || count <= 0) {
        messages.push(
          t(
            "กรุณากรอกจำนวนรถสำหรับรถส่วนตัว",
            "Please enter the number of private cars."
          )
        );
      } else {
        for (let index = 0; index < count; index += 1) {
          const car = form.cars[index];
          if (!car) {
            messages.push(
              t(
                `กรุณากรอกข้อมูลรถคันที่ ${index + 1} ให้ครบ`,
                `Please complete car #${index + 1} information.`
              )
            );
            continue;
          }
          if (!car.brand.trim()) {
            messages.push(
              t(
                `กรุณากรอกยี่ห้อรถคันที่ ${index + 1}`,
                `Please enter car #${index + 1} brand.`
              )
            );
          }
          if (!car.license.trim()) {
            messages.push(
              t(
                `กรุณากรอกทะเบียนรถคันที่ ${index + 1}`,
                `Please enter car #${index + 1} license plate.`
              )
            );
          }
        }
      }
    }
    if (!form.foodRequired) {
      messages.push(
        t(
          "กรุณาระบุว่าจะรับอาหารหรือไม่",
          "Please specify whether catering is needed."
        )
      );
    }
    if (form.foodRequired === "yes" && form.meals.length === 0) {
      messages.push(t("กรุณาเลือกมื้ออาหารที่ต้องการ", "Please select meal(s)."));
    }
    if (form.foodRequired === "yes") {
      if (form.meals.includes("เช้า") && !form.breakfastMenu.trim()) {
        messages.push(
          t(
            "กรุณาเลือกเมนูอาหารเช้า",
            "Please select the breakfast menu."
          )
        );
      }
      if (form.meals.includes("เช้า") && form.breakfastMenu === "อื่นๆ" && !form.breakfastMenuOther.trim()) {
        messages.push(
          t(
            "กรุณาระบุเมนูอาหารเช้า (อื่นๆ)",
            "Please specify the breakfast menu (Other)."
          )
        );
      }
      if (form.meals.includes("กลางวัน")) {
        if (!form.lunchMenu.trim()) {
          messages.push(
            t("กรุณาเลือกเมนูอาหารกลางวัน", "Please select the lunch menu.")
          );
        }
        if (form.lunchMenu === "อื่นๆ" && !form.lunchMenuOther.trim()) {
          messages.push(
            t(
              "กรุณาระบุเมนูอาหารกลางวัน (อื่นๆ)",
              "Please specify the lunch menu (Other)."
            )
          );
        }
        if (!form.lunchDessert.trim()) {
          messages.push(
            t(
              "กรุณาเลือกของหวาน (กลางวัน)",
              "Please select the lunch dessert."
            )
          );
        }
        if (form.lunchDessert === "อื่นๆ" && !form.lunchDessertOther.trim()) {
          messages.push(
            t(
              "กรุณาระบุของหวาน (กลางวัน) (อื่นๆ)",
              "Please specify the lunch dessert (Other)."
            )
          );
        }
      }
      if (form.meals.includes("เย็น")) {
        if (!form.dinnerMenu.trim()) {
          messages.push(
            t("กรุณาเลือกเมนูอาหารเย็น", "Please select the dinner menu.")
          );
        }
        if (form.dinnerMenu === "อื่นๆ" && !form.dinnerMenuOther.trim()) {
          messages.push(
            t(
              "กรุณาระบุเมนูอาหารเย็น (อื่นๆ)",
              "Please specify the dinner menu (Other)."
            )
          );
        }
        if (!form.dinnerDessert.trim()) {
          messages.push(
            t("กรุณาเลือกของหวาน (เย็น)", "Please select the dinner dessert.")
          );
        }
        if (form.dinnerDessert === "อื่นๆ" && !form.dinnerDessertOther.trim()) {
          messages.push(
            t(
              "กรุณาระบุของหวาน (เย็น) (อื่นๆ)",
              "Please specify the dinner dessert (Other)."
            )
          );
        }
      }
      if (form.halalEnabled && Number(form.halalCount || 0) <= 0) {
        messages.push(
          t(
            "กรุณาระบุจำนวนชุดอาหารฮาลาล",
            "Please specify the number of Halal meal sets."
          )
        );
      }
      if (form.veganEnabled && Number(form.veganCount || 0) <= 0) {
        messages.push(
          t(
            "กรุณาระบุจำนวนชุดอาหารวีแกน",
            "Please specify the number of Vegan meal sets."
          )
        );
      }
      if (form.allergies.includes("อื่นๆ") && !form.allergyOther.trim()) {
        messages.push(
          t(
            "กรุณาระบุรายการแพ้อาหาร (อื่นๆ)",
            "Please specify allergy item(s) (Other)."
          )
        );
      }
    }
    if (!form.souvenir) {
      messages.push(
        t(
          "กรุณาระบุว่าจะรับของที่ระลึกหรือไม่",
          "Please specify whether souvenirs are needed."
        )
      );
    }
    if (form.souvenir === "yes") {
      if (!form.souvenirGiftSet.trim()) {
        messages.push(
          t("กรุณาเลือกประเภทของที่ระลึก", "Please select a souvenir type.")
        );
      }
      const count = Number(form.souvenirGiftSetCount || 0);
      if (!form.souvenirGiftSetCount.trim() || count <= 0) {
        messages.push(
          t(
            "กรุณาระบุจำนวนชุดของที่ระลึก",
            "Please specify the number of souvenir sets."
          )
        );
      }
    }
    if (!form.hostName.trim()) {
      messages.push(
        t("กรุณาเลือกผู้ที่จะเข้ามาพบ", "Please select the person to visit.")
      );
    }
    if (form.hostName === "อื่นๆ" && !form.hostNameOther.trim()) {
      messages.push(
        t(
          "กรุณาระบุบุคคลที่เข้าพบ (อื่นๆ)",
          "Please specify the person to visit (Other)."
        )
      );
    }
    if (!form.executiveHostChoice.trim()) {
      messages.push(
        t(
          "กรุณาเลือกผู้บริหารที่จะมาดูแลต้อนรับแขก",
          "Please select the welcoming executive."
        )
      );
    }
    if (form.executiveHostChoice === "อื่นๆ") {
      if (!form.executiveHostFirstName.trim()) {
        messages.push(
          t(
            "กรุณากรอกชื่อผู้บริหาร (อื่นๆ)",
            "Please enter executive first name (Other)."
          )
        );
      }
      if (!form.executiveHostLastName.trim()) {
        messages.push(
          t(
            "กรุณากรอกนามสกุลผู้บริหาร (อื่นๆ)",
            "Please enter executive last name (Other)."
          )
        );
      }
      if (!form.executiveHostPosition.trim()) {
        messages.push(
          t(
            "กรุณากรอกตำแหน่งผู้บริหาร (อื่นๆ)",
            "Please enter executive position (Other)."
          )
        );
      }
    }
    if (!form.submittedByName.trim()) {
      messages.push(
        t(
          "กรุณากรอกชื่อผู้กรอกฟอร์ม",
          "Please enter the form submitter name."
        )
      );
    }
    if (!form.submittedByPosition.trim()) {
      messages.push(
        t(
          "กรุณากรอกตำแหน่งผู้กรอกฟอร์ม",
          "Please enter the form submitter position."
        )
      );
    }
    if (presentationFile && presentationFile.size > maxPresentationFileSize) {
      messages.push(
        t(
          "ไฟล์แนบใหญ่เกินไป (สูงสุด 10MB)",
          "Attachment too large (max 10MB)."
        )
      );
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

    const cars = form.transportType === "personal" ? form.cars : [];

    const siteVisit =
      form.siteVisitAreas.length > 0
        ? {
            areas: form.siteVisitAreas,
            approverName: form.siteVisitApproverName,
            approverPosition: form.siteVisitApproverPosition,
          }
        : null;

    const foodPreferences =
      form.foodRequired === "yes"
        ? {
            meals: form.meals,
            menus: {
              breakfast: form.meals.includes("เช้า")
                ? form.breakfastMenu === "อื่นๆ"
                  ? form.breakfastMenuOther
                  : form.breakfastMenu
                : "",
              lunch: form.meals.includes("กลางวัน")
                ? {
                    main:
                      form.lunchMenu === "อื่นๆ"
                        ? form.lunchMenuOther
                        : form.lunchMenu,
                    dessert:
                      form.lunchDessert === "อื่นๆ"
                        ? form.lunchDessertOther
                        : form.lunchDessert,
                  }
                : { main: "", dessert: "" },
              dinner: form.meals.includes("เย็น")
                ? {
                    main:
                      form.dinnerMenu === "อื่นๆ"
                        ? form.dinnerMenuOther
                        : form.dinnerMenu,
                    dessert:
                      form.dinnerDessert === "อื่นๆ"
                        ? form.dinnerDessertOther
                        : form.dinnerDessert,
                  }
                : { main: "", dessert: "" },
            },
            specialDiet: {
              halalSets: form.halalEnabled ? Number(form.halalCount || 0) : 0,
              veganSets: form.veganEnabled ? Number(form.veganCount || 0) : 0,
            },
            allergies: {
              items: form.allergies,
              other: form.allergyOther,
            },
          }
        : null;

    const souvenirPreferences =
      form.souvenir === "yes"
        ? {
            giftSet: form.souvenirGiftSet,
            count: Number(form.souvenirGiftSetCount || 0),
            extra: form.souvenirExtra,
          }
        : null;

    const executiveHost =
      form.executiveHostChoice === "อื่นๆ"
        ? {
            type: "other",
            firstName: form.executiveHostFirstName,
            middleName: form.executiveHostMiddleName,
            lastName: form.executiveHostLastName,
            position: form.executiveHostPosition,
          }
        : {
            type: "preset",
            name: form.executiveHostChoice,
          };

    const submittedBy = {
      name: form.submittedByName,
      position: form.submittedByPosition,
    };

    const payload = {
      timestamp: new Date().toISOString(),
      clientCompany: form.clientCompany,
      vipCompany: form.vipCompany,
      nationality: form.nationality,
      contactPhone: form.contactPhone,
      guests: form.guests,
      visitTopic: form.visitTopic,
      visitDetail: form.visitDetail,
      visitDateTime:
        form.visitDate && form.visitTime
          ? `${form.visitDate}T${form.visitTime}`
          : "",
      meetingRoomSelection: form.meetingRoomSelection || "",
      siteVisit,
      transportType: form.transportType,
      cars,
      foodPreferences,
      souvenirPreferences,
      executiveHost,
      hostName: form.hostName === "อื่นๆ" ? form.hostNameOther : form.hostName,
      submittedBy,
    };

    try {
      setSubmitting(true);
      const response = await (async () => {
        if (!presentationFile) {
          return fetch("/api/summit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
        }

        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        formData.append("presentationFile", presentationFile);
        return fetch("/api/summit", {
          method: "POST",
          body: formData,
        });
      })();
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
      setPresentationFile(null);
      setDialog({
        open: true,
        type: "success",
        message: result.warning
          ? `${result.warning}\n${t(
              "ส่งข้อมูลสำเร็จ ขอบคุณค่ะ",
              "Submitted successfully. Thank you."
            )}`
          : t("ส่งข้อมูลสำเร็จ ขอบคุณค่ะ", "Submitted successfully. Thank you."),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
              "An error occurred. Please try again."
            );
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
  const guestsCount = Number(form.totalGuests || 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#6b7d58_0%,#788B64_38%,#E2CCA8_78%,#FAEFCC_100%)] px-4 py-10 font-sans text-[#142015] flex justify-center">
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E2CCA8] bg-[#FAEFCC] px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${
                  dialog.type === "success"
                    ? "bg-[#788B64]/15 text-[#2F3B2B]"
                    : "bg-[#E2CCA8] text-[#2F3B2B]"
                }`}
              >
                {dialog.type === "success" ? "✓" : "!"}
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[#2F3B2B]">
                  {dialog.type === "success"
                    ? t("สำเร็จ", "Success")
                    : t("กรุณาตรวจสอบข้อมูล", "Please review the form")}
                </h2>
                <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line text-sm text-[#2F3B2B]">
                  {dialog.message}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-full bg-[#788B64] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#6b7d58] focus:outline-none focus:ring-2 focus:ring-[#788B64]/35"
                onClick={() =>
                  setDialog((prev) => ({
                    ...prev,
                    open: false,
                  }))
                }
              >
                {t("ปิด", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="relative mx-auto w-full max-w-6xl rounded-2xl border border-[#E2CCA8]/80 bg-[#FAEFCC]/90 px-6 py-8 shadow-[0_16px_50px_rgba(0,0,0,0.18)] md:px-10 md:py-10">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Image
              src="/mainlogo.png"
              alt="Main logo"
              width={360}
              height={120}
              className="h-16 w-auto"
              priority
            />
            <Image
              src="/EpacLogo.png"
              alt="EPAC logo"
              width={160}
              height={160}
              className="h-16 w-auto"
              priority
            />
          </div>
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang("th")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                lang === "th"
                  ? "border-[#788B64] bg-[#788B64] text-white"
                  : "border-[#E2CCA8] bg-white/70 text-[#1b2a18] hover:border-[#788B64]"
              }`}
            >
              ไทย
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                lang === "en"
                  ? "border-[#788B64] bg-[#788B64] text-white"
                  : "border-[#E2CCA8] bg-white/70 text-[#1b2a18] hover:border-[#788B64]"
              }`}
            >
              EN
            </button>
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-[#2F3B2B] md:text-3xl">
          {t("แบบฟอร์มแจ้งเข้าพบแขก VIP", "VIP Visitor Notification Form")}
        </h1>
        <p className="mt-3 text-center text-sm text-[#2F3B2B]/80">
          {t(
            "กรอกข้อมูลให้ครบถ้วนเพื่อแจ้งหน่วยงานที่เกี่ยวข้อง และบันทึกลงระบบฐานข้อมูล",
            "Fill in the details to notify related departments and record the visit."
          )}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="h-fit rounded-2xl border border-[#E2CCA8]/80 bg-white/55 p-5 backdrop-blur lg:sticky lg:top-6">
            <div className="text-sm font-semibold text-[#1b2a18]">
              {t("ไปยังส่วนที่ต้องกรอก", "Jump to section")}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-[#1b2a18]/75">
              {t(
                "คลิกเพื่อเลื่อนไปยังหัวข้อ และกดส่งข้อมูลที่แถบด้านล่าง",
                "Click to jump to a section, then submit using the bottom bar."
              )}
            </div>
            <nav className="mt-4 space-y-2 text-sm">
              <a
                href="#section-1"
                className="block rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("1) ข้อมูลลูกค้าและแขก", "1) Client & Guests")}
              </a>
              <a
                href="#section-2"
                className="block rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("2) กำหนดการและสถานที่", "2) Schedule & Location")}
              </a>
              <a
                href="#section-3"
                className="block rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("3) อาหารและของที่ระลึก", "3) Catering & Souvenirs")}
              </a>
              <a
                href="#section-4"
                className="block rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("4) ไฟล์สำหรับการประชุม", "4) Meeting File")}
              </a>
              <a
                href="#section-5"
                className="block rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("5) ผู้ดูแลภายในองค์กร", "5) Internal Contacts")}
              </a>
            </nav>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="min-w-0 space-y-6 [&_section]:scroll-mt-24 [&_section]:rounded-2xl [&_section]:border [&_section]:border-[#E2CCA8] [&_section]:bg-white/70 [&_section]:px-5 [&_section]:py-6 [&_label]:text-sm [&_label]:font-medium [&_label]:text-[#1b2a18] [&_input[type='checkbox']]:accent-[#788B64] [&_input[type='radio']]:accent-[#788B64] [&_input:not([type='checkbox']):not([type='radio'])]:rounded-lg [&_input:not([type='checkbox']):not([type='radio'])]:border [&_input:not([type='checkbox']):not([type='radio'])]:border-[#E2CCA8] [&_input:not([type='checkbox']):not([type='radio'])]:bg-white [&_input:not([type='checkbox']):not([type='radio'])]:px-3 [&_input:not([type='checkbox']):not([type='radio'])]:py-2 [&_input:not([type='checkbox']):not([type='radio'])]:text-sm [&_input:not([type='checkbox']):not([type='radio'])]:outline-none [&_input:not([type='checkbox']):not([type='radio'])]:transition [&_input:not([type='checkbox']):not([type='radio'])]:focus:border-[#788B64] [&_input:not([type='checkbox']):not([type='radio'])]:focus:ring-2 [&_input:not([type='checkbox']):not([type='radio'])]:focus:ring-[#788B64]/30 [&_select]:rounded-lg [&_select]:border [&_select]:border-[#E2CCA8] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:outline-none [&_select]:transition [&_select]:focus:border-[#788B64] [&_select]:focus:ring-2 [&_select]:focus:ring-[#788B64]/30 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#E2CCA8] [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-[#788B64] [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#788B64]/30"
          >
            <section
              id="section-1"
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5"
            >
              <h2 className="flex items-center gap-3 text-base font-semibold text-[#1b2a18]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#788B64] text-sm font-semibold text-white">
                  1
                </span>
                <span>{t("ข้อมูลลูกค้าและแขก VIP", "Client & VIP Guest Info")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "ข้อมูลบริษัทและรายชื่อผู้เข้าร่วม",
                  "Company information and attendee list."
                )}
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t(
                    "บริษัทของคุณ",
                    "Your company (bringing VIP guest)"
                  )}
                </label>
                <input
                  type="text"
                  name="clientCompany"
                  value={form.clientCompany}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น บริษัท ABC จำกัด", "e.g., ABC Co., Ltd.")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("แขก VIP มาจากบริษัท", "VIP guest company")}
                </label>
                <input
                  type="text"
                  name="vipCompany"
                  value={form.vipCompany}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น บริษัท XYZ จำกัด", "e.g., XYZ Co., Ltd.")}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("สัญชาติ", "Nationality")}
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น Thai, Japanese", "e.g., Thai, Japanese")}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("เบอร์ผู้ประสานงาน", "Contact phone")}
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น 08x-xxx-xxxx", "e.g., +66 xx xxx xxxx")}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("จำนวนผู้เข้าร่วมทั้งหมด", "Total attendees")}
                </label>
                <input
                  type="number"
                  min={1}
                  name="totalGuests"
                  value={form.totalGuests}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น 5", "e.g., 5")}
                />
              </div>
            </div>

            {guestsCount > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-zinc-900">
                  {t("รายชื่อผู้เข้าร่วม", "Attendees")}
                </div>
                <div className="space-y-4">
                  {Array.from({ length: guestsCount }, (_, index) => {
                    const guest = form.guests[index] ?? createEmptyGuest();
                    return (
                      <div
                        key={String(index)}
                        className="rounded-lg border border-zinc-200 bg-white p-5"
                      >
                        <div className="text-sm font-semibold text-zinc-900">
                          {t("ผู้เข้าร่วมคนที่", "Attendee")} {index + 1}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          <input
                            type="text"
                            value={guest.firstName}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "firstName",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("ชื่อ", "First name")}
                          />
                          <input
                            type="text"
                            value={guest.middleName}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "middleName",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("ชื่อกลาง (ถ้ามี)", "Middle name (optional)")}
                          />
                          <input
                            type="text"
                            value={guest.lastName}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "lastName",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("นามสกุล", "Last name")}
                          />
                          <input
                            type="text"
                            value={guest.company}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "company",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("บริษัท", "Company")}
                          />
                          <input
                            type="text"
                            value={guest.position}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "position",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("ตำแหน่ง", "Position")}
                          />
                          <input
                            type="text"
                            value={guest.nationality}
                            onChange={(e) =>
                              handleGuestChange(
                                index,
                                "nationality",
                                e.target.value
                              )
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            placeholder={t("สัญชาติ", "Nationality")}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

            <section
              id="section-2"
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5"
            >
              <h2 className="flex items-center gap-3 text-base font-semibold text-[#1b2a18]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#788B64] text-sm font-semibold text-white">
                  2
                </span>
                <span>{t("กำหนดการเข้าพบและสถานที่", "Schedule & Location")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "วันเวลา ห้องประชุม การเข้าชม และข้อมูลรถ",
                  "Date/time, meeting room, site visit, and transport details."
                )}
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("วันที่มาถึง", "Arrival date")}
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
                  {t("เวลาที่มาถึง", "Arrival time")}
                </label>
                <select
                  name="visitTime"
                  value={form.visitTime}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">{t("เลือกเวลาที่มาถึง", "Select arrival time")}</option>
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
                  {t("ต้องการห้องประชุมหรือไม่", "Meeting room needed?")}
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
                    <span>{t("ต้องการ", "Yes")}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="meetingRoom"
                      value="no"
                      checked={form.meetingRoom === "no"}
                      onChange={handleChange}
                    />
                    <span>{t("ไม่ต้องการ", "No")}</span>
                  </label>
                </div>

                {meetingRoomYes && (
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("เลือกห้องประชุม", "Select meeting room")}
                    </label>
                    <select
                      name="meetingRoomSelection"
                      value={form.meetingRoomSelection}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    >
                      <option value="">
                        {t("เลือกห้องประชุม", "Select meeting room")}
                      </option>
                      {meetingRoomOptions.map((room) => {
                        const value = meetingRoomLabel(room, "th");
                        const label = meetingRoomLabel(room, lang);
                        return (
                          <option key={room.code} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ประเภทรถ", "Transport type")}
                </label>
                <select
                  name="transportType"
                  value={form.transportType}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">
                    {t("เลือกประเภทรถ", "Select transport type")}
                  </option>
                  <option value="personal">{t("รถส่วนตัว", "Private car")}</option>
                  <option value="public">
                    {t("รถสาธารณะ", "Public transport")}
                  </option>
                </select>
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    {t("การเข้าชม", "Site visit")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {siteVisitAreaOptions.map((item) => (
                      <label key={item.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.siteVisitAreas.includes(item.value)}
                          onChange={(e) =>
                            handleSiteVisitAreaChange(item.value, e.target.checked)
                          }
                        />
                        <span>{optionLabel(item)}</span>
                      </label>
                    ))}
                  </div>

                  {form.siteVisitAreas.length > 0 && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">
                          {t("ชื่อผู้อนุญาตให้เข้าชม", "Site visit approver")}
                        </label>
                        <input
                          type="text"
                          name="siteVisitApproverName"
                          value={form.siteVisitApproverName}
                          onChange={handleChange}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          placeholder={t("เช่น นาย/นาง ...", "e.g., Mr./Ms. ...")}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">
                          {t("ตำแหน่ง", "Position")}
                        </label>
                        <input
                          type="text"
                          name="siteVisitApproverPosition"
                          value={form.siteVisitApproverPosition}
                          onChange={handleChange}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          placeholder={t("เช่น Manager", "e.g., Manager")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {transportPersonal && (
                <div className="space-y-3 md:col-span-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">
                        {t("จำนวนรถ", "Number of cars")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        name="carCount"
                        value={form.carCount}
                        onChange={handleChange}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                        placeholder={t("เช่น 2", "e.g., 2")}
                      />
                    </div>
                  </div>

                  {Number(form.carCount || 0) > 0 && (
                    <div className="space-y-4">
                      {Array.from(
                        { length: Number(form.carCount || 0) },
                        (_, index) => {
                          const car = form.cars[index] ?? createEmptyCar();
                          return (
                            <div
                              key={String(index)}
                              className="rounded-lg border border-zinc-200 bg-white p-4"
                            >
                              <div className="text-sm font-semibold text-zinc-900">
                                รถคันที่ {index + 1}
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <input
                                  type="text"
                                  value={car.brand}
                                  onChange={(e) =>
                                    handleCarChange(
                                      index,
                                      "brand",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t(
                                    "ยี่ห้อรถ เช่น Toyota, Honda",
                                    "Car brand e.g., Toyota, Honda"
                                  )}
                                />
                                <input
                                  type="text"
                                  value={car.license}
                                  onChange={(e) =>
                                    handleCarChange(
                                      index,
                                      "license",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t(
                                    "ทะเบียนรถ เช่น 1กก 1234",
                                    "Car license e.g., 1กก 1234"
                                  )}
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

            <section
              id="section-3"
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5"
            >
              <h2 className="flex items-center gap-3 text-base font-semibold text-[#1b2a18]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#788B64] text-sm font-semibold text-white">
                  3
                </span>
                <span>{t("อาหารและของที่ระลึก", "Catering & Souvenirs")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "เลือกเฉพาะที่ต้องการ ระบบจะซ่อนช่องที่ไม่เกี่ยวข้อง",
                  "Select what you need. Irrelevant fields will be hidden."
                )}
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ต้องการจัดอาหารหรือไม่", "Food required?")}
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
                    <span>{t("ต้องการ", "Yes")}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="foodRequired"
                      value="no"
                      checked={form.foodRequired === "no"}
                      onChange={handleChange}
                    />
                    <span>{t("ไม่ต้องการ", "No")}</span>
                  </label>
                </div>
              </div>

              {foodRequiredYes && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("มื้ออาหารที่ต้องการ", "Meals")}
                  </label>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="เช้า"
                        checked={form.meals.includes("เช้า")}
                        onChange={handleMealsChange}
                      />
                      <span>{mealLabel("เช้า")}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="กลางวัน"
                        checked={form.meals.includes("กลางวัน")}
                        onChange={handleMealsChange}
                      />
                      <span>{mealLabel("กลางวัน")}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value="เย็น"
                        checked={form.meals.includes("เย็น")}
                        onChange={handleMealsChange}
                      />
                      <span>{mealLabel("เย็น")}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {foodRequiredYes && (
              <div className="space-y-4">
                {(form.meals.includes("เช้า") ||
                  form.meals.includes("กลางวัน") ||
                  form.meals.includes("เย็น")) && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      {t("เลือกเมนูอาหาร", "Select menu")}
                    </div>

                    {form.meals.includes("เช้า") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            {t("อาหารเช้า", "Breakfast")}
                          </label>
                          <select
                            name="breakfastMenu"
                            value={form.breakfastMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">
                              {t("เลือกเมนูอาหารเช้า", "Select breakfast menu")}
                            </option>
                            {breakfastMenuOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.breakfastMenu === "อื่นๆ" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t(
                                "ระบุอาหารเช้า (อื่นๆ)",
                                "Specify breakfast (Other)"
                              )}
                            </label>
                            <input
                              type="text"
                              name="breakfastMenuOther"
                              value={form.breakfastMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t(
                                "เช่น แซนด์วิชทูน่า",
                                "e.g., tuna sandwich"
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {form.meals.includes("กลางวัน") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            {t("อาหารกลางวัน", "Lunch")}
                          </label>
                          <select
                            name="lunchMenu"
                            value={form.lunchMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">
                              {t("เลือกเมนูอาหารกลางวัน", "Select lunch menu")}
                            </option>
                            {lunchMenuOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.lunchMenu === "อื่นๆ" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t(
                                "ระบุอาหารกลางวัน (อื่นๆ)",
                                "Specify lunch (Other)"
                              )}
                            </label>
                            <input
                              type="text"
                              name="lunchMenuOther"
                              value={form.lunchMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t(
                                "เช่น ข้าวมันไก่",
                                "e.g., chicken rice"
                              )}
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            {t("ของหวาน (กลางวัน)", "Dessert (Lunch)")}
                          </label>
                          <select
                            name="lunchDessert"
                            value={form.lunchDessert}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">{t("เลือกของหวาน", "Select dessert")}</option>
                            {lunchDessertOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.lunchDessert === "อื่นๆ" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t(
                                "ระบุของหวาน (กลางวัน) (อื่นๆ)",
                                "Specify dessert (Lunch) (Other)"
                              )}
                            </label>
                            <input
                              type="text"
                              name="lunchDessertOther"
                              value={form.lunchDessertOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t(
                                "เช่น เค้กช็อกโกแลต",
                                "e.g., chocolate cake"
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {form.meals.includes("เย็น") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            {t("อาหารเย็น", "Dinner")}
                          </label>
                          <select
                            name="dinnerMenu"
                            value={form.dinnerMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">
                              {t("เลือกเมนูอาหารเย็น", "Select dinner menu")}
                            </option>
                            {dinnerMenuOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.dinnerMenu === "อื่นๆ" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t(
                                "ระบุอาหารเย็น (อื่นๆ)",
                                "Specify dinner (Other)"
                              )}
                            </label>
                            <input
                              type="text"
                              name="dinnerMenuOther"
                              value={form.dinnerMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t(
                                "เช่น ข้าวผัดทะเล",
                                "e.g., seafood fried rice"
                              )}
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            {t("ของหวาน (เย็น)", "Dessert (Dinner)")}
                          </label>
                          <select
                            name="dinnerDessert"
                            value={form.dinnerDessert}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">{t("เลือกของหวาน", "Select dessert")}</option>
                            {dinnerDessertOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.dinnerDessert === "อื่นๆ" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t(
                                "ระบุของหวาน (เย็น) (อื่นๆ)",
                                "Specify dessert (Dinner) (Other)"
                              )}
                            </label>
                            <input
                              type="text"
                              name="dinnerDessertOther"
                              value={form.dinnerDessertOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("เช่น เครปเค้ก", "e.g., crepe cake")}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      {t("อาหารพิเศษ", "Special diet")}
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.halalEnabled}
                            onChange={() => handleDietToggle("halal")}
                          />
                          <span>{t("ฮาลาล", "Halal")}</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          name="halalCount"
                          value={form.halalCount}
                          onChange={handleChange}
                          disabled={!form.halalEnabled}
                          className={`w-28 rounded-md border px-3 py-2 text-sm outline-none ${
                            form.halalEnabled
                              ? "border-zinc-300 bg-white focus:border-zinc-900"
                              : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          }`}
                          placeholder={t("จำนวนชุด", "Sets")}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.veganEnabled}
                            onChange={() => handleDietToggle("vegan")}
                          />
                          <span>{t("วีแกน", "Vegan")}</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          name="veganCount"
                          value={form.veganCount}
                          onChange={handleChange}
                          disabled={!form.veganEnabled}
                          className={`w-28 rounded-md border px-3 py-2 text-sm outline-none ${
                            form.veganEnabled
                              ? "border-zinc-300 bg-white focus:border-zinc-900"
                              : "border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          }`}
                          placeholder={t("จำนวนชุด", "Sets")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      {t("แพ้อาหาร", "Allergies")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {allergyOptions.map((item) => (
                        <label key={item} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.allergies.includes(item)}
                            onChange={(e) =>
                              handleAllergyChange(item, e.target.checked)
                            }
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>

                    {form.allergies.includes("อื่นๆ") && (
                      <div className="mt-3 flex flex-col gap-1">
                        <label className="text-sm font-medium">
                          {t("ระบุ (อื่นๆ)", "Specify (Other)")}
                        </label>
                        <input
                          type="text"
                          name="allergyOther"
                          value={form.allergyOther}
                          onChange={handleChange}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          placeholder={t(
                            "เช่น กล้วย, กาแฟ, ถั่วเหลือง",
                            "e.g., banana, coffee, soy"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {t("ของที่ระลึก", "Souvenir")}
              </label>
              <div className="mt-1 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="souvenir"
                    value="yes"
                    checked={form.souvenir === "yes"}
                    onChange={handleChange}
                  />
                  <span>{t("ต้องการ", "Yes")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="souvenir"
                    value="no"
                    checked={form.souvenir === "no"}
                    onChange={handleChange}
                  />
                  <span>{t("ไม่ต้องการ", "No")}</span>
                </label>
              </div>
            </div>

            {form.souvenir === "yes" && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  {t("รายละเอียดของที่ระลึก", "Souvenir details")}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("ประเภทของที่ระลึก", "Souvenir type")}
                    </label>
                    <select
                      name="souvenirGiftSet"
                      value={form.souvenirGiftSet}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    >
                      <option value="">{t("เลือกประเภท", "Select type")}</option>
                      {souvenirGiftSetOptions.map((item) => (
                        <option key={item.value} value={item.value}>
                          {optionLabel(item)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("จำนวนชุด", "Quantity")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      name="souvenirGiftSetCount"
                      value={form.souvenirGiftSetCount}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("เช่น 5", "e.g., 5")}
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm font-medium">
                      {t("เพิ่มของพิเศษ (ถ้ามี)", "Add extras (optional)")}
                    </label>
                    <textarea
                      name="souvenirExtra"
                      value={form.souvenirExtra}
                      onChange={handleChange}
                      rows={3}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t(
                        "ระบุของพิเศษเพิ่มเติม เช่น ใส่โลโก้, การ์ดข้อความ, ของเพิ่มอื่นๆ",
                        "Describe extras, e.g., logo, message card, additional items"
                      )}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

            <section
              id="section-4"
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5"
            >
              <h2 className="flex items-center gap-3 text-base font-semibold text-[#1b2a18]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#788B64] text-sm font-semibold text-white">
                  4
                </span>
                <span>{t("ไฟล์สำหรับการประชุม", "Meeting File")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "แนบไฟล์ได้ไม่เกิน 10MB (ไม่บังคับ)",
                  "Attach a file up to 10MB (optional)."
                )}
              </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {t("แนบไฟล์นำเสนอ (ไม่บังคับ)", "Attach presentation file (optional)")}
              </label>
              <input
                type="file"
                name="presentationFile"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPresentationFile(file);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
              />
              {presentationFile && (
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-700">
                  <div>
                    {t("ไฟล์ที่เลือก", "Selected file")}: {presentationFile.name} (
                    {Math.ceil(presentationFile.size / 1024)} KB)
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                    onClick={() => setPresentationFile(null)}
                    disabled={submitting}
                  >
                    {t("เอาออก", "Remove")}
                  </button>
                </div>
              )}
            </div>
          </section>

            <section
              id="section-5"
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5"
            >
              <h2 className="flex items-center gap-3 text-base font-semibold text-[#1b2a18]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#788B64] text-sm font-semibold text-white">
                  5
                </span>
                <span>{t("ข้อมูลผู้ดูแลภายในองค์กร", "Internal Contacts")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "ผู้ถูกเข้าพบ ผู้บริหารดูแล หัวข้อ และผู้กรอกฟอร์ม",
                  "Host, welcoming executive, topic, and submitter."
                )}
              </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("บุคคลที่ลูกค้าต้องการเข้าพบ", "Host to visit")}
                </label>
                <select
                  name="hostName"
                  value={form.hostName}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">{t("เลือกผู้ที่จะเข้าพบ", "Select host")}</option>
                  {hostOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {optionLabel(option)}
                    </option>
                  ))}
                  <option value="อื่นๆ">{t("อื่นๆ", "Other")}</option>
                </select>
              </div>

              {form.hostName === "อื่นๆ" && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t(
                      "ระบุบุคคลที่เข้าพบ (อื่นๆ)",
                      "Specify host (Other)"
                    )}
                  </label>
                  <input
                    type="text"
                    name="hostNameOther"
                    value={form.hostNameOther}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder={t("เช่น นาย/นาง ...", "e.g., Mr./Ms. ...")}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ผู้บริหารดูแลต้อนรับแขก", "Welcoming executive")}
                </label>
                <select
                  name="executiveHostChoice"
                  value={form.executiveHostChoice}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">{t("เลือกผู้บริหาร", "Select executive")}</option>
                  {executiveHostOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {optionLabel(option)}
                    </option>
                  ))}
                  <option value="อื่นๆ">{t("อื่นๆ", "Other")}</option>
                </select>
              </div>

              {form.executiveHostChoice === "อื่นๆ" && (
                <div className="grid gap-4 md:col-span-2 md:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("ชื่อ", "First name")}
                    </label>
                    <input
                      type="text"
                      name="executiveHostFirstName"
                      value={form.executiveHostFirstName}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("ชื่อ", "First name")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("ชื่อกลาง", "Middle name")}
                    </label>
                    <input
                      type="text"
                      name="executiveHostMiddleName"
                      value={form.executiveHostMiddleName}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("(ถ้ามี)", "(optional)")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("นามสกุล", "Last name")}
                    </label>
                    <input
                      type="text"
                      name="executiveHostLastName"
                      value={form.executiveHostLastName}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("นามสกุล", "Last name")}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      {t("ตำแหน่ง", "Position")}
                    </label>
                    <input
                      type="text"
                      name="executiveHostPosition"
                      value={form.executiveHostPosition}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("ตำแหน่ง", "Position")}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("หัวข้อที่เกี่ยวข้อง", "Topic")}
                </label>
                <input
                  type="text"
                  name="visitTopic"
                  value={form.visitTopic}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t(
                    "เช่น ประชุม, เยี่ยมชม, นำเสนอ",
                    "e.g., meeting, site visit, presentation"
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {t("รายละเอียดการเข้าพบ", "Visit details")}
              </label>
              <textarea
                name="visitDetail"
                value={form.visitDetail}
                onChange={handleChange}
                rows={3}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder={t(
                  "ระบุรายละเอียดเพิ่มเติม เช่น จุดประสงค์",
                  "Add details, e.g., objectives"
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ชื่อผู้กรอกฟอร์ม", "Submitted by (name)")}
                </label>
                <input
                  type="text"
                  name="submittedByName"
                  value={form.submittedByName}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น นาย/นาง ...", "e.g., Mr./Ms. ...")}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ตำแหน่งผู้กรอกฟอร์ม", "Submitted by (position)")}
                </label>
                <input
                  type="text"
                  name="submittedByPosition"
                  value={form.submittedByPosition}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t("เช่น Officer", "e.g., Officer")}
                />
              </div>
            </div>
          </section>

            <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-[#E2CCA8] bg-[#FAEFCC]/95 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur">
            <button
              type="button"
              className="rounded-full border border-[#E2CCA8] bg-white/70 px-4 py-2 text-sm font-medium text-[#2F3B2B] hover:border-[#788B64] hover:bg-[#FAEFCC] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => {
                setForm(initialState);
                setDialog({
                  open: false,
                  type: "error",
                  message: "",
                });
              }}
              disabled={submitting}
            >
              {t("ล้างฟอร์ม", "Clear")}
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#788B64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6b7d58] focus:outline-none focus:ring-2 focus:ring-[#788B64]/35 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? t("กำลังส่งข้อมูล...", "Submitting...") : t("ส่งข้อมูล", "Submit")}
            </button>
          </div>
          </form>
        </div>
      </main>
    </div>
  );
}
