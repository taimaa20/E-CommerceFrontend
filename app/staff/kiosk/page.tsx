"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useLocale } from "@/components/locale-provider";
import {
    Delete,
    ArrowRight,
    User,
    Clock,
    LogIn,
    LogOut,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { StaffApi, StaffStatusDto } from "@/lib/api-staff";

export default function StaffKioskPage() {
    const { t, locale } = useLocale();
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<"PIN" | "ACTION" | "SUCCESS">("PIN");

    const [staff, setStaff] = useState<StaffStatusDto | null>(null);
    const [lastActionMessage, setLastActionMessage] = useState("");

    // Auto-reset timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (currentStep === "SUCCESS" || currentStep === "ACTION") {
            timer = setTimeout(() => {
                resetKiosk();
            }, currentStep === "SUCCESS" ? 5000 : 30000); // 5s after success, 30s if idle on action screen
        }
        return () => clearTimeout(timer);
    }, [currentStep]);

    const resetKiosk = () => {
        setPin("");
        setStaff(null);
        setCurrentStep("PIN");
        setLastActionMessage("");
    };

    const handleNumClick = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleIdentify = async () => {
        if (pin.length < 4) return;
        setLoading(true);
        const user = await StaffApi.identify(pin);
        setLoading(false);

        if (user) {
            setStaff(user);
            setCurrentStep("ACTION");
            setPin(""); // Clear pin for security
        } else {
            toast.error(t("invalidPinCode"));
            setPin("");
        }
    };

    const handleClockAction = async (action: "IN" | "OUT") => {
        if (!staff) return;
        setLoading(true);
        try {
            await StaffApi.clockAction(staff.userId, action);

            const timeStr = format(new Date(), "HH:mm");
            const staffName = getStaffDisplayName(staff);
            const msg = action === "IN"
                ? `${t("helloMsg")} ${staffName}, ${t("shiftStartedMsg")} ${timeStr}. ${t("haveGreatShift")}`
                : `${t("goodbyeMsg")} ${staffName}, ${t("shiftEndedMsg")} ${timeStr}. ${t("getRest")}`;

            setLastActionMessage(msg);
            setCurrentStep("SUCCESS");
            toast.success(action === "IN" ? t("clockInSuccessful") : t("clockOutSuccessful"));
        } catch (e) {
            toast.error(t("actionFailed"));
        } finally {
            setLoading(false);
        }
    };

    const getStaffDisplayName = (value: StaffStatusDto) =>
        locale === "ar" ? (value.fullNameAr || value.fullName) : (value.fullName || value.fullNameAr || "");

    // Render Steps
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">

            {/* Background Decoration */}
            <div className="absolute top-0 start-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-40 -end-40 w-96 h-96 bg-orange-600 rounded-full blur-[128px]"></div>
                <div className="absolute top-1/2 -start-40 w-96 h-96 bg-blue-600 rounded-full blur-[128px]"></div>
            </div>

            {/* Header */}
            <div className="z-10 mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight mb-2">{t("staffCol")}</h1>
                <p className="text-slate-400 text-lg">
                    {format(new Date(), "MMMM d, yyyy, EEEE HH:mm")}
                </p>
            </div>

            {/* Main Container */}
            <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl w-full max-w-md min-h-[500px] flex flex-col justify-center">

                {/* STEP 1: PIN ENTRY */}
                {currentStep === "PIN" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-4">
                            <h2 className="text-2xl font-medium text-slate-200">{t("enterPin")}</h2>

                            {/* PIN Dots */}
                            <div className="flex justify-center gap-4 h-12">
                                {[...Array(6)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? "bg-orange-500 scale-125" : "bg-slate-700"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-4 mx-auto max-w-[280px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleNumClick(num.toString())}
                                    className="h-20 w-20 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-2xl font-bold text-slate-200 border border-slate-700/50"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleBackspace}
                                className="h-20 w-20 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all font-medium"
                            >
                                <Delete className="w-8 h-8" />
                            </button>
                            <button
                                onClick={() => handleNumClick("0")}
                                className="h-20 w-20 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-2xl font-bold text-slate-200 border border-slate-700/50"
                            >
                                0
                            </button>
                            <button
                                onClick={handleIdentify}
                                disabled={pin.length < 6 || loading}
                                className="h-20 w-20 rounded-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center text-white shadow-lg shadow-orange-900/50"
                            >
                                {loading ? <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full" /> : <ArrowRight className="rtl:-scale-x-100 w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: ACTION */}
                {currentStep === "ACTION" && staff && (
                    <div className="space-y-8 text-center animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700">
                                <User className="w-12 h-12 text-slate-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-1">{getStaffDisplayName(staff)}</h3>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${staff.isClockedIn ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-slate-800 text-slate-400 border-slate-700"
                                    }`}>
                                    <Clock className="w-4 h-4 me-2" />
                                    {staff.isClockedIn ? `${t("activeRole")}: ${t("statusPreparing")}` : `${t("activeRole")}: ${t("statusCancelled")}`}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-4">
                            {!staff.isClockedIn ? (
                                <button
                                    onClick={() => handleClockAction("IN")}
                                    disabled={loading}
                                    className="w-full h-20 rounded-2xl bg-green-600 hover:bg-green-500 active:scale-95 transition-all flex items-center justify-center gap-4 text-xl font-bold shadow-lg shadow-green-900/50"
                                >
                                    <LogIn className="w-8 h-8" />
                                    {t("statusPending")} {t("staffCol")}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleClockAction("OUT")}
                                    disabled={loading}
                                    className="w-full h-20 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-4 text-xl font-bold shadow-lg shadow-red-900/50"
                                >
                                    <LogOut className="w-8 h-8" />
                                    {t("statusCompleted")} {t("staffCol")}
                                </button>
                            )}

                            <button
                                onClick={resetKiosk}
                                className="text-slate-500 hover:text-white text-sm py-4"
                            >
                                {t("cancel")}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {currentStep === "SUCCESS" && (
                    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">{t("statusApproved")} {t("statusCompleted")}</h3>
                        <p className="text-slate-300 text-lg leading-relaxed px-4">
                            {lastActionMessage}
                        </p>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-500 w-full animate-[shrink_5s_linear_forwards]" />
                        </div>
                        <p className="text-xs text-slate-500">Screen will close automatically...</p>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-slate-600 text-sm">
                Staff Kiosk v1.0 • Secure Terminal
            </div>

            <style jsx global>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}
