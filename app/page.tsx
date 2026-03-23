"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type TransportType = "personal" | "shuttle";
type YesNo = "yes" | "no";

type Guest = {
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  position: string;
  halal: boolean;
  vegan: boolean;
  allergies: string[];
  allergyOther: string;
};

type Car = {
  brand: string;
  license: string;
};

type InternalAttendee = {
  firstName: string;
  lastName: string;
  position: string;
};

type ShuttleSchedule = {
  date: string;
  pickup: string;
  destination: string;
  time: string;
};

type VisitFormState = {
  clientCompany: string;
  companyAddress: string;
  country: string;
  visitorType: string;
  visitorTypeOther: string;
  totalGuests: string;
  guests: Guest[];
  purposeOfVisit: string;
  welcomeMessage: string;
  internalAttendeeCount: string;
  internalAttendees: InternalAttendee[];
  visitDate: string;
  visitTime: string;
  meetingRoom: YesNo | "";
  meetingRoomSelection: string;
  siteVisitAreas: string[];
  siteVisitAffiliateCompanies: string[];
  siteVisitApproverName: string;
  siteVisitApproverPosition: string;
  transportType: TransportType | "";
  carCount: string;
  cars: Car[];
  shuttleSchedules: ShuttleSchedule[];
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
  souvenir: YesNo | "";
  souvenirGiftSet: string;
  souvenirGiftSetCount: string;
  souvenirExtra: string;
  submittedByName: string;
  submittedByPosition: string;
  submittedByPhone: string;
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

type FoodMenuOptionRow = RefOptionRow & {
  group_key: string;
};

const timeSlots: string[] = [];
for (let hour = 6; hour <= 21; hour += 1) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
}


const createEmptyGuest = (): Guest => ({
  prefix: "",
  firstName: "",
  middleName: "",
  lastName: "",
  position: "",
  halal: false,
  vegan: false,
  allergies: [],
  allergyOther: "",
});

const createEmptyCar = (): Car => ({
  brand: "",
  license: "",
});

const createEmptyInternalAttendee = (): InternalAttendee => ({
  firstName: "",
  lastName: "",
  position: "",
});

const createEmptyShuttleSchedule = (): ShuttleSchedule => ({
  date: "",
  pickup: "",
  destination: "",
  time: "",
});

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const buildVisitDateTimeIso = (date: string, time: string) => {
  const safeDate = date.trim();
  const safeTime = time.trim();
  if (!safeDate || !safeTime) return "";
  return `${safeDate}T${safeTime}:00.000Z`;
};

