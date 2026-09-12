export const DEFAULT_RESTAURANT_TIME_ZONE = "Asia/Qatar";

const ISO_OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

export function parseUtcInstant(value: string | Date): Date {
    if (value instanceof Date) return value;
    const normalized = value.includes("T") && !ISO_OFFSET_PATTERN.test(value)
        ? `${value}Z`
        : value;
    return new Date(normalized);
}

export function formatRestaurantDateTime(
    value: string | Date,
    timeZone: string,
    locale?: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    const defaults: Intl.DateTimeFormatOptions = options?.dateStyle || options?.timeStyle
        ? {}
        : {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        };
    return new Intl.DateTimeFormat(locale, {
        ...defaults,
        timeZone,
        ...options,
    }).format(parseUtcInstant(value));
}

export function formatRestaurantDate(
    value: string | Date,
    timeZone: string,
    locale?: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone,
        ...options,
    }).format(parseUtcInstant(value));
}

export function formatRestaurantTime(
    value: string | Date,
    timeZone: string,
    locale?: string,
    options?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
        ...options,
    }).format(parseUtcInstant(value));
}

export function getRestaurantDateInputValue(
    value: string | Date,
    timeZone: string,
): string {
    const parts = getZonedParts(parseUtcInstant(value), timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getRestaurantToday(timeZone: string, now: Date = new Date()): string {
    return getRestaurantDateInputValue(now, timeZone);
}

export function addCalendarDays(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    const value = new Date(Date.UTC(year, month - 1, day + days));
    return value.toISOString().slice(0, 10);
}

export function startOfRestaurantDayUtc(date: string, timeZone: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const target = Date.UTC(year, month - 1, day);
    let utc = target;

    for (let index = 0; index < 4; index += 1) {
        const parts = getZonedParts(new Date(utc), timeZone);
        const represented = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
        );
        const correction = target - represented;
        utc += correction;
        if (correction === 0) break;
    }

    return new Date(utc).toISOString();
}

export function restaurantDateRangeToUtc(
    from: string,
    through: string,
    timeZone: string,
): { startUtc: string; endUtc: string } {
    return {
        startUtc: startOfRestaurantDayUtc(from, timeZone),
        endUtc: startOfRestaurantDayUtc(addCalendarDays(through, 1), timeZone),
    };
}

export function getSupportedTimeZones(): string[] {
    const supportedValuesOf = (
        Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
    ).supportedValuesOf;

    return supportedValuesOf
        ? supportedValuesOf("timeZone")
        : [DEFAULT_RESTAURANT_TIME_ZONE, "UTC", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "America/New_York"];
}

function getZonedParts(value: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(value);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
        second: Number(map.second),
    };
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}
