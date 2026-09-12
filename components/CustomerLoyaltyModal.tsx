import React, { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Gift, Loader2, Phone, Star, UserPlus, WifiOff } from "lucide-react";
import { CustomerApi } from "@/lib/api-customer";
import { usePosStore } from "@/store/posStore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/locale-provider";
import { getConnectivityState } from "@/lib/offline/connectivity";
import CustomerRewardsSection from "@/components/CustomerRewardsSection";

const CUSTOMER_LOOKUP_DEBOUNCE_MS = 450;
const MIN_PHONE_LOOKUP_LENGTH = 3;
const CUSTOMER_PHONE_MAX_LENGTH = 20;
const PHONE_PATTERN = /^[+\d][\d\s\-()]{2,19}$/;

type LookupStatus = "idle" | "typing" | "loading" | "found" | "guest" | "offline" | "invalid";

function isPhoneReady(phone: string) {
    return phone.trim().length >= MIN_PHONE_LOOKUP_LENGTH && PHONE_PATTERN.test(phone.trim());
}

export default function CustomerLoyaltyModal() {
    const { t, locale } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [phone, setPhone] = useState("");
    const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
    const requestIdRef = useRef(0);

    const {
        selectedCustomer,
        customerPhone,
        setCustomer,
        setCustomerPhone,
        clearCustomer,
        redeemPoints,
        toggleRedeemPoints,
        products,
        addToCart
    } = usePosStore();

    const displayCustomerName = selectedCustomer
        ? (locale === "ar"
            ? selectedCustomer.nameAr || selectedCustomer.displayName || selectedCustomer.name
            : selectedCustomer.displayName || selectedCustomer.name || selectedCustomer.nameAr)
        : "";

    const resolvePhone = async (phoneValue: string) => {
        const normalizedPhone = phoneValue.trim();
        const requestId = ++requestIdRef.current;

        if (!normalizedPhone) {
            clearCustomer();
            setLookupStatus("idle");
            return;
        }

        if (!isPhoneReady(normalizedPhone)) {
            setCustomer(null);
            setCustomerPhone(normalizedPhone);
            setLookupStatus(normalizedPhone.length < MIN_PHONE_LOOKUP_LENGTH ? "typing" : "invalid");
            return;
        }

        setCustomerPhone(normalizedPhone);

        if (selectedCustomer?.phoneNumber === normalizedPhone) {
            setLookupStatus("found");
            return;
        }

        if (getConnectivityState() !== "online") {
            setCustomer(null);
            setLookupStatus("offline");
            return;
        }

        setLookupStatus("loading");
        const customer = await CustomerApi.search(normalizedPhone);
        if (requestIdRef.current !== requestId) return;

        if (customer) {
            setCustomer(customer);
            setCustomerPhone(customer.phoneNumber || normalizedPhone);
            setLookupStatus("found");
            return;
        }

        setCustomer(null);
        setCustomerPhone(normalizedPhone);
        setLookupStatus("guest");
    };

    useEffect(() => {
        if (!isOpen) return;

        const normalizedPhone = phone.trim();
        if (!normalizedPhone) {
            clearCustomer();
            setLookupStatus("idle");
            return;
        }

        const timer = window.setTimeout(() => {
            void resolvePhone(normalizedPhone);
        }, CUSTOMER_LOOKUP_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [phone, isOpen]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) return;

        const nextPhone = selectedCustomer?.phoneNumber || customerPhone || "";
        setPhone(nextPhone);
        setLookupStatus(selectedCustomer ? "found" : nextPhone ? "guest" : "idle");
    };

    const handlePhoneChange = (value: string) => {
        const nextPhone = value.slice(0, CUSTOMER_PHONE_MAX_LENGTH);
        const normalizedPhone = nextPhone.trim();
        setPhone(nextPhone);

        if (!normalizedPhone) {
            clearCustomer();
            setLookupStatus("idle");
            return;
        }

        if (selectedCustomer && selectedCustomer.phoneNumber !== normalizedPhone) {
            setCustomer(null);
        }
        setCustomerPhone(normalizedPhone);
    };

    const handleRemoveCustomer = () => {
        clearCustomer();
        setPhone("");
        setLookupStatus("idle");
    };

    const handleAddFavorite = (productName: string) => {
        const product = products.find(p => p.name === productName);
        if (product) {
            addToCart(product, []);
            const productDisplayName = locale === "ar" ? product.nameAr || product.name : product.displayName || product.name;
            toast.success(`${productDisplayName} ${t("addToCartMsg")}`);
            setIsOpen(false);
        } else {
            toast.error(t("productNotFoundInMenu"));
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "Bronze": return "bg-amber-700 text-white";
            case "Silver": return "bg-slate-400 text-slate-900";
            case "Gold": return "bg-warning text-warning-foreground";
            case "VIP": return "bg-purple-600 text-white";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    const statusMessage = (() => {
        if (lookupStatus === "offline") return t("customerLookupOffline");
        if (lookupStatus === "invalid") return t("invalidPhoneNumber");
        return "";
    })();

    const favoriteProducts = selectedCustomer?.favoriteProducts ?? [];

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/20">
                    {selectedCustomer ? (
                        <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="font-semibold text-slate-900">{displayCustomerName}</span>
                        </>
                    ) : customerPhone ? (
                        <>
                            <Phone className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-slate-900">{customerPhone}</span>
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            {t("addCustomerPoints")}
                        </>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" dir={locale === "ar" ? "rtl" : "ltr"}>
                <DialogHeader>
                    <DialogTitle>{t("customerLoyaltyProgram")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="customer-loyalty-phone">
                            {t("phoneNumber")}
                        </label>
                        <div className="relative">
                            <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                id="customer-loyalty-phone"
                                type="tel"
                                inputMode="tel"
                                placeholder={t("phoneNumber")}
                                value={phone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        void resolvePhone(phone);
                                    }
                                }}
                                className="ps-9"
                                maxLength={CUSTOMER_PHONE_MAX_LENGTH}
                            />
                            {lookupStatus === "loading" && (
                                <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            )}
                        </div>
                    </div>

                    {statusMessage && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            {lookupStatus === "offline" ? (
                                <WifiOff className="h-4 w-4 text-amber-600" />
                            ) : lookupStatus === "found" ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                                <UserPlus className="h-4 w-4 text-primary" />
                            )}
                            <span>{statusMessage}</span>
                        </div>
                    )}

                    {selectedCustomer && (
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{displayCustomerName}</h3>
                                    {selectedCustomer.phoneNumber && (
                                        <p className="mt-1 text-xs text-slate-500">{selectedCustomer.phoneNumber}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-2">
                                        <Badge className={getTierColor(selectedCustomer.tier)}>
                                            {selectedCustomer.tier} {t("memberLabel")}
                                        </Badge>
                                        <span className="text-xs text-slate-400">
                                            {t("lastVisit")}: {new Date(selectedCustomer.lastVisit).toLocaleDateString(locale === "ar" ? "ar-QA" : "en-US")}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="text-sm text-slate-500">{t("pointBalance")}</div>
                                    <div className="text-2xl font-bold text-primary">
                                        {selectedCustomer.points.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-success/10 p-2 text-success">
                                        <Gift className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{t("usePoints")}</p>
                                        <p className="text-xs text-slate-500">{t("deductedFromCurrentOrder")}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={redeemPoints}
                                    onCheckedChange={toggleRedeemPoints}
                                    disabled={selectedCustomer.points <= 0}
                                />
                            </div>

                            <div>
                                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500">
                                    <Star className="w-4 h-4 text-warning" />
                                    {t("frequentlyOrdered")}
                                </h4>
                                <div className="space-y-2">
                                    {favoriteProducts.map((fav, idx) => (
                                        <div key={`${fav.productName}-${idx}`} className="group flex items-center justify-between rounded p-2 text-sm hover:bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                                    {idx + 1}
                                                </div>
                                                <span>{fav.productName}</span>
                                                <span className="text-xs text-slate-400">({fav.count})</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-primary opacity-0 transition-opacity hover:bg-primary/5 hover:text-primary group-hover:opacity-100"
                                                onClick={() => handleAddFavorite(fav.productName)}
                                            >
                                                {t("addToCartBtn")}
                                            </Button>
                                        </div>
                                    ))}
                                    {favoriteProducts.length === 0 && (
                                        <p className="ps-2 text-xs italic text-slate-400">{t("noFavoriteProducts")}</p>
                                    )}
                                </div>
                            </div>

                            <CustomerRewardsSection
                                customerId={selectedCustomer.customerId}
                                availablePoints={selectedCustomer.points}
                            />
                        </div>
                    )}

                    {(selectedCustomer || customerPhone) && (
                        <div className="flex justify-end pt-2">
                            <Button
                                variant="ghost"
                                className="text-xs text-destructive hover:bg-destructive/5 hover:text-destructive/80"
                                onClick={handleRemoveCustomer}
                            >
                                {t("removeCustomer")}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
