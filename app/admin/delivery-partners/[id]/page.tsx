"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Truck } from "lucide-react";
import DeliveryPartnerProductsManager from "@/components/admin/DeliveryPartnerProductsManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";
import { config } from "@/lib/config";
import {
    DELIVERY_PARTNER_STATUS,
    getDeliveryPartner,
    getDeliveryPartnerName,
    getPricingRuleLabel,
    type DeliveryPartnerDto,
} from "@/lib/api-delivery-partners";

export default function DeliveryPartnerDetailsPage() {
    const params = useParams<{ id: string | string[] }>();
    const partnerId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { locale } = useLocale();
    const ar = locale === "ar";
    const [partner, setPartner] = useState<DeliveryPartnerDto | null>(null);
    const [loading, setLoading] = useState(true);

    const text = {
        title: ar ? "تفاصيل شريك التوصيل" : "Delivery Partner Details",
        back: ar ? "الرجوع للشركاء" : "Back to partners",
        refresh: ar ? "تحديث" : "Refresh",
        status: ar ? "الحالة" : "Status",
        active: ar ? "فعال" : "Active",
        disabled: ar ? "معطل" : "Disabled",
        integration: ar ? "التكامل" : "Integration",
        pricingRule: ar ? "قاعدة السعر" : "Pricing rule",
        products: ar ? "المنتجات" : "Products",
        noPartner: ar ? "شريك التوصيل غير موجود" : "Delivery partner not found",
        failedLoad: ar ? "تعذر تحميل شريك التوصيل" : "Could not load delivery partner",
        featureOff: ar ? "ميزة شركاء التوصيل غير مفعلة" : "Delivery Partners is disabled",
        loading: ar ? "جار التحميل..." : "Loading...",
    };

    const loadPartner = async () => {
        if (!partnerId || !config.deliveryPartnersEnabled) return;
        setLoading(true);
        try {
            setPartner(await getDeliveryPartner(partnerId));
        } catch {
            setPartner(null);
            toast.error(text.failedLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPartner();
    }, [partnerId]);

    if (!config.deliveryPartnersEnabled) {
        return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">{text.featureOff}</div>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Button asChild variant="ghost" size="sm" className="w-fit gap-2 px-0">
                        <Link href="/ntxadminpos/delivery-partners">
                            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                            {text.back}
                        </Link>
                    </Button>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                            <Truck className="h-6 w-6 text-primary" />
                            {partner ? getDeliveryPartnerName(partner, ar) : text.title}
                        </h1>
                        {partner ? <p className="mt-1 text-sm text-slate-500">{partner.code}</p> : null}
                    </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => void loadPartner()} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {text.refresh}
                </Button>
            </div>

            {loading ? (
                <Card><CardContent className="p-6 text-sm text-slate-500">{text.loading}</CardContent></Card>
            ) : !partner ? (
                <Card><CardContent className="p-6 text-sm text-slate-500">{text.noPartner}</CardContent></Card>
            ) : (
                <>
                    <Card>
                        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoTile label={text.status}>
                                <Badge variant={partner.status === DELIVERY_PARTNER_STATUS.Active ? "default" : "secondary"}>
                                    {partner.status === DELIVERY_PARTNER_STATUS.Active ? text.active : text.disabled}
                                </Badge>
                            </InfoTile>
                            <InfoTile label={text.integration}>
                                <Badge variant={partner.integrationEnabled ? "default" : "secondary"}>
                                    {partner.integrationEnabled ? text.active : text.disabled}
                                </Badge>
                            </InfoTile>
                            <InfoTile label={text.pricingRule}>
                                <span>{getPricingRuleLabel(partner.defaultPricingRuleType, ar)} {partner.defaultPricingRuleValue > 0 ? partner.defaultPricingRuleValue : ""}</span>
                            </InfoTile>
                            <InfoTile label={text.products}>
                                <span>{partner.enabledProductCount}/{partner.productMappingCount}</span>
                            </InfoTile>
                        </CardContent>
                    </Card>

                    <DeliveryPartnerProductsManager partner={partner} />
                </>
            )}
        </div>
    );
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{children}</div>
        </div>
    );
}
