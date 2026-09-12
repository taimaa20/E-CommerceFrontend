"use client";

import React, { useState, useEffect } from "react";
import { Save, Store, Receipt, Bell, Shield, Printer, Loader2, Globe, MapPin, Star, QrCode, TicketPercent, ImageIcon, MessageCircle, Hash, Timer } from "lucide-react";
import { OrderNumberingForm } from "@/components/settings/order-numbering-form";
import { ShiftRulesForm } from "@/components/settings/shift-rules-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { useBrandingStore } from "@/store/brandingStore";
import { usePosStore } from "@/store/posStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore, type SystemSettings } from "@/store/settingsStore";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type { Locale } from "@/lib/translations";
import { getVoucherAuditToday, type VoucherAuditSummary } from "@/lib/api";
import type { DuplicateInvoiceBehavior } from "@/lib/api-expense-invoices";
import { DEFAULT_VOUCHER_SETTINGS } from "@/lib/voucher";
import { formatOrderSequence } from "@/lib/order-sequence";
import {
    DEFAULT_RESTAURANT_TIME_ZONE,
    formatRestaurantTime,
    getSupportedTimeZones,
} from "@/lib/date-time";

const TIME_ZONE_OPTIONS = getSupportedTimeZones();
const COORDINATE_INPUT_STEP = "0.000001";
const RADIUS_INPUT_STEP = "1";

const formatOptionalNumber = (value: number | null | undefined) =>
    value == null ? "" : String(value);

const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseOptionalInteger = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
};

