"use client";

import { ChangeEvent, type ReactNode } from "react";
import { DollarSign, Link2, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/currencies";
import {
    DELIVERY_PARTNER_PRICING_RULE,
    DeliveryPartnerProductMappingDto,
    DeliveryPartnerPricingRule,
    getDeliveryPartnerMappingPartnerName,
    getPricingRuleLabel,
    resolveMappingEffectivePrice,
} from "@/lib/api-delivery-partners";

interface ProductDeliveryPartnersTabProps {
    rows: DeliveryPartnerProductMappingDto[];
    basePrice: number;
    currency: string;
    ar: boolean;
    disabled?: boolean;
    onRowsChange: (rows: DeliveryPartnerProductMappingDto[]) => void;
    onDirty: (partnerId: string) => void;
}

const PRICING_MODE_DEFAULT = "partner-default";

export default function ProductDeliveryPartnersTab({
    rows,
    basePrice,
    currency,
    ar,
    disabled,
    onRowsChange,
    onDirty,
}: ProductDeliveryPartnersTabProps) {
    const text = {
        externalId: ar ? "معرّف المنتج لدى الشريك" : "Partner product ID",
        pricing: ar ? "التسعير" : "Pricing",
        value: ar ? "القيمة" : "Value",
        customPrice: ar ? "السعر المخصص" : "Custom price",
        result: ar ? "السعر النهائي" : "Final price",
        enabled: ar ? "مفعل" : "Enabled",
        available: ar ? "متوفر" : "Available",
        empty: ar ? "لا يوجد شركاء توصيل فعالون" : "No active delivery partners",
        disabled: ar ? "احفظ المنتج أولاً لتفعيل الشركاء" : "Save the product first to enable partners",
        partnerDefault: ar ? "قاعدة الشريك" : "Partner default",
    };

    const updateRow = (partnerId: string, patch: Partial<DeliveryPartnerProductMappingDto>) => {
        onRowsChange(rows.map((row) => {
            if (row.partnerId !== partnerId) return row;
            return resolveMappingEffectivePrice({ ...row, productBasePrice: basePrice, ...patch });
        }));
        onDirty(partnerId);
    };

    const updatePartnerProductId = (partnerId: string) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            updateRow(partnerId, { partnerProductId: event.target.value || null });
        };

    const updateNumber = (partnerId: string, key: "pricingRuleValue" | "customPrice") =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value === "" ? null : Number(event.target.value);
            updateRow(partnerId, { [key]: value !== null && Number.isFinite(value) ? value : null });
        };

    const updatePricingMode = (partnerId: string, value: string) => {
        if (value === PRICING_MODE_DEFAULT) {
            updateRow(partnerId, { pricingRuleType: null, pricingRuleValue: null, customPrice: null });
            return;
        }

        const rule = Number(value) as DeliveryPartnerPricingRule;
        updateRow(partnerId, {
            pricingRuleType: rule,
            pricingRuleValue: rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? null : 0,
            customPrice: rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? basePrice : null,
        });
    };

    if (rows.length === 0) {
        return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{text.empty}</div>;
    }

    return (
        <div className="space-y-4">
            {disabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {text.disabled}
                </div>
            ) : null}

            <div className="space-y-3">
                {rows.map((raw) => {
                    const row = resolveMappingEffectivePrice({ ...raw, productBasePrice: basePrice });
                    const pricingMode = row.pricingRuleType == null ? PRICING_MODE_DEFAULT : String(row.pricingRuleType);
                    const usesValue = row.pricingRuleType != null
                        && row.pricingRuleType !== DELIVERY_PARTNER_PRICING_RULE.None
                        && row.pricingRuleType !== DELIVERY_PARTNER_PRICING_RULE.CustomPrice;
                    const usesCustomPrice = row.pricingRuleType === DELIVERY_PARTNER_PRICING_RULE.CustomPrice;

                    return (
                        <div key={row.partnerId} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
                                <div className="space-y-3.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-lg font-semibold text-slate-900">
                                                {getDeliveryPartnerMappingPartnerName(row, ar)}
                                            </div>
                                            <div className="text-sm text-slate-500">{row.partnerCode}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                                        <ToggleControl
                                            label={text.enabled}
                                            checked={row.isEnabled}
                                            disabled={disabled}
                                            onChange={(checked) => updateRow(row.partnerId, { isEnabled: checked })}
                                        />
                                        <ToggleControl
                                            label={text.available}
                                            checked={row.isAvailable}
                                            disabled={disabled}
                                            onChange={(checked) => updateRow(row.partnerId, { isAvailable: checked })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label={text.externalId}>
                                        <div className="relative">
                                            <Link2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={row.partnerProductId ?? ""}
                                                disabled={disabled}
                                                onChange={updatePartnerProductId(row.partnerId)}
                                                className="ps-9"
                                                maxLength={120}
                                            />
                                        </div>
                                    </Field>

                                    <Field label={text.pricing}>
                                        <Select value={pricingMode} onValueChange={(value) => updatePricingMode(row.partnerId, value)} disabled={disabled}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={PRICING_MODE_DEFAULT}>{text.partnerDefault}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.None)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.None, ar)}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease, ar)}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount, ar)}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease, ar)}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount, ar)}</SelectItem>
                                                <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.CustomPrice)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.CustomPrice, ar)}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <Field label={usesCustomPrice ? text.customPrice : text.value}>
                                        {usesCustomPrice ? (
                                            <div className="relative">
                                                <DollarSign className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <Input type="number" min={0} step="0.01" value={row.customPrice ?? ""} disabled={disabled} onChange={updateNumber(row.partnerId, "customPrice")} className="ps-9" />
                                            </div>
                                        ) : usesValue ? (
                                            <Input type="number" min={0} step="0.01" value={row.pricingRuleValue ?? ""} disabled={disabled} onChange={updateNumber(row.partnerId, "pricingRuleValue")} />
                                        ) : (
                                            <div className="flex h-12 items-center">
                                                <Badge variant="secondary">{row.priceSource === "PartnerDefault" ? text.partnerDefault : getPricingRuleLabel(row.effectivePricingRuleType, ar)}</Badge>
                                            </div>
                                        )}
                                    </Field>

                                    <Field label={text.result}>
                                        <div className="flex h-12 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-semibold text-slate-900">
                                            {formatCurrency(row.effectivePrice, currency)}
                                        </div>
                                    </Field>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ToggleControl({
    label,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex h-11 items-center justify-between gap-3 rounded-md border border-slate-200 px-3">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            {children}
        </label>
    );
}