const initialState: VisitFormState = {
  clientCompany: "",
  companyAddress: "",
  country: "",
  visitorType: "",
  visitorTypeOther: "",
  totalGuests: "",
  guests: [],
  purposeOfVisit: "",
  welcomeMessage: "Warmly welcome (Mr. A / Company name)",
  internalAttendeeCount: "",
  internalAttendees: [],
  visitDate: "",
  visitTime: "",
  meetingRoom: "",
  meetingRoomSelection: "",
  siteVisitAreas: [],
  siteVisitAffiliateCompanies: [],
  siteVisitApproverName: "",
  siteVisitApproverPosition: "",
  transportType: "",
  carCount: "",
  cars: [],
  shuttleSchedules: [],
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
  souvenir: "",
  souvenirGiftSet: "",
  souvenirGiftSetCount: "",
  souvenirExtra: "",
  submittedByName: "",
  submittedByPosition: "",
  submittedByPhone: "",
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("th");
  const [form, setForm] = useState<VisitFormState>(initialState);
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "error",
    message: "",
  });
  const minVisitDate = new Date().toISOString().split("T")[0];

  const [meetingRoomOptions, setMeetingRoomOptions] = useState<MeetingRoomRow[]>([]);
  const [siteVisitAreaOptions, setSiteVisitAreaOptions] = useState<RefOptionRow[]>([]);
  const [affiliateCompanyOptions, setAffiliateCompanyOptions] = useState<RefOptionRow[]>([]);
  const [souvenirGiftSetOptions, setSouvenirGiftSetOptions] = useState<RefOptionRow[]>([]);
  const [breakfastMenuOptions, setBreakfastMenuOptions] = useState<RefOptionRow[]>([]);
  const [lunchMenuOptions, setLunchMenuOptions] = useState<RefOptionRow[]>([]);
  const [lunchDessertOptions, setLunchDessertOptions] = useState<RefOptionRow[]>([]);
  const [dinnerMenuOptions, setDinnerMenuOptions] = useState<RefOptionRow[]>([]);
  const [dinnerDessertOptions, setDinnerDessertOptions] = useState<RefOptionRow[]>([]);
  const [allergyOptions, setAllergyOptions] = useState<RefOptionRow[]>([]);

  const t = (th: string, en: string) => (lang === "th" ? th : en);
  const optionLabel = (option: RefOptionRow) =>
    lang === "th"
      ? (option.label_th ?? option.value)
      : (option.label_en ?? option.value);

  const isOtherMenuValue = (value: string) => {
    const v = String(value ?? "").trim();
    return v === "อื่นๆ" || v.toLowerCase() === "other";
  };
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
    if (value === "อาหารว่างเช้า") return t("อาหารว่างเช้า", "Morning break");
    if (value === "อาหารว่างบ่าย") return t("อาหารว่างบ่าย", "Afternoon break");
    return value;
  };

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [rooms, siteAreas, affiliateCompanies, giftSets, foodMenus, allergies] =
        await Promise.all([
          supabase
            .from("meeting_rooms")
            .select(
              "code,name_th,name_en,location_th,location_en,capacity,sort_index,active"
            )
            .eq("active", true)
            .order("sort_index", { ascending: true })
            .order("code", { ascending: true }),
          supabase
            .from("site_visit_areas")
            .select("value,label_th,label_en,sort_index,active")
            .eq("active", true)
            .order("sort_index", { ascending: true })
            .order("value", { ascending: true }),
          supabase
            .from("affiliate_companies")
            .select("value,label_th,label_en,sort_index,active")
            .eq("active", true)
            .order("sort_index", { ascending: true })
            .order("value", { ascending: true }),
          supabase
            .from("souvenir_gift_sets")
            .select("value,label_th,label_en,sort_index,active")
            .eq("active", true)
            .order("sort_index", { ascending: true })
            .order("value", { ascending: true }),
          supabase
            .from("food_menu_options")
            .select("group_key,value,label_th,label_en,sort_index,active")
            .eq("active", true)
            .order("group_key", { ascending: true })
            .order("sort_index", { ascending: true })
            .order("value", { ascending: true }),
          supabase
            .from("allergy_options")
            .select("value,label_th,label_en,sort_index,active")
            .eq("active", true)
            .order("sort_index", { ascending: true })
            .order("value", { ascending: true }),
        ]);

      setMeetingRoomOptions(
        !rooms.error && Array.isArray(rooms.data) ? (rooms.data as MeetingRoomRow[]) : []
      );
      setSiteVisitAreaOptions(
        !siteAreas.error && Array.isArray(siteAreas.data)
          ? (siteAreas.data as RefOptionRow[])
          : []
      );
      setAffiliateCompanyOptions(
        !affiliateCompanies.error && Array.isArray(affiliateCompanies.data)
          ? (affiliateCompanies.data as RefOptionRow[])
          : []
      );
      setSouvenirGiftSetOptions(
        !giftSets.error && Array.isArray(giftSets.data)
          ? (giftSets.data as RefOptionRow[])
          : []
      );

      const foodMenuRows =
        !foodMenus.error && Array.isArray(foodMenus.data)
          ? (foodMenus.data as FoodMenuOptionRow[])
          : [];
      const sortOtherLast = (items: RefOptionRow[]) => {
        const otherWords = new Set(["อื่นๆ", "other"]);
        return [...items].sort((a, b) => {
          const av = String(a.value ?? "").trim();
          const bv = String(b.value ?? "").trim();
          const al = String(a.label_th ?? "").trim();
          const bl = String(b.label_th ?? "").trim();
          const aIsOther = otherWords.has(av) || otherWords.has(al);
          const bIsOther = otherWords.has(bv) || otherWords.has(bl);
          if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
          const asi = Number(a.sort_index ?? 0);
          const bsi = Number(b.sort_index ?? 0);
          if (asi !== bsi) return asi - bsi;
          return av.localeCompare(bv, "th");
        });
      };
      const ensureOtherOption = (items: RefOptionRow[]) => {
        const hasOther = items.some((x) => {
          const v = String(x.value ?? "").trim();
          const th = String(x.label_th ?? "").trim();
          return v === "อื่นๆ" || v.toLowerCase() === "other" || th === "อื่นๆ";
        });
        if (hasOther) return items;
        return [
          ...items,
          { value: "อื่นๆ", label_th: "อื่นๆ", label_en: "Other", sort_index: 999999, active: true },
        ];
      };
      const readFoodGroup = (key: string) =>
        sortOtherLast(
          ensureOtherOption(
          foodMenuRows
          .filter((row) => String(row.group_key ?? "") === key)
          .map((row) => ({
            value: String(row.value ?? "").trim(),
            label_th: row.label_th ?? null,
            label_en: row.label_en ?? null,
            sort_index: row.sort_index ?? null,
            active: row.active ?? null,
          }))
          .filter((row) => row.value)
          )
        );

      setBreakfastMenuOptions(readFoodGroup("breakfast"));
      setLunchMenuOptions(readFoodGroup("lunch_main"));
      setLunchDessertOptions(readFoodGroup("lunch_dessert"));
      setDinnerMenuOptions(readFoodGroup("dinner_main"));
      setDinnerDessertOptions(readFoodGroup("dinner_dessert"));

      const allergyItems =
        !allergies.error && Array.isArray(allergies.data)
          ? (allergies.data as RefOptionRow[])
              .map((row) => ({
                value: String(row.value ?? "").trim(),
                label_th: row.label_th ?? null,
                label_en: row.label_en ?? null,
                sort_index: row.sort_index ?? null,
                active: row.active ?? null,
              }))
              .filter((row) => row.value)
          : [];
      setAllergyOptions(sortOtherLast(ensureOtherOption(allergyItems)));
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

    if (name === "submittedByPhone") {
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

    if (name === "souvenirGiftSetCount") {
      value = value.replace(/\D/g, "");
    }

    if (
      name === "breakfastMenu" ||
      name === "lunchMenu" ||
      name === "lunchDessert" ||
      name === "dinnerMenu" ||
      name === "dinnerDessert"
    ) {
      return setForm((prev) => {
        const next: VisitFormState = { ...prev, [name]: value } as VisitFormState;
        if (name === "breakfastMenu" && !isOtherMenuValue(value)) next.breakfastMenuOther = "";
        if (name === "lunchMenu" && !isOtherMenuValue(value)) next.lunchMenuOther = "";
        if (name === "lunchDessert" && !isOtherMenuValue(value)) next.lunchDessertOther = "";
        if (name === "dinnerMenu" && !isOtherMenuValue(value)) next.dinnerMenuOther = "";
        if (name === "dinnerDessert" && !isOtherMenuValue(value)) next.dinnerDessertOther = "";
        return next;
      });
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
      }));
    }

    if (name === "visitorType") {
      return setForm((prev) => ({
        ...prev,
        visitorType: value,
        visitorTypeOther: value === "อื่นๆ" ? prev.visitorTypeOther : "",
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

    if (name === "transportType") {
      return setForm((prev) => ({
        ...prev,
        transportType: value as TransportType,
        carCount: value === "personal" ? prev.carCount : "",
        cars: value === "personal" ? prev.cars : [],
        shuttleSchedules: value === "shuttle" ? prev.shuttleSchedules : [],
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

    if (name === "internalAttendeeCount") {
      value = value.replace(/\D/g, "");
      return setForm((prev) => {
        const count = Number(value || 0);
        const nextAttendees = Array.from(
          { length: Math.max(0, count) },
          (_, index) => prev.internalAttendees[index] ?? createEmptyInternalAttendee()
        );
        return {
          ...prev,
          internalAttendeeCount: value,
          internalAttendees: nextAttendees,
        };
      });
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInternalAttendeeChange = (
    index: number,
    field: keyof InternalAttendee,
    value: string
  ) => {
    setForm((prev) => {
      const nextAttendees = prev.internalAttendees.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, internalAttendees: nextAttendees };
    });
  };

  const handleShuttleScheduleChange = (
    index: number,
    field: keyof ShuttleSchedule,
    value: string
  ) => {
    setForm((prev) => {
      const nextSchedules = prev.shuttleSchedules.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, shuttleSchedules: nextSchedules };
    });
  };

  const addShuttleSchedule = () => {
    setForm((prev) => ({
      ...prev,
      shuttleSchedules: [...prev.shuttleSchedules, createEmptyShuttleSchedule()],
    }));
  };

  const removeShuttleSchedule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      shuttleSchedules: prev.shuttleSchedules.filter((_, i) => i !== index),
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
        siteVisitAffiliateCompanies:
          value === "บริษัทในเครือ" ? [] : prev.siteVisitAffiliateCompanies,
        siteVisitApproverName: nextAreas.length > 0 ? prev.siteVisitApproverName : "",
        siteVisitApproverPosition: nextAreas.length > 0 ? prev.siteVisitApproverPosition : "",
      };
    });
  };

  const handleAffiliateCompanyChange = (company: string, checked: boolean) => {
    setForm((prev) => {
      const nextCompanies = checked
        ? prev.siteVisitAffiliateCompanies.includes(company)
          ? prev.siteVisitAffiliateCompanies
          : [...prev.siteVisitAffiliateCompanies, company]
        : prev.siteVisitAffiliateCompanies.filter((item) => item !== company);
      return { ...prev, siteVisitAffiliateCompanies: nextCompanies };
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

  const handleGuestDietChange = (
    index: number,
    field: "halal" | "vegan",
    checked: boolean
  ) => {
    setForm((prev) => {
      const nextGuests = prev.guests.map((guest, i) =>
        i === index ? { ...guest, [field]: checked } : guest
      );
      return { ...prev, guests: nextGuests };
    });
  };

  const handleGuestAllergyChange = (
    index: number,
    value: string,
    checked: boolean
  ) => {
    setForm((prev) => {
      const nextGuests = prev.guests.map((guest, i) => {
        if (i !== index) return guest;
        const nextAllergies = checked
          ? guest.allergies.includes(value)
            ? guest.allergies
            : [...guest.allergies, value]
          : guest.allergies.filter((item) => item !== value);
        return {
          ...guest,
          allergies: nextAllergies,
          allergyOther: nextAllergies.includes("อื่นๆ") ? guest.allergyOther : "",
        };
      });
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
        lunchMenu: nextMeals.includes("กลางวัน") ? prev.lunchMenu : "",
        lunchDessert: nextMeals.includes("กลางวัน") ? prev.lunchDessert : "",
        dinnerMenu: nextMeals.includes("เย็น") ? prev.dinnerMenu : "",
        dinnerDessert: nextMeals.includes("เย็น") ? prev.dinnerDessert : "",
      };
    });
  };

  const validate = () => {
    const messages: string[] = [];
    const maxRegistrationFileSize = 10 * 1024 * 1024;

    if (!form.clientCompany.trim()) {
      messages.push(
        t(
          "กรุณากรอกชื่อบริษัทที่เชิญมา",
          "Please enter the invited company name."
        )
      );
    }
    if (!form.companyAddress.trim()) {
      messages.push(
        t(
          "กรุณากรอกที่อยู่ของบริษัทที่เชิญมา",
          "Please enter the invited company address."
        )
      );
    }
    if (!form.country.trim()) {
      messages.push(t("กรุณากรอกประเทศของบริษัทที่เชิญมา", "Please enter the invited company country."));
    }
    if (!form.visitorType.trim()) {
      messages.push(t("กรุณาเลือกประเภทผู้เข้าเยี่ยมชม", "Please select the visitor type."));
    }
    if (form.visitorType === "อื่นๆ" && !form.visitorTypeOther.trim()) {
      messages.push(t("กรุณาระบุประเภทผู้เข้าเยี่ยมชมอื่นๆ", "Please specify the visitor type."));
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
      
      if (expectedCount > 20 && !registrationFile) {
        messages.push(
          t(
            "ผู้เข้าร่วมเกิน 20 คน กรุณาแนบไฟล์ PDF ลงทะเบียนรายชื่อด้วยครับ",
            "For more than 20 attendees, please attach a PDF registration file."
          )
        );
      }
      
      if (expectedCount <= 20) {
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
          if (guest.allergies.includes("อื่นๆ") && !guest.allergyOther.trim()) {
            messages.push(
              t(
                `กรุณาระบุการแพ้อาหารผู้เข้าร่วมคนที่ ${index + 1}`,
                `Please specify attendee #${index + 1} allergy (Other).`
              )
            );
          }
        }
      }
    }

    if (!form.purposeOfVisit.trim()) {
      messages.push(t("กรุณากรอกวัตถุประสงค์ในการเข้าพบ", "Please enter the purpose of visit."));
    }
    if (!form.visitDate.trim()) {
      messages.push(
        t("กรุณาเลือกวันที่เข้าเยี่ยมชม", "Please select the arrival date.")
      );
    }
    if (!form.visitTime.trim()) {
      messages.push(
        t("กรุณาเลือกเวลาเข้าเยี่ยมชม", "Please select the arrival time.")
      );
    }
    if (form.visitDate && form.visitTime) {
      const selectedIso = buildVisitDateTimeIso(form.visitDate, form.visitTime);
      const selected = selectedIso ? new Date(selectedIso) : null;
      const nowThaiMs = Date.now() + THAI_OFFSET_MS;
      if (!selected || Number.isNaN(selected.getTime()) || selected.getTime() < nowThaiMs) {
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
      if (
        form.siteVisitAreas.includes("บริษัทในเครือ") &&
        form.siteVisitAffiliateCompanies.length === 0
      ) {
        messages.push(
          t(
            "กรุณาเลือกบริษัทในเครืออย่างน้อย 1 แห่ง",
            "Please select at least one affiliate company."
          )
        );
      }
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
    if (form.transportType === "shuttle") {
      if (form.shuttleSchedules.length === 0) {
        messages.push(
          t(
            "กรุณาเพิ่มกำหนดการรถรับ-ส่งอย่างน้อย 1 รายการ",
            "Please add at least one shuttle schedule."
          )
        );
      } else {
        form.shuttleSchedules.forEach((item, index) => {
          if (!item.date.trim() || !item.pickup.trim() || !item.destination.trim() || !item.time.trim()) {
            messages.push(
              t(
                `กรุณากรอกข้อมูลรถรับ-ส่งวันที่ ${index + 1} ให้ครบ`,
                `Please complete shuttle schedule #${index + 1}.`
              )
            );
          }
        });
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
      if (form.meals.includes("เช้า") && isOtherMenuValue(form.breakfastMenu) && !form.breakfastMenuOther.trim()) {
        messages.push(t("กรุณาระบุเมนูอาหารเช้า (อื่นๆ)", "Please specify the breakfast other menu."));
      }
      if (form.meals.includes("กลางวัน")) {
        if (!form.lunchMenu.trim()) {
          messages.push(
            t("กรุณาเลือกเมนูอาหารกลางวัน", "Please select the lunch menu.")
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
        if (isOtherMenuValue(form.lunchMenu) && !form.lunchMenuOther.trim()) {
          messages.push(t("กรุณาระบุเมนูอาหารกลางวัน (อื่นๆ)", "Please specify the lunch other menu."));
        }
        if (isOtherMenuValue(form.lunchDessert) && !form.lunchDessertOther.trim()) {
          messages.push(t("กรุณาระบุของหวาน (กลางวัน) (อื่นๆ)", "Please specify the lunch dessert other menu."));
        }
      }
      if (form.meals.includes("เย็น")) {
        if (!form.dinnerMenu.trim()) {
          messages.push(
            t("กรุณาเลือกเมนูอาหารเย็น", "Please select the dinner menu.")
          );
        }
        if (!form.dinnerDessert.trim()) {
          messages.push(
            t("กรุณาเลือกของหวาน (เย็น)", "Please select the dinner dessert.")
          );
        }
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
    if (!form.submittedByPhone.trim()) {
      messages.push(
        t(
          "กรุณากรอกเบอร์ผู้ประสานงาน",
          "Please enter the contact phone number."
        )
      );
    }
    const internalCount = Number(form.internalAttendeeCount || 0);
    if (!form.internalAttendeeCount.trim() || internalCount <= 0) {
      messages.push(
        t(
          "กรุณาระบุจำนวนผู้เข้าร่วมภายในองค์กร",
          "Please enter the number of internal attendees."
        )
      );
    } else {
      for (let index = 0; index < internalCount; index += 1) {
        const attendee = form.internalAttendees[index];
        if (!attendee) {
          messages.push(
            t(
              `กรุณากรอกข้อมูลผู้เข้าร่วมภายในคนที่ ${index + 1} ให้ครบ`,
              `Please complete internal attendee #${index + 1}.`
            )
          );
          continue;
        }
        if (!attendee.firstName.trim()) {
          messages.push(
            t(
              `กรุณากรอกชื่อผู้เข้าร่วมภายในคนที่ ${index + 1}`,
              `Please enter internal attendee #${index + 1} first name.`
            )
          );
        }
        if (!attendee.lastName.trim()) {
          messages.push(
            t(
              `กรุณากรอกนามสกุลผู้เข้าร่วมภายในคนที่ ${index + 1}`,
              `Please enter internal attendee #${index + 1} last name.`
            )
          );
        }
        if (!attendee.position.trim()) {
          messages.push(
            t(
              `กรุณากรอกตำแหน่งผู้เข้าร่วมภายในคนที่ ${index + 1}`,
              `Please enter internal attendee #${index + 1} position.`
            )
          );
        }
      }
    }
    if (registrationFile && registrationFile.size > maxRegistrationFileSize) {
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
    const shuttleSchedules =
      form.transportType === "shuttle" ? form.shuttleSchedules : [];

    const siteVisit =
      form.siteVisitAreas.length > 0
        ? {
          areas: form.siteVisitAreas,
          affiliateCompanies: form.siteVisitAffiliateCompanies,
          approverName: form.siteVisitApproverName,
          approverPosition: form.siteVisitApproverPosition,
        }
        : null;

    const foodPreferences =
      form.foodRequired === "yes"
        ? {
          meals: form.meals,
          menus: {
            breakfast: form.meals.includes("เช้า") ? form.breakfastMenu : "",
            breakfastOther:
              form.meals.includes("เช้า") && isOtherMenuValue(form.breakfastMenu)
                ? form.breakfastMenuOther
                : "",
            lunch: form.meals.includes("กลางวัน")
              ? {
                main:
                  form.lunchMenu,
                dessert:
                  form.lunchDessert,
                otherMain: isOtherMenuValue(form.lunchMenu) ? form.lunchMenuOther : "",
                otherDessert: isOtherMenuValue(form.lunchDessert) ? form.lunchDessertOther : "",
              }
              : { main: "", dessert: "", otherMain: "", otherDessert: "" },
            dinner: form.meals.includes("เย็น")
              ? {
                main:
                  form.dinnerMenu,
                dessert:
                  form.dinnerDessert,
                otherMain: isOtherMenuValue(form.dinnerMenu) ? form.dinnerMenuOther : "",
                otherDessert: isOtherMenuValue(form.dinnerDessert) ? form.dinnerDessertOther : "",
              }
              : { main: "", dessert: "", otherMain: "", otherDessert: "" },
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

    const submittedBy = {
      name: form.submittedByName,
      position: form.submittedByPosition,
      phone: form.submittedByPhone,
    };
    const internalAttendees = form.internalAttendees;

    const payload = {
      timestamp: new Date().toISOString(),
      clientCompany: form.clientCompany,
      companyAddress: form.companyAddress,
      country: form.country,
      visitorType: form.visitorType,
      visitorTypeOther: form.visitorType === "อื่นๆ" ? form.visitorTypeOther : "",
      contactPhone: form.submittedByPhone,
      guests: form.guests,
      purposeOfVisit: form.purposeOfVisit,
      welcomeMessage: form.welcomeMessage,
      internalAttendees,
      visitDateTime:
        form.visitDate && form.visitTime
          ? buildVisitDateTimeIso(form.visitDate, form.visitTime)
          : "",
      meetingRoomSelection: form.meetingRoomSelection || "",
      siteVisit,
      transportType: form.transportType,
      cars,
      shuttleSchedules,
      foodPreferences,
      souvenirPreferences,
      submittedBy,
    };

    try {
      const selectedVisitDateTime = String(payload.visitDateTime ?? "").trim();
      if (selectedVisitDateTime) {
        const supabase = createClient();
        const { data: existing, error } = await supabase
          .from("vip_visitor")
          .select("id,status")
          .eq("visitDateTime", selectedVisitDateTime)
          .or("status.eq.1,status.is.null")
          .limit(1);

        if (!error && Array.isArray(existing) && existing.length > 0) {
          setDialog({
            open: true,
            type: "error",
            message: t("วันและเวลานี้มีการจองแล้ว กรุณาเลือกเวลาอื่น", "This date/time is already booked. Please choose another slot."),
          });
          return;
        }
      }

      setSubmitting(true);
    const response = await (async () => {
        if (!registrationFile) {
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
        if (registrationFile) formData.append("registrationFile", registrationFile);
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
      setRegistrationFile(null);
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
  const transportShuttle = form.transportType === "shuttle";
  const foodRequiredYes = form.foodRequired === "yes";
  const guestsCount = Number(form.totalGuests || 0);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#6b7d58_0%,#788B64_38%,#E2CCA8_78%,#FAEFCC_100%)] px-4 py-10 font-sans text-[#142015] flex justify-center">
      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E2CCA8] bg-[#FAEFCC] px-6 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${dialog.type === "success"
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
              onClick={() => setLang((prev) => (prev === "th" ? "en" : "th"))}
              aria-label={t("เปลี่ยนภาษา", "Switch language")}
              className="inline-flex items-center gap-2 rounded-full border border-[#788B64] bg-[#788B64] px-3 py-1 text-xm font-semibold text-white transition hover:bg-[#6b7d58]"
            >
              <Image
                src={lang === "th" ? "/flags/th.svg" : "/flags/gb.svg"}
                alt={lang === "th" ? "TH" : "EN"}
                width={16}
                height={12}
                className="h-3 w-4 rounded-[2px]"
              />
              <span>{lang === "th" ? "ไทย" : "EN"}</span>
            </button>
          </div>
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight text-[#2F3B2B] md:text-2xl">
          {t("แบบฟอร์มลงทะเบียนผู้เข้าชมโรงงาน", "Visitor Registration Form")}
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
                "คลิกเพื่อไปยังหัวข้อ และกดส่งข้อมูลที่แถบด้านล่าง",
                "Click to jump to a section, then submit using the bottom bar."
              )}
            </div>
            <nav className="mt-4 space-y-2 text-sm">
              <a
                href="#section-1"
                className="block whitespace-nowrap rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("1) ข้อมูลบริษัท/ผู้เข้าร่วม", "1) Visitor Information")}
              </a>
              <a
                href="#section-2"
                className="block whitespace-nowrap rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("2) กำหนดการเยี่ยมชม/สถานที่", "2) Visit Schedule & Locations")}
              </a>
              <a
                href="#section-3"
                className="block whitespace-nowrap rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("3) อาหารและของที่ระลึก", "3) Meals & Souvenirs")}
              </a>
              <a
                href="#section-4"
                className="block whitespace-nowrap rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("4) ข้อความ Welcome board", "4) Welcome Board Message")}
              </a>
              <a
                href="#section-5"
                className="block whitespace-nowrap rounded-xl border border-[#E2CCA8]/70 bg-[#FAEFCC]/50 px-3 py-2 text-[#1b2a18] hover:bg-[#FAEFCC]"
              >
                {t("5) ข้อมูลภายในองค์กร EPAC", "5) EPAC Internal Info")}
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
                <span>{t("ข้อมูลผู้เข้าเยี่ยมชมโรงงาน", "Visitor Information")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "ข้อมูลผู้เข้าเยี่ยมชมโรงงานและรายชื่อผู้เข้าร่วม",
                  "Visitor company information and attendee list."
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("ชื่อบริษัท", "Company Name")}
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
                    {t("ที่อยู่บริษัทที่เข้าเยี่ยมชมโรงงาน", "Company Address")}
                  </label>
                  <input
                    type="text"
                    name="companyAddress"
                    value={form.companyAddress}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder={t("เช่น 123 ถนนตัวอย่าง กรุงเทพฯ", "e.g., 123 Example Rd, Bangkok")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("ประเทศของบริษัทที่เข้าเยี่ยมชม", "Company Country")}
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder={t("เช่น ไทย, ญี่ปุ่น", "e.g., Thailand, Japan")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("ประเภทผู้เข้าเยี่ยมชม", "Visitor Category")}
                  </label>
                  <select
                    name="visitorType"
                    value={form.visitorType}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  >
                    <option value="">{t("เลือกประเภท", "Select Category")}</option>
                    <option value="ลูกค้า">{t("ลูกค้า", "Customer")}</option>
                    <option value="หน่วยงานราชการ">{t("หน่วยงานราชการ", "Government Agency")}</option>
                    <option value="อื่นๆ">{t("อื่นๆ", "Other")}</option>
                  </select>
                  {form.visitorType === "อื่นๆ" && (
                    <input
                      type="text"
                      name="visitorTypeOther"
                      value={form.visitorTypeOther}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder={t("ระบุประเภทอื่นๆ", "Specify other category")}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("วัตถุประสงค์ในการเข้าเยี่ยมชมโรงงาน", "Purpose of Visit")}
                </label>
                <input
                  type="text"
                  name="purposeOfVisit"
                  value={form.purposeOfVisit}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder={t(
                    "เช่น ประชุม ติดตามงาน ศึกษาดูงาน",
                    "e.g., Meeting, Follow-up, Site Study"
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("จำนวนผู้เข้าร่วมทั้งหมด", "Total Attendees")}
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
                  <div className={`text-xs ${Number(form.totalGuests) > 20 ? 'text-amber-600 font-medium' : 'text-[#1b2a18]/60'}`}>
                    {t("หากเกิน 20 คน กรุณาแนบไฟล์ PDF เพื่อลงทะเบียน","If more than 20 attendees, please attach a PDF attendee list instead of filling the form.")}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ไฟล์ลงทะเบียนรายชื่อ (PDF)", "Attendee List (PDF)")}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setRegistrationFile(file);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-900 bg-white ${Number(form.totalGuests) > 20 && !registrationFile ? 'border-amber-400 ring-1 ring-amber-100' : 'border-zinc-300'}`}
                />
                {registrationFile && (
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-700">
                    <div>
                      {t("ไฟล์ที่เลือก", "Selected file")}: {registrationFile.name} (
                      {Math.ceil(registrationFile.size / 1024)} KB)
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                      onClick={() => setRegistrationFile(null)}
                      disabled={submitting}
                    >
                      {t("เอาออก", "Remove")}
                    </button>
                  </div>
                )}
              </div>

              {guestsCount > 0 && guestsCount <= 20 && (
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
                          <select
                            value={guest.prefix}
                            onChange={(e) =>
                              handleGuestChange(index, "prefix", e.target.value)
                            }
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">{t("คำนำหน้า", "Prefix")}</option>
                            <option value="นาย">{t("นาย", "Mr.")}</option>
                            <option value="นาง">{t("นาง", "Mrs.")}</option>
                            <option value="นางสาว">{t("นางสาว", "Ms.")}</option>
                            <option value="MR.">MR.</option>
                            <option value="MS.">MS.</option>
                          </select>
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
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-zinc-200 bg-white p-3">
                            <div className="text-sm font-semibold text-zinc-900">
                              {t("อาหารเฉพาะบุคคล", "Dietary Restrictions")}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={guest.halal}
                                  onChange={(e) =>
                                    handleGuestDietChange(index, "halal", e.target.checked)
                                  }
                                />
                                <span>{t("ฮาลาล", "Halal")}</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={guest.vegan}
                                  onChange={(e) =>
                                    handleGuestDietChange(index, "vegan", e.target.checked)
                                  }
                                />
                                <span>{t("มังสวิรัติ", "Vegan")}</span>
                              </label>
                            </div>
                          </div>
                          <div className="rounded-lg border border-zinc-200 bg-white p-3">
                            <div className="text-sm font-semibold text-zinc-900">
                              {t("แพ้อาหาร", "Allergies")}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm">
                              {allergyOptions.map((item) => (
                                <label key={item.value} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={guest.allergies.includes(item.value)}
                                    onChange={(e) =>
                                      handleGuestAllergyChange(index, item.value, e.target.checked)
                                    }
                                  />
                                  <span>{optionLabel(item)}</span>
                                </label>
                              ))}
                            </div>
                            {guest.allergies.includes("อื่นๆ") && (
                              <div className="mt-3 flex flex-col gap-1">
                                <label className="text-sm font-medium">
                                  {t("ระบุ (อื่นๆ)", "Specify (Other)")}
                                </label>
                                <input
                                  type="text"
                                  value={guest.allergyOther}
                                  onChange={(e) =>
                                    handleGuestChange(index, "allergyOther", e.target.value)
                                  }
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
                <span>{t("กำหนดการเข้าเยี่ยมชมโรงงานและสถานที่", "Factory Visit Schedule & Locations")}</span>
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
                    {t("วันที่", "Arrival date")}
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
                    {t("เวลา", "Arrival time")}
                  </label>
                  <select
                    name="visitTime"
                    value={form.visitTime}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  >
                    <option value="">{t("เวลา", "Select arrival time")}</option>
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
                    <option value="shuttle">{t("รถรับ-ส่ง", "Shuttle service")}</option>
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
                        {form.siteVisitAreas.includes("บริษัทในเครือ") && (
                          <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-sm font-medium">
                              {t("เลือกบริษัทในเครือ", "Select affiliate companies")}
                            </label>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {affiliateCompanyOptions.map((company) => (
                                <label key={company.value} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={form.siteVisitAffiliateCompanies.includes(company.value)}
                                    onChange={(e) =>
                                      handleAffiliateCompanyChange(company.value, e.target.checked)
                                    }
                                  />
                                  <span>{optionLabel(company)}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
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

                {transportShuttle && (
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-zinc-900">
                        {t("กำหนดการรถรับ-ส่ง", "Shuttle schedules")}
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                        onClick={addShuttleSchedule}
                      >
                        {t("เพิ่มวัน", "Add day")}
                      </button>
                    </div>
                    {form.shuttleSchedules.length === 0 && (
                      <div className="rounded-lg border border-dashed border-zinc-200 bg-white/80 p-4 text-sm text-zinc-500">
                        {t("ยังไม่มีข้อมูลรถรับ-ส่ง", "No shuttle schedules yet.")}
                      </div>
                    )}
                    {form.shuttleSchedules.map((item, index) => (
                      <div
                        key={`${item.date}-${index}`}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-zinc-900">
                            {t("วันที่", "Schedule")} {index + 1}
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                            onClick={() => removeShuttleSchedule(index)}
                          >
                            {t("ลบ", "Remove")}
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t("วันที่", "Date")}
                            </label>
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) =>
                                handleShuttleScheduleChange(index, "date", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t("เวลา", "Time")}
                            </label>
                            <select
                              value={item.time}
                              onChange={(e) =>
                                handleShuttleScheduleChange(index, "time", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                            >
                              <option value="">{t("เลือกเวลา", "Select time")}</option>
                              {timeSlots.map((slot) => (
                                <option key={slot} value={slot}>
                                  {slot}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t("จุดที่รับ", "Pickup point")}
                            </label>
                            <input
                              type="text"
                              value={item.pickup}
                              onChange={(e) =>
                                handleShuttleScheduleChange(index, "pickup", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("เช่น สนามบิน", "e.g., Airport")}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              {t("จุดหมาย", "Destination")}
                            </label>
                            <input
                              type="text"
                              value={item.destination}
                              onChange={(e) =>
                                handleShuttleScheduleChange(index, "destination", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("เช่น โรงงาน EPAC", "e.g., EPAC Factory")}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                    <div className="mt-1 flex flex-col gap-3 text-sm">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            value="เช้า"
                            checked={form.meals.includes("เช้า")}
                            onChange={handleMealsChange}
                          />
                          <span>{mealLabel("เช้า")}</span>
                        </label>

                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            value="กลางวัน"
                            checked={form.meals.includes("กลางวัน")}
                            onChange={handleMealsChange}
                          />
                          <span>{mealLabel("กลางวัน")}</span>
                        </label>

                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            value="เย็น"
                            checked={form.meals.includes("เย็น")}
                            onChange={handleMealsChange}
                          />
                          <span>{mealLabel("เย็น")}</span>
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            value="อาหารว่างเช้า"
                            checked={form.meals.includes("อาหารว่างเช้า")}
                            onChange={handleMealsChange}
                          />
                          <span>{mealLabel("อาหารว่างเช้า")}</span>
                        </label>

                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            value="อาหารว่างบ่าย"
                            checked={form.meals.includes("อาหารว่างบ่าย")}
                            onChange={handleMealsChange}
                          />
                          <span>{mealLabel("อาหารว่างบ่าย")}</span>
                        </label>
                      </div>

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
                                  <option key={item.value} value={item.value}>
                                    {optionLabel(item)}
                                  </option>
                                ))}
                              </select>
                              {isOtherMenuValue(form.breakfastMenu) && (
                                <input
                                  name="breakfastMenuOther"
                                  value={form.breakfastMenuOther}
                                  onChange={handleChange}
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t("ระบุเมนูอื่นๆ (เช้า)", "Specify other breakfast menu")}
                                />
                              )}
                            </div>
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
                                  <option key={item.value} value={item.value}>
                                    {optionLabel(item)}
                                  </option>
                                ))}
                              </select>
                              {isOtherMenuValue(form.lunchMenu) && (
                                <input
                                  name="lunchMenuOther"
                                  value={form.lunchMenuOther}
                                  onChange={handleChange}
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t("ระบุเมนูอื่นๆ (กลางวัน)", "Specify other lunch menu")}
                                />
                              )}
                            </div>
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
                                  <option key={item.value} value={item.value}>
                                    {optionLabel(item)}
                                  </option>
                                ))}
                              </select>
                              {isOtherMenuValue(form.lunchDessert) && (
                                <input
                                  name="lunchDessertOther"
                                  value={form.lunchDessertOther}
                                  onChange={handleChange}
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t("ระบุของหวานอื่นๆ (กลางวัน)", "Specify other lunch dessert")}
                                />
                              )}
                            </div>
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
                                  <option key={item.value} value={item.value}>
                                    {optionLabel(item)}
                                  </option>
                                ))}
                              </select>
                              {isOtherMenuValue(form.dinnerMenu) && (
                                <input
                                  name="dinnerMenuOther"
                                  value={form.dinnerMenuOther}
                                  onChange={handleChange}
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t("ระบุเมนูอื่นๆ (เย็น)", "Specify other dinner menu")}
                                />
                              )}
                            </div>
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
                                  <option key={item.value} value={item.value}>
                                    {optionLabel(item)}
                                  </option>
                                ))}
                              </select>
                              {isOtherMenuValue(form.dinnerDessert) && (
                                <input
                                  name="dinnerDessertOther"
                                  value={form.dinnerDessertOther}
                                  onChange={handleChange}
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                                  placeholder={t("ระบุของหวานอื่นๆ (เย็น)", "Specify other dinner dessert")}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                        {t("ของที่ระลึกพิเศษนอกเหนือจากรายการด้านบน (ถ้ามี)", "Add extras (optional)")}
                      </label>
                      <textarea
                        name="souvenirExtra"
                        value={form.souvenirExtra}
                        onChange={handleChange}
                        rows={3}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                        placeholder={t(
                          "โปรดระบุ....",
                          "Please specify any extras."
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
                <span>{t("ข้อความที่แสดงบน Welcome board", "Welcome Board Message")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "ข้อความที่จะนำไปแสดงบนป้ายต้อนรับ",
                  "Message to display on the welcome board."
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">
                  {t("ข้อความ Welcome board", "Welcome Board Text")}
                </label>
                <input
                  type="text"
                  name="welcomeMessage"
                  value={form.welcomeMessage}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="Warmly welcome (Mr. A / Company name)"
                />
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
                <span>{t("ข้อมูลภายในองค์กร EPAC", "EPAC Internal Info")}</span>
              </h2>
              <div className="text-sm text-[#1b2a18]/75">
                {t(
                  "ข้อมูลผู้กรอกฟอร์มและรายชื่อผู้เข้าร่วมภายใน",
                  "Submitter information and internal attendees."
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("ชื่อผู้กรอกฟอร์ม", "Submitted by (Name)")}
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
                    {t("ตำแหน่งผู้กรอกฟอร์ม", "Submitted by (Position)")}
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
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("เบอร์ผู้ประสานงาน", "Contact Phone")}
                  </label>
                  <input
                    type="tel"
                    name="submittedByPhone"
                    value={form.submittedByPhone}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder={t("เช่น 08x-xxx-xxxx", "e.g., +66 xx xxx xxxx")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    {t("จำนวนผู้เข้าร่วมภายใน", "Number of Internal Attendees")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    name="internalAttendeeCount"
                    value={form.internalAttendeeCount}
                    onChange={handleChange}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    placeholder={t("เช่น 3", "e.g., 3")}
                  />
                </div>
              </div>

              {Number(form.internalAttendeeCount || 0) > 0 && (
                <div className="space-y-4">
                  {Array.from(
                    { length: Number(form.internalAttendeeCount || 0) },
                    (_, index) => {
                      const attendee = form.internalAttendees[index] ?? createEmptyInternalAttendee();
                      return (
                        <div
                          key={String(index)}
                          className="rounded-lg border border-zinc-200 bg-white p-4"
                        >
                          <div className="text-sm font-semibold text-zinc-900">
                            {t("ผู้เข้าร่วมภายในคนที่", "Internal Attendee")} {index + 1}
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <input
                              type="text"
                              value={attendee.firstName}
                              onChange={(e) =>
                                handleInternalAttendeeChange(index, "firstName", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("ชื่อ", "First Name")}
                            />
                            <input
                              type="text"
                              value={attendee.lastName}
                              onChange={(e) =>
                                handleInternalAttendeeChange(index, "lastName", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("นามสกุล", "Last Name")}
                            />
                            <input
                              type="text"
                              value={attendee.position}
                              onChange={(e) =>
                                handleInternalAttendeeChange(index, "position", e.target.value)
                              }
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder={t("ตำแหน่ง", "Position")}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
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
                  setRegistrationFile(null);
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
                {submitting ? t("กำลังบันทึก...", "Saving...") : t("ส่งข้อมูล", "Submit")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
