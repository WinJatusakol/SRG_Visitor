"use client";

import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";

type TransportType = "personal" | "public";
type YesNo = "yes" | "no";

type Guest = {
  firstName: string;
  middleName: string;
  lastName: string;
  position: string;
  nationality: string;
};

type Car = {
  brand: string;
  license: string;
};

type MeetingRoomOption = {
  code: string;
  name: string;
  location: string;
  capacity: number;
};

type VisitFormState = {
  clientCompany: string;
  vipCompany: string;
  vipPosition: string;
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

const hostOptions = ["Name1", "Name2"];

const meetingRoomOptions: MeetingRoomOption[] = [
  {
    code: "001",
    name: "ห้องประชุมใหญ่",
    location: "อาคาร 1 ชั้น 3",
    capacity: 10,
  },
  {
    code: "002",
    name: "ห้องประชุมเล็ก",
    location: "อาคาร 1 ชั้น 2",
    capacity: 6,
  },
  {
    code: "003",
    name: "ห้องประชุม A",
    location: "อาคาร 2 ชั้น 4",
    capacity: 12,
  },
  {
    code: "004",
    name: "ห้องประชุม B",
    location: "อาคาร 2 ชั้น 4",
    capacity: 8,
  },
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

const souvenirGiftSetOptions = ["Giftset 01", "Giftset 02", "Giftset 03"];

const createEmptyGuest = (): Guest => ({
  firstName: "",
  middleName: "",
  lastName: "",
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
  vipPosition: "",
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
  hostName: "",
};

export default function Home() {
  const [form, setForm] = useState<VisitFormState>(initialState);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
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
    if (Number(form.totalGuests || 0) > 0) {
      const expectedCount = Number(form.totalGuests || 0);
      for (let index = 0; index < expectedCount; index += 1) {
        const guest = form.guests[index];
        if (!guest) {
          messages.push(`กรุณากรอกข้อมูลผู้เข้าร่วมคนที่ ${index + 1} ให้ครบ`);
          continue;
        }
        if (!guest.firstName.trim()) {
          messages.push(`กรุณากรอกชื่อผู้เข้าร่วมคนที่ ${index + 1}`);
        }
        if (!guest.lastName.trim()) {
          messages.push(`กรุณากรอกนามสกุลผู้เข้าร่วมคนที่ ${index + 1}`);
        }
        if (!guest.position.trim()) {
          messages.push(`กรุณากรอกตำแหน่งผู้เข้าร่วมคนที่ ${index + 1}`);
        }
        if (!guest.nationality.trim()) {
          messages.push(`กรุณากรอกสัญชาติผู้เข้าร่วมคนที่ ${index + 1}`);
        }
      }
    }
    if (!form.visitTopic.trim()) {
      messages.push("กรุณากรอกหัวข้อที่จะเข้ามา");
    }
    if (!form.visitDetail.trim()) {
      messages.push("กรุณากรอกรายละเอียด");
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
    if (form.meetingRoom === "yes" && !form.meetingRoomSelection.trim()) {
      messages.push("กรุณาเลือกห้องประชุม");
    }
    if (!form.transportType) {
      messages.push("กรุณาเลือกประเภทรถ");
    }
    if (form.transportType === "personal") {
      const count = Number(form.carCount || 0);
      if (!form.carCount.trim() || count <= 0) {
        messages.push("กรุณากรอกจำนวนรถสำหรับรถส่วนตัว");
      } else {
        for (let index = 0; index < count; index += 1) {
          const car = form.cars[index];
          if (!car) {
            messages.push(`กรุณากรอกข้อมูลรถคันที่ ${index + 1} ให้ครบ`);
            continue;
          }
          if (!car.brand.trim()) {
            messages.push(`กรุณากรอกยี่ห้อรถคันที่ ${index + 1}`);
          }
          if (!car.license.trim()) {
            messages.push(`กรุณากรอกทะเบียนรถคันที่ ${index + 1}`);
          }
        }
      }
    }
    if (!form.foodRequired) {
      messages.push("กรุณาระบุว่าจะรับอาหารหรือไม่");
    }
    if (form.foodRequired === "yes" && form.meals.length === 0) {
      messages.push("กรุณาเลือกมื้ออาหารที่ต้องการ");
    }
    if (form.foodRequired === "yes") {
      if (form.meals.includes("เช้า") && !form.breakfastMenu.trim()) {
        messages.push("กรุณาเลือกเมนูอาหารเช้า");
      }
      if (form.meals.includes("เช้า") && form.breakfastMenu === "อื่นๆ" && !form.breakfastMenuOther.trim()) {
        messages.push("กรุณาระบุเมนูอาหารเช้า (อื่นๆ)");
      }
      if (form.meals.includes("กลางวัน")) {
        if (!form.lunchMenu.trim()) {
          messages.push("กรุณาเลือกเมนูอาหารกลางวัน");
        }
        if (form.lunchMenu === "อื่นๆ" && !form.lunchMenuOther.trim()) {
          messages.push("กรุณาระบุเมนูอาหารกลางวัน (อื่นๆ)");
        }
        if (!form.lunchDessert.trim()) {
          messages.push("กรุณาเลือกของหวาน (กลางวัน)");
        }
        if (form.lunchDessert === "อื่นๆ" && !form.lunchDessertOther.trim()) {
          messages.push("กรุณาระบุของหวาน (กลางวัน) (อื่นๆ)");
        }
      }
      if (form.meals.includes("เย็น")) {
        if (!form.dinnerMenu.trim()) {
          messages.push("กรุณาเลือกเมนูอาหารเย็น");
        }
        if (form.dinnerMenu === "อื่นๆ" && !form.dinnerMenuOther.trim()) {
          messages.push("กรุณาระบุเมนูอาหารเย็น (อื่นๆ)");
        }
        if (!form.dinnerDessert.trim()) {
          messages.push("กรุณาเลือกของหวาน (เย็น)");
        }
        if (form.dinnerDessert === "อื่นๆ" && !form.dinnerDessertOther.trim()) {
          messages.push("กรุณาระบุของหวาน (เย็น) (อื่นๆ)");
        }
      }
      if (form.halalEnabled && Number(form.halalCount || 0) <= 0) {
        messages.push("กรุณาระบุจำนวนชุดอาหารฮาลาล");
      }
      if (form.veganEnabled && Number(form.veganCount || 0) <= 0) {
        messages.push("กรุณาระบุจำนวนชุดอาหารวีแกน");
      }
      if (form.allergies.includes("อื่นๆ") && !form.allergyOther.trim()) {
        messages.push("กรุณาระบุรายการแพ้อาหาร (อื่นๆ)");
      }
    }
    if (!form.souvenir) {
      messages.push("กรุณาระบุว่าจะรับของที่ระลึกหรือไม่");
    }
    if (form.souvenir === "yes") {
      if (!form.souvenirGiftSet.trim()) {
        messages.push("กรุณาเลือกประเภทของที่ระลึก");
      }
      const count = Number(form.souvenirGiftSetCount || 0);
      if (!form.souvenirGiftSetCount.trim() || count <= 0) {
        messages.push("กรุณาระบุจำนวนชุดของที่ระลึก");
      }
    }
    if (!form.hostName.trim()) {
      messages.push("กรุณาเลือกผู้ที่จะเข้ามาพบ");
    }
    if (presentationFile && presentationFile.size > maxPresentationFileSize) {
      messages.push("ไฟล์แนบใหญ่เกินไป (สูงสุด 10MB)");
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

    const cars = form.transportType === "personal" ? form.cars : [];
    const firstCar = cars[0] ?? null;
    const meetingRoomLabel = form.meetingRoomSelection
      ? form.meetingRoomSelection
      : "";

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

    const payload = {
      timestamp: new Date().toISOString(),
      clientCompany: form.clientCompany,
      vipCompany: form.vipCompany,
      vipPosition: form.vipPosition,
      nationality: form.nationality,
      contactPhone: form.contactPhone,
      totalGuests: Number(form.totalGuests),
      guests: form.guests,
      visitTopic: form.visitTopic,
      visitDetail: form.visitDetail,
      visitDateTime: visitDateTimeValue,
      meetingRoom: form.meetingRoom === "yes",
      meetingRoomSelection: meetingRoomLabel,
      transportType: form.transportType,
      carCount:
        form.transportType === "personal" ? Number(form.carCount || 0) : 0,
      cars,
      carBrand: firstCar?.brand ?? "",
      carLicense: firstCar?.license ?? "",
      foodRequired: form.foodRequired === "yes",
      meals: form.meals.join(","),
      foodPreferences,
      souvenir: form.souvenir === "yes",
      souvenirPreferences,
      hostName: form.hostName,
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
  const guestsCount = Number(form.totalGuests || 0);

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

            {guestsCount > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-zinc-900">
                  รายชื่อผู้เข้าร่วม
                </div>
                <div className="space-y-4">
                  {Array.from({ length: guestsCount }, (_, index) => {
                    const guest = form.guests[index] ?? createEmptyGuest();
                    return (
                      <div
                        key={String(index)}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <div className="text-sm font-semibold text-zinc-900">
                          ผู้เข้าร่วมคนที่ {index + 1}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-5">
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
                            placeholder="ชื่อ"
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
                            placeholder="ชื่อกลาง (ถ้ามี)"
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
                            placeholder="นามสกุล"
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
                            placeholder="ตำแหน่ง"
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
                            placeholder="สัญชาติ"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

                {meetingRoomYes && (
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      เลือกห้องประชุม
                    </label>
                    <select
                      name="meetingRoomSelection"
                      value={form.meetingRoomSelection}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    >
                      <option value="">เลือกห้องประชุม</option>
                      {meetingRoomOptions.map((room) => {
                        const label = `${room.code} ${room.name} ${room.location} (ความจุ ${room.capacity} คน)`;
                        return (
                          <option key={room.code} value={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
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
                <div className="space-y-3 md:col-span-2">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">จำนวนรถ</label>
                      <input
                        type="number"
                        min={1}
                        name="carCount"
                        value={form.carCount}
                        onChange={handleChange}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                        placeholder="เช่น 2"
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
                                  placeholder="ยี่ห้อรถ เช่น Toyota, Honda"
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
                                  placeholder="ทะเบียนรถ เช่น 1กก 1234"
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

            {foodRequiredYes && (
              <div className="space-y-4">
                {(form.meals.includes("เช้า") ||
                  form.meals.includes("กลางวัน") ||
                  form.meals.includes("เย็น")) && (
                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      เลือกเมนูอาหาร
                    </div>

                    {form.meals.includes("เช้า") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            อาหารเช้า
                          </label>
                          <select
                            name="breakfastMenu"
                            value={form.breakfastMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">เลือกเมนูอาหารเช้า</option>
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
                              ระบุอาหารเช้า (อื่นๆ)
                            </label>
                            <input
                              type="text"
                              name="breakfastMenuOther"
                              value={form.breakfastMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="เช่น แซนด์วิชทูน่า"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {form.meals.includes("กลางวัน") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            อาหารกลางวัน
                          </label>
                          <select
                            name="lunchMenu"
                            value={form.lunchMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">เลือกเมนูอาหารกลางวัน</option>
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
                              ระบุอาหารกลางวัน (อื่นๆ)
                            </label>
                            <input
                              type="text"
                              name="lunchMenuOther"
                              value={form.lunchMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="เช่น ข้าวมันไก่"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            ของหวาน (กลางวัน)
                          </label>
                          <select
                            name="lunchDessert"
                            value={form.lunchDessert}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">เลือกของหวาน</option>
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
                              ระบุของหวาน (กลางวัน) (อื่นๆ)
                            </label>
                            <input
                              type="text"
                              name="lunchDessertOther"
                              value={form.lunchDessertOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="เช่น เค้กช็อกโกแลต"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {form.meals.includes("เย็น") && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            อาหารเย็น
                          </label>
                          <select
                            name="dinnerMenu"
                            value={form.dinnerMenu}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">เลือกเมนูอาหารเย็น</option>
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
                              ระบุอาหารเย็น (อื่นๆ)
                            </label>
                            <input
                              type="text"
                              name="dinnerMenuOther"
                              value={form.dinnerMenuOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="เช่น ข้าวผัดทะเล"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            ของหวาน (เย็น)
                          </label>
                          <select
                            name="dinnerDessert"
                            value={form.dinnerDessert}
                            onChange={handleChange}
                            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          >
                            <option value="">เลือกของหวาน</option>
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
                              ระบุของหวาน (เย็น) (อื่นๆ)
                            </label>
                            <input
                              type="text"
                              name="dinnerDessertOther"
                              value={form.dinnerDessertOther}
                              onChange={handleChange}
                              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                              placeholder="เช่น เครปเค้ก"
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
                      อาหารพิเศษ
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.halalEnabled}
                            onChange={() => handleDietToggle("halal")}
                          />
                          <span>ฮาลาล</span>
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
                          placeholder="จำนวนชุด"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.veganEnabled}
                            onChange={() => handleDietToggle("vegan")}
                          />
                          <span>วีแกน</span>
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
                          placeholder="จำนวนชุด"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">
                      แพ้อาหาร
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
                          ระบุ (อื่นๆ)
                        </label>
                        <input
                          type="text"
                          name="allergyOther"
                          value={form.allergyOther}
                          onChange={handleChange}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                          placeholder="เช่น กล้วย, กาแฟ, ถั่วเหลือง"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {form.souvenir === "yes" && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  รายละเอียดของที่ระลึก
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      ประเภทของที่ระลึก
                    </label>
                    <select
                      name="souvenirGiftSet"
                      value={form.souvenirGiftSet}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                    >
                      <option value="">เลือกประเภท</option>
                      {souvenirGiftSetOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">จำนวนชุด</label>
                    <input
                      type="number"
                      min={1}
                      name="souvenirGiftSetCount"
                      value={form.souvenirGiftSetCount}
                      onChange={handleChange}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="เช่น 5"
                    />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-sm font-medium">
                      เพิ่มของพิเศษ (ถ้ามี)
                    </label>
                    <textarea
                      name="souvenirExtra"
                      value={form.souvenirExtra}
                      onChange={handleChange}
                      rows={3}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                      placeholder="ระบุของพิเศษเพิ่มเติม เช่น ใส่โลโก้, การ์ดข้อความ, ของเพิ่มอื่นๆ"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              ไฟล์สำหรับการประชุม
            </h2>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">แนบไฟล์นำเสนอ (ไม่บังคับ)</label>
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
                    ไฟล์ที่เลือก: {presentationFile.name} (
                    {Math.ceil(presentationFile.size / 1024)} KB)
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                    onClick={() => setPresentationFile(null)}
                    disabled={submitting}
                  >
                    เอาออก
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-5">
            <h2 className="text-base font-semibold text-zinc-900">
              ข้อมูลผู้ดูแลภายในองค์กร
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">บุคคลที่เข้าพบ</label>
                <select
                  name="hostName"
                  value={form.hostName}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  <option value="">เลือกผู้ที่จะเข้าพบ</option>
                  {hostOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">หัวข้อที่เกี่ยวข้อง</label>
                <input
                  type="text"
                  name="visitTopic"
                  value={form.visitTopic}
                  onChange={handleChange}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  placeholder="เช่น ประชุม, เยี่ยมชม, นำเสนอ"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">รายละเอียดการเข้าพบ</label>
              <textarea
                name="visitDetail"
                value={form.visitDetail}
                onChange={handleChange}
                rows={3}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                placeholder="ระบุรายละเอียดเพิ่มเติม เช่น จุดประสงค์"
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
