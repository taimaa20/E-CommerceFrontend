"use client";

import * as React from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HrApi, type AttendanceLocationPayload } from "@/lib/api-hr";
import { useHrMyAttendance } from "@/lib/hooks/useHr";
import { useLocale } from "@/components/locale-provider";

const GEOLOCATION_TIMEOUT_MS = 10000;
const GEOLOCATION_MAXIMUM_AGE_MS = 30000;
const MILLISECONDS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;

export default function CheckInOutButton() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const active = useHrMyAttendance();
    const [busy, setBusy] = React.useState(false);

    const elapsed = formatElapsed(active.data?.checkInAt);

    const checkIn = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const location = await getCurrentAttendanceLocation();
            await HrApi.checkIn(undefined, location);
            toast.success(isAr ? "تم تسجيل الدخول" : "Checked in");
            active.reload();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, isAr ? "فشل" : "Failed"));
        } finally { setBusy(false); }
    };

    const checkOut = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const location = await getCurrentAttendanceLocation();
            await HrApi.checkOut(undefined, location);
            toast.success(isAr ? "تم تسجيل الخروج" : "Checked out");
            active.reload();
        } catch (e: unknown) {
            toast.error(getErrorMessage(e, isAr ? "فشل" : "Failed"));
        } finally { setBusy(false); }
    };

    if (active.loading) {
        return (
            <Button variant="outline" disabled className="gap-2">
                <Clock className="h-4 w-4 animate-pulse" />
                {isAr ? "جاري..." : "Loading..."}
            </Button>
        );
    }

    if (active.data) {
        return (
            <Button onClick={checkOut} disabled={busy} variant="destructive" className="gap-2">
                <LogOut className="h-4 w-4" />
                {isAr ? "تسجيل خروج" : "Check-out"}
                {elapsed && <span className="text-xs opacity-80">· {elapsed}</span>}
            </Button>
        );
    }

    return (
        <Button onClick={checkIn} disabled={busy} className="gap-2">
            <LogIn className="h-4 w-4" />
            {isAr ? "تسجيل دخول" : "Check-in"}
        </Button>
    );
}

function formatElapsed(checkInAt?: string | null) {
    if (!checkInAt) return null;
    const start = new Date(checkInAt).getTime();
    const mins = Math.max(0, Math.round((Date.now() - start) / MILLISECONDS_PER_MINUTE));
    const h = Math.floor(mins / MINUTES_PER_HOUR);
    const m = mins % MINUTES_PER_HOUR;
    return `${h}h ${m}m`;
}

function getCurrentAttendanceLocation(): Promise<AttendanceLocationPayload | undefined> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
        return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
            () => resolve(undefined),
            {
                enableHighAccuracy: true,
                timeout: GEOLOCATION_TIMEOUT_MS,
                maximumAge: GEOLOCATION_MAXIMUM_AGE_MS,
            }
        );
    });
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message.trim() ? error.message : fallback;
}
