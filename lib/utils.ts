import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getTranslations, type Locale } from "./translations"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map unit index to translation key
const unitTranslationKeys = [
  "unitGram",
  "unitKilogram",
  "unitAdet",
  "unitLitre",
  "unitMillilitre",
  "unitPieces"
] as const;

// Backend's Unit enum names → translation-key index.
// The DTO wire format is the enum name (e.g. "Gram") when projected via
// Unit.ToString(); accept it alongside the numeric index so units render
// correctly whether the row was just added locally or hydrated from the API.
const unitNameToIndex: Record<string, number> = {
  gram: 0,
  kilogram: 1,
  adet: 2,
  litre: 3,
  mililitre: 4,
  millilitre: 4,
  pieces: 5,
};

export function getTranslatedUnit(unit: number | string | null | undefined, locale: Locale = "en"): string {
  let index: number;
  if (typeof unit === "number") {
    index = unit;
  } else if (typeof unit === "string") {
    const trimmed = unit.trim();
    if (trimmed === "") return "-";
    const parsed = Number(trimmed);
    index = Number.isFinite(parsed) ? parsed : (unitNameToIndex[trimmed.toLowerCase()] ?? -1);
  } else {
    return "-";
  }
  const translationKey = unitTranslationKeys[index];
  if (!translationKey) return "-";
  const translations = getTranslations(locale);
  return translations[translationKey as keyof typeof translations] || "-";
}