export default function SettingsPage() {
    const { locale, setLocale, t } = useLocale();
    const businessName = useBrandingStore((state) => state.businessName);
    const { setCurrency: setPosStoreCurrency, setTaxRate: setPosStoreTaxRate, setServiceChargeRate: setPosStoreServiceChargeRate } = usePosStore();
    const { updateSettings: updateNotifSettings } = useNotificationStore();
    const { settings, isLoaded, isLoading, fetchSettings, updateSettings } = useSettingsStore();

    // Local form state (initialized from backend settings once loaded)
    const [restaurantName, setRestaurantName] = useState("");
    const [restaurantTagline, setRestaurantTagline] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const [restaurantAddress, setRestaurantAddress] = useState("");
    const [restaurantPhone, setRestaurantPhone] = useState("");
    const [whatsAppNumber, setWhatsAppNumber] = useState("");
    const [restaurantEmail, setRestaurantEmail] = useState("");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [taxNumber, setTaxNumber] = useState("");
    const [timeZoneId, setTimeZoneId] = useState(DEFAULT_RESTAURANT_TIME_ZONE);
    const [footerNote, setFooterNote] = useState("");
    const [facebookUrl, setFacebookUrl] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [tikTokUrl, setTikTokUrl] = useState("");
    const [googleMapsLocationUrl, setGoogleMapsLocationUrl] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [allowedRadiusMeters, setAllowedRadiusMeters] = useState("");
    const [googleReviewUrl, setGoogleReviewUrl] = useState("");
    const [qrMenuUrl, setQrMenuUrl] = useState("");

    // Finance
    const [selectedCurrency, setSelectedCurrency] = useState("JOD");
    const [taxRate, setTaxRate] = useState("16");
    const [serviceCharge, setServiceCharge] = useState("0");
    const [enableDiscount, setEnableDiscount] = useState(true);
    const [enableLoyalty, setEnableLoyalty] = useState(true);
    const [duplicateInvoiceBehavior, setDuplicateInvoiceBehavior] =
        useState<DuplicateInvoiceBehavior>("WarningOnly");
    const [voucherEnabled, setVoucherEnabled] = useState(true);
    const [voucherAmount, setVoucherAmount] = useState(String(DEFAULT_VOUCHER_SETTINGS.amount));
    const [voucherDailyLimit, setVoucherDailyLimit] = useState(String(DEFAULT_VOUCHER_SETTINGS.dailyLimit));
    const [voucherAudit, setVoucherAudit] = useState<VoucherAuditSummary | null>(null);

    // Notifications
    const [notifyNewOrder, setNotifyNewOrder] = useState(true);
    const [notifyOrderReady, setNotifyOrderReady] = useState(true);
    const [notifyLowStock, setNotifyLowStock] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Receipt
    const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
    const [showTaxOnReceipt, setShowTaxOnReceipt] = useState(true);
    const [showLogoOnReceipt, setShowLogoOnReceipt] = useState(true);
    const [receiptCopies, setReceiptCopies] = useState("1");

    // System
    const [tableAutoRelease, setTableAutoRelease] = useState(false);
    const [orderTimeout, setOrderTimeout] = useState("30");
    const [kitchenDisplay, setKitchenDisplay] = useState(true);
    const [allowDirectCancel, setAllowDirectCancel] = useState(false);

    // Saving state per section
    const [savingSection, setSavingSection] = useState<string | null>(null);

    const applyLoadedSettings = (nextSettings: SystemSettings) => {
        setRestaurantName(nextSettings.restaurantName || businessName || "");
        setRestaurantTagline(nextSettings.restaurantTagline || "");
        setLogoUrl(nextSettings.logoUrl || "");
        setCoverImageUrl(nextSettings.coverImageUrl || "");
        setRestaurantAddress(nextSettings.restaurantAddress || "");
        setRestaurantPhone(nextSettings.restaurantPhone || "");
        setWhatsAppNumber(nextSettings.whatsAppNumber || "");
        setRestaurantEmail(nextSettings.restaurantEmail || "");
        setWebsiteUrl(nextSettings.websiteUrl || "");
        setTaxNumber(nextSettings.taxNumber || "");
        setTimeZoneId(nextSettings.timeZoneId || DEFAULT_RESTAURANT_TIME_ZONE);
        setFooterNote(nextSettings.receiptFooterNote || "");
        setFacebookUrl(nextSettings.facebookUrl || "");
        setInstagramUrl(nextSettings.instagramUrl || "");
        setTikTokUrl(nextSettings.tikTokUrl || "");
        setGoogleMapsLocationUrl(nextSettings.googleMapsLocationUrl || "");
        setLatitude(formatOptionalNumber(nextSettings.latitude));
        setLongitude(formatOptionalNumber(nextSettings.longitude));
        setAllowedRadiusMeters(formatOptionalNumber(nextSettings.allowedRadiusMeters));
        setGoogleReviewUrl(nextSettings.googleReviewUrl || "");
        setQrMenuUrl(nextSettings.qrMenuUrl || "");

        setSelectedCurrency(nextSettings.currency || "JOD");
        setTaxRate(String(nextSettings.taxRate ?? 16));
        setServiceCharge(String(nextSettings.serviceChargeRate ?? 0));
        setEnableDiscount(nextSettings.enableDiscounts);
        setEnableLoyalty(nextSettings.enableLoyalty);
        setDuplicateInvoiceBehavior(nextSettings.duplicateInvoiceBehavior);
        setVoucherEnabled(nextSettings.voucherEnabled);
        setVoucherAmount(String(nextSettings.voucherAmount ?? DEFAULT_VOUCHER_SETTINGS.amount));
        setVoucherDailyLimit(String(nextSettings.voucherDailyLimit ?? DEFAULT_VOUCHER_SETTINGS.dailyLimit));

        setNotifyNewOrder(nextSettings.notifyNewOrder);
        setNotifyOrderReady(nextSettings.notifyOrderReady);
        setNotifyLowStock(nextSettings.notifyLowStock);
        setSoundEnabled(nextSettings.soundEnabled);

        setAutoPrintReceipt(nextSettings.autoPrintReceipt);
        setShowTaxOnReceipt(nextSettings.showTaxOnReceipt);
        setShowLogoOnReceipt(nextSettings.showLogoOnReceipt);
        setReceiptCopies(String(nextSettings.receiptCopies ?? 1));

        setTableAutoRelease(nextSettings.tableAutoRelease);
        setOrderTimeout(String(nextSettings.orderPrepTimeout ?? 30));
        setKitchenDisplay(nextSettings.kitchenDisplayEnabled);
        setAllowDirectCancel(nextSettings.allowDirectCancel === true);
    };

    // Fetch settings from backend on mount
    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    // Populate form fields when settings load from backend
    useEffect(() => {
        if (!isLoaded) return;
        applyLoadedSettings(settings);
    }, [isLoaded, settings]);

    useEffect(() => {
        if (!isLoaded) return;
        void getVoucherAuditToday().then(setVoucherAudit);
    }, [isLoaded, settings.voucherEnabled, settings.voucherAmount, settings.voucherDailyLimit]);

    useEffect(() => {
        if (restaurantName || settings.restaurantName || !businessName) return;
        setRestaurantName(businessName);
    }, [businessName, restaurantName, settings.restaurantName]);

    const handleCurrencyChange = (newCurrency: string) => {
        setSelectedCurrency(newCurrency);
    };

    const handleSave = async (section: string) => {
        setSavingSection(section);

        let partial: Partial<SystemSettings> = {};

        if (section === "restaurant") {
            const resolvedRestaurantName = restaurantName.trim() || businessName?.trim() || "Retail POS";
            partial = {
                restaurantName: resolvedRestaurantName,
                restaurantTagline: restaurantTagline.trim() || null,
                logoUrl: logoUrl.trim() || null,
                coverImageUrl: coverImageUrl.trim() || null,
                restaurantAddress: restaurantAddress.trim() || null,
                restaurantPhone: restaurantPhone.trim() || null,
                whatsAppNumber: whatsAppNumber.trim() || null,
                restaurantEmail: restaurantEmail.trim() || null,
                websiteUrl: websiteUrl.trim() || null,
                taxNumber: taxNumber.trim() || null,
                timeZoneId,
                facebookUrl: facebookUrl.trim() || null,
                instagramUrl: instagramUrl.trim() || null,
                tikTokUrl: tikTokUrl.trim() || null,
                googleMapsLocationUrl: googleMapsLocationUrl.trim() || null,
                latitude: parseOptionalNumber(latitude),
                longitude: parseOptionalNumber(longitude),
                allowedRadiusMeters: parseOptionalInteger(allowedRadiusMeters),
                googleReviewUrl: googleReviewUrl.trim() || null,
                qrMenuUrl: qrMenuUrl.trim() || null,
                receiptFooterNote: footerNote.trim() || "Thank you for your visit!",
            };
        } else if (section === "finance") {
            const parsedTax = Math.min(100, Math.max(0, parseFloat(taxRate) || 0));
            const parsedService = Math.min(100, Math.max(0, parseFloat(serviceCharge) || 0));
            setTaxRate(String(parsedTax));
            setServiceCharge(String(parsedService));

            partial = {
                currency: selectedCurrency,
                taxRate: parsedTax,
                serviceChargeRate: parsedService,
                enableDiscounts: enableDiscount,
                enableLoyalty: enableLoyalty,
                duplicateInvoiceBehavior,
            };

            // Also sync to posStore for immediate use
            setPosStoreCurrency(selectedCurrency);
            setPosStoreTaxRate(parsedTax);
            setPosStoreServiceChargeRate(parsedService);
        } else if (section === "voucher") {
            const parsedAmount = Math.max(0.01, parseFloat(voucherAmount) || DEFAULT_VOUCHER_SETTINGS.amount);
            const parsedLimit = Math.max(1, parseInt(voucherDailyLimit, 10) || DEFAULT_VOUCHER_SETTINGS.dailyLimit);
            setVoucherAmount(parsedAmount.toFixed(2));
            setVoucherDailyLimit(String(parsedLimit));

            partial = {
                voucherEnabled,
                voucherAmount: parsedAmount,
                voucherDailyLimit: parsedLimit,
            };
        } else if (section === "receipt") {
            partial = {
                receiptCopies: parseInt(receiptCopies) || 1,
                autoPrintReceipt,
                showTaxOnReceipt,
                showLogoOnReceipt,
            };
        } else if (section === "notifications") {
            partial = {
                notifyNewOrder,
                notifyOrderReady,
                notifyLowStock,
                soundEnabled,
            };

            // Also sync to notification store for immediate use
            updateNotifSettings({ notifyNewOrder, notifyOrderReady, notifyLowStock, soundEnabled });
        } else if (section === "system") {
            partial = {
                language: locale,
                orderPrepTimeout: Math.min(120, Math.max(5, parseInt(orderTimeout) || 30)),
                kitchenDisplayEnabled: kitchenDisplay,
                allowDirectCancel,
                tableAutoRelease,
            };
        }

        const success = await updateSettings(partial);
        setSavingSection(null);

        if (success) {
            toast.success(`${t("savedSuccess")}`);
            if (section === "voucher") {
                void getVoucherAuditToday().then(setVoucherAudit);
            }
        } else {
            toast.error(t("anErrorOccurred"));
        }
    };

    const handleLanguageChange = (lang: string) => {
        setLocale(lang as Locale);
    };

    // Show a loader while fetching settings from backend
    if (isLoading && !isLoaded) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-2 lg:p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {t("settingsTitle")}
                </h1>
                <p className="text-muted-foreground">{t("settingsSubtitle")}</p>
            </div>

            <Tabs defaultValue="restaurant" className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="restaurant" className="gap-2"><Store className="w-4 h-4" />{t("tabRestaurant")}</TabsTrigger>
                    <TabsTrigger value="finance" className="gap-2"><Receipt className="w-4 h-4" />{t("tabFinanceTax")}</TabsTrigger>
                    <TabsTrigger value="voucher" className="gap-2"><TicketPercent className="w-4 h-4" />{locale === "ar" ? "القسائم" : "Voucher"}</TabsTrigger>
                    <TabsTrigger value="receipt" className="gap-2"><Printer className="w-4 h-4" />{t("tabReceiptPrint")}</TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" />{t("tabNotifications")}</TabsTrigger>
                    <TabsTrigger value="ordering" className="gap-2"><Hash className="w-4 h-4" />{locale === "ar" ? "إدارة الطلبات" : "Order Management"}</TabsTrigger>
                    <TabsTrigger value="shifts" className="gap-2"><Timer className="w-4 h-4" />{locale === "ar" ? "إدارة الورديات" : "Shift Management"}</TabsTrigger>
                    <TabsTrigger value="system" className="gap-2"><Shield className="w-4 h-4" />{t("tabSystem")}</TabsTrigger>
                </TabsList>

                {/* Restaurant Info */}
                <TabsContent value="restaurant">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> {t("restaurantInfo")}</CardTitle>
                            <CardDescription>{t("restaurantInfoDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="restaurantName" className="text-start">{t("restaurantName")}</Label>
                                    <Input id="restaurantName" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder={t("restaurantNamePlaceholder")} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="restaurantTagline" className="text-start">{locale === "ar" ? "الشعار التعريفي للنشاط" : "Business Tagline"}</Label>
                                    <Input id="restaurantTagline" value={restaurantTagline} onChange={e => setRestaurantTagline(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="restaurantPhone" className="text-start">{t("phoneNumber")}</Label>
                                    <Input id="restaurantPhone" value={restaurantPhone} onChange={e => setRestaurantPhone(e.target.value)} placeholder="+1 555 000 0000" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="whatsAppNumber" className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-slate-500" />
                                        {locale === "ar" ? "رقم واتساب" : "WhatsApp Number"}
                                    </Label>
                                    <Input id="whatsAppNumber" value={whatsAppNumber} onChange={e => setWhatsAppNumber(e.target.value)} placeholder="+1 555 000 0000" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="restaurantEmail" className="text-start">{t("emailAddress")}</Label>
                                    <Input id="restaurantEmail" value={restaurantEmail} onChange={e => setRestaurantEmail(e.target.value)} placeholder="info@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="taxNumber" className="text-start">{t("taxVatNumber")}</Label>
                                    <Input id="taxNumber" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="123456789" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="logoUrl" className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-slate-500" />
                                        {locale === "ar" ? "رابط الشعار" : "Logo URL"}
                                    </Label>
                                    <Input id="logoUrl" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://yourdomain.com/logo.png" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="coverImageUrl" className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 text-slate-500" />
                                        {locale === "ar" ? "رابط صورة الغلاف" : "Cover Image URL"}
                                    </Label>
                                    <Input id="coverImageUrl" value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="https://yourdomain.com/cover.jpg" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="restaurantAddress" className="text-start">{t("address")}</Label>
                                <Textarea id="restaurantAddress" value={restaurantAddress} onChange={e => setRestaurantAddress(e.target.value)} placeholder={t("addressPlaceholder")} rows={2} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="restaurantTimeZone" className="text-start">
                                    {locale === "ar" ? "المنطقة الزمنية للنشاط" : "Business Time Zone"}
                                </Label>
                                <Select value={timeZoneId} onValueChange={setTimeZoneId}>
                                    <SelectTrigger id="restaurantTimeZone">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {TIME_ZONE_OPTIONS.map((zone) => (
                                            <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {locale === "ar"
                                        ? "تُحسب الطلبات اليومية والتقارير وأرصدة الكاشير حسب هذه المنطقة."
                                        : "Daily orders, reports, and cashier balances use this time zone."}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="footerNote" className="text-start">{t("receiptFooterNote")}</Label>
                                <Input id="footerNote" value={footerNote} onChange={e => setFooterNote(e.target.value)} placeholder={t("footerNotePlaceholder")} />
                            </div>
                            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                        <Globe className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{t("onlineLinks")}</h3>
                                        <p className="text-sm text-muted-foreground">{t("onlineLinksDesc")}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-slate-500" />
                                            {locale === "ar" ? "رابط الموقع" : "Website Link"}
                                        </Label>
                                        <Input id="websiteUrl" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourdomain.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="facebookUrl" className="text-start">{t("facebookLink")}</Label>
                                        <Input id="facebookUrl" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/your-page" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="instagramUrl" className="text-start">{t("instagramLink")}</Label>
                                        <Input id="instagramUrl" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/your-page" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="tikTokUrl" className="text-start">{t("tikTokLink")}</Label>
                                        <Input id="tikTokUrl" value={tikTokUrl} onChange={e => setTikTokUrl(e.target.value)} placeholder="https://tiktok.com/@your-page" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="googleMapsLocationUrl" className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-500" />
                                            {t("googleMapsLink")}
                                        </Label>
                                        <Input id="googleMapsLocationUrl" value={googleMapsLocationUrl} onChange={e => setGoogleMapsLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="branchLatitude" className="text-start">
                                            {locale === "ar" ? "خط عرض الفرع" : "Branch Latitude"}
                                        </Label>
                                        <Input id="branchLatitude" type="number" step={COORDINATE_INPUT_STEP} value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="25.285447" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="branchLongitude" className="text-start">
                                            {locale === "ar" ? "خط طول الفرع" : "Branch Longitude"}
                                        </Label>
                                        <Input id="branchLongitude" type="number" step={COORDINATE_INPUT_STEP} value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="51.531040" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="allowedRadiusMeters" className="text-start">
                                            {locale === "ar" ? "نطاق الحضور بالمتر" : "Attendance Radius (meters)"}
                                        </Label>
                                        <Input id="allowedRadiusMeters" type="number" min="1" step={RADIUS_INPUT_STEP} value={allowedRadiusMeters} onChange={e => setAllowedRadiusMeters(e.target.value)} placeholder="100" />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label htmlFor="googleReviewUrl" className="flex items-center gap-2">
                                            <Star className="h-4 w-4 text-slate-500" />
                                            {t("googleReviewLink")}
                                        </Label>
                                        <Input id="googleReviewUrl" value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)} placeholder="https://g.page/r/.../review" />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label htmlFor="qrMenuUrl" className="flex items-center gap-2">
                                            <QrCode className="h-4 w-4 text-slate-500" />
                                            QR Menu URL
                                        </Label>
                                        <Input id="qrMenuUrl" value={qrMenuUrl} onChange={e => setQrMenuUrl(e.target.value)} placeholder="https://yourdomain.com/menu" />
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => handleSave("restaurant")} className="gap-2" disabled={savingSection === "restaurant"}>
                                {savingSection === "restaurant" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Finance & Tax */}
                <TabsContent value="finance">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> {t("financeTax")}</CardTitle>
                            <CardDescription>{t("financeTaxDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-start">{t("currency")}</Label>
                                    <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="JOD">JOD – {SUPPORTED_CURRENCIES.JOD.name}</SelectItem>
                                            <SelectItem value="USD">USD – {SUPPORTED_CURRENCIES.USD.name}</SelectItem>
                                            <SelectItem value="EGP">EGP – {SUPPORTED_CURRENCIES.EGP.name}</SelectItem>
                                            <SelectItem value="SAR">SAR – {SUPPORTED_CURRENCIES.SAR.name}</SelectItem>
                                            <SelectItem value="QAR">QAR – {SUPPORTED_CURRENCIES.QAR.name}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="taxRate" className="text-start">{t("taxRate")}</Label>
                                    <Input id="taxRate" type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="serviceCharge" className="text-start">{t("serviceCharge")}</Label>
                                    <Input id="serviceCharge" type="number" min="0" max="100" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("enableDiscounts")}</p>
                                        <p className="text-muted-foreground text-xs">{t("enableDiscountsDesc")}</p>
                                    </div>
                                    <Switch checked={enableDiscount} onCheckedChange={setEnableDiscount} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("enableLoyalty")}</p>
                                        <p className="text-muted-foreground text-xs">{t("enableLoyaltyDesc")}</p>
                                    </div>
                                    <Switch checked={enableLoyalty} onCheckedChange={setEnableLoyalty} />
                                </div>
                                <div className="space-y-1 rounded-lg border p-3">
                                    <Label className="text-start">
                                        {locale === "ar" ? "التعامل مع الفواتير المتشابهة" : "Duplicate invoice behavior"}
                                    </Label>
                                    <Select
                                        value={duplicateInvoiceBehavior}
                                        onValueChange={(value) =>
                                            setDuplicateInvoiceBehavior(value as DuplicateInvoiceBehavior)
                                        }
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="WarningOnly">
                                                {locale === "ar" ? "تحذير مع السماح بالمتابعة" : "Warn and allow override"}
                                            </SelectItem>
                                            <SelectItem value="BlockSave">
                                                {locale === "ar" ? "منع الحفظ" : "Block save"}
                                            </SelectItem>
                                            <SelectItem value="Disabled">
                                                {locale === "ar" ? "تعطيل الفحص" : "Disable duplicate check"}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {locale === "ar"
                                            ? "يعتمد الفحص على المورّد ورقم الفاتورة وتاريخها."
                                            : "Checks supplier, invoice number, and invoice date."}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => handleSave("finance")} className="gap-2" disabled={savingSection === "finance"}>
                                {savingSection === "finance" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Voucher */}
                <TabsContent value="voucher">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TicketPercent className="w-5 h-5" />
                                {locale === "ar" ? "إعدادات القسائم" : "Voucher Settings"}
                            </CardTitle>
                            <CardDescription>
                                {locale === "ar"
                                    ? "تحكم في تفعيل القسيمة وقيمتها والحد اليومي من لوحة الإدارة فقط."
                                    : "Control voucher availability, value, and the daily order limit from admin only."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                                <div>
                                    <p className="font-medium text-sm">{locale === "ar" ? "تفعيل القسيمة" : "Enable Voucher"}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {locale === "ar" ? "يظهر للكاشير كخانة اختيار فقط عند الدفع." : "Cashiers see only a checkbox in the payment popup."}
                                    </p>
                                </div>
                                <Switch checked={voucherEnabled} onCheckedChange={setVoucherEnabled} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="voucherAmount" className="text-start">
                                        {locale === "ar" ? "قيمة القسيمة" : "Voucher Amount"}
                                    </Label>
                                    <Input
                                        id="voucherAmount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={voucherAmount}
                                        onChange={e => setVoucherAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="voucherDailyLimit" className="text-start">
                                        {locale === "ar" ? "الحد اليومي للطلبات" : "Daily Order Limit"}
                                    </Label>
                                    <Input
                                        id="voucherDailyLimit"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={voucherDailyLimit}
                                        onChange={e => setVoucherDailyLimit(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200">
                                <div className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-sm">{locale === "ar" ? "سجل قسائم اليوم" : "Today's Voucher Log"}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {locale === "ar" ? "الطلبات التي استخدمت القسيمة اليوم." : "Orders that used a voucher today."}
                                        </p>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-700">
                                        {(voucherAudit?.usedToday ?? 0)}/{voucherAudit?.dailyLimit ?? voucherDailyLimit}
                                        <span className="ms-2 text-muted-foreground">
                                            {locale === "ar" ? "متبقي" : "remaining"} {voucherAudit?.remainingToday ?? 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {(voucherAudit?.orders ?? []).length === 0 ? (
                                        <div className="p-3 text-sm text-muted-foreground">
                                            {locale === "ar" ? "لا توجد قسائم مستخدمة اليوم." : "No vouchers used today."}
                                        </div>
                                    ) : (
                                        voucherAudit!.orders.map((order) => (
                                            <div key={order.orderId} className="grid grid-cols-2 gap-2 p-3 text-sm sm:grid-cols-4">
                                                <span className="font-semibold text-slate-800">
                                                    {formatOrderSequence(order) ?? `#${order.orderNumber}`}
                                                </span>
                                                <span>{formatCurrency(order.discountAmount, selectedCurrency)}</span>
                                                <span>{formatRestaurantTime(order.usedAt, timeZoneId, locale === "ar" ? "ar" : "en")}</span>
                                                <span className="text-muted-foreground">{order.createdByName || "-"}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <Button onClick={() => handleSave("voucher")} className="gap-2" disabled={savingSection === "voucher"}>
                                {savingSection === "voucher" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Receipt & Print */}
                <TabsContent value="receipt">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Printer className="w-5 h-5" /> {t("receiptPrint")}</CardTitle>
                            <CardDescription>{t("receiptPrintDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-start">{t("receiptCopies")}</Label>
                                    <Select value={receiptCopies} onValueChange={setReceiptCopies}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">{t("copy1")}</SelectItem>
                                            <SelectItem value="2">{t("copy2")}</SelectItem>
                                            <SelectItem value="3">{t("copy3")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("autoPrintReceipt")}</p>
                                        <p className="text-muted-foreground text-xs">{t("autoPrintReceiptDesc")}</p>
                                    </div>
                                    <Switch checked={autoPrintReceipt} onCheckedChange={setAutoPrintReceipt} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("showTaxBreakdown")}</p>
                                        <p className="text-muted-foreground text-xs">{t("showTaxBreakdownDesc")}</p>
                                    </div>
                                    <Switch checked={showTaxOnReceipt} onCheckedChange={setShowTaxOnReceipt} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("showLogo")}</p>
                                        <p className="text-muted-foreground text-xs">{t("showLogoDesc")}</p>
                                    </div>
                                    <Switch checked={showLogoOnReceipt} onCheckedChange={setShowLogoOnReceipt} />
                                </div>
                            </div>
                            <Button onClick={() => handleSave("receipt")} className="gap-2" disabled={savingSection === "receipt"}>
                                {savingSection === "receipt" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> {t("notifications")}</CardTitle>
                            <CardDescription>{t("notificationsDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{t("newOrderAlert")}</p>
                                    <p className="text-muted-foreground text-xs">{t("newOrderAlertDesc")}</p>
                                </div>
                                <Switch checked={notifyNewOrder} onCheckedChange={setNotifyNewOrder} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{t("orderReadyAlert")}</p>
                                    <p className="text-muted-foreground text-xs">{t("orderReadyAlertDesc")}</p>
                                </div>
                                <Switch checked={notifyOrderReady} onCheckedChange={setNotifyOrderReady} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{t("lowStockAlert")}</p>
                                    <p className="text-muted-foreground text-xs">{t("lowStockAlertDesc")}</p>
                                </div>
                                <Switch checked={notifyLowStock} onCheckedChange={setNotifyLowStock} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{t("soundEffects")}</p>
                                    <p className="text-muted-foreground text-xs">{t("soundEffectsDesc")}</p>
                                </div>
                                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                            </div>
                            <Button onClick={() => handleSave("notifications")} className="gap-2 mt-2" disabled={savingSection === "notifications"}>
                                {savingSection === "notifications" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Order Management → Order Numbering */}
                <TabsContent value="ordering">
                    <OrderNumberingForm />
                </TabsContent>

                {/* Shift Management → Opening & Closing Rules */}
                <TabsContent value="shifts">
                    <ShiftRulesForm />
                </TabsContent>

                {/* System */}
                <TabsContent value="system">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> {t("system")}</CardTitle>
                            <CardDescription>{t("systemDesc")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-start">{t("language")}</Label>
                                    <Select value={locale} onValueChange={handleLanguageChange}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">{t("english")}</SelectItem>
                                            <SelectItem value="ar">{t("arabic")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="orderTimeout" className="text-start">{t("orderPrepTimeout")}</Label>
                                    <Input id="orderTimeout" type="number" min="5" max="120" value={orderTimeout} onChange={e => setOrderTimeout(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{t("allowDirectCancel")}</p>
                                        <p className="text-muted-foreground text-xs">{t("allowDirectCancelDesc")}</p>
                                    </div>
                                    <Switch checked={allowDirectCancel} onCheckedChange={setAllowDirectCancel} />
                                </div>
                            </div>
                            <Button onClick={() => handleSave("system")} className="gap-2" disabled={savingSection === "system"}>
                                {savingSection === "system" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("save")}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
