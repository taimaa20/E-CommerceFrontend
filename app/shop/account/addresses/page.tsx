"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AccountLayout from "@/components/showcase/account/AccountLayout";
import { customerAccountApi, type CustomerAddress, type CustomerAddressInput } from "@/lib/api-customer-account";
import { useStorefrontStore } from "@/store/storefrontStore";

const EMPTY_ADDRESS: CustomerAddressInput = {
    addressName: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    deliveryZoneId: undefined,
    isDefault: false,
};

export default function AccountAddressesPage() {
    return <AccountLayout>{isAr => <AddressBook isAr={isAr} />}</AccountLayout>;
}

/** Saved delivery addresses. Ownership is enforced by the API: every call is scoped to the token. */
function AddressBook({ isAr }: { isAr: boolean }) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const context = useStorefrontStore(state => state.context);
    const zones = context?.deliveryZones ?? [];
    const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [revision, setRevision] = useState(0);
    const [editing, setEditing] = useState<{ id: string | null; value: CustomerAddressInput } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoadError(false);
        customerAccountApi.getAddresses()
            .then(data => { if (!cancelled) setAddresses(data); })
            .catch(() => { if (!cancelled) setLoadError(true); });
        return () => { cancelled = true; };
    }, [revision]);

    const reload = () => setRevision(v => v + 1);
    const zoneName = (id?: string) => {
        const zone = zones.find(z => z.id === id);
        return zone ? (isAr ? zone.nameAr || zone.name : zone.name) : undefined;
    };

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editing) return;
        const value = editing.value;
        if (!value.addressName.trim() || !value.area.trim() || !value.street.trim()) {
            toast.error(t("Name, area and street are required", "اسم العنوان والمنطقة والشارع مطلوبة"));
            return;
        }
        setBusyId(editing.id ?? "new");
        const payload: CustomerAddressInput = {
            ...value,
            addressName: value.addressName.trim(),
            area: value.area.trim(),
            street: value.street.trim(),
            building: value.building?.trim() || undefined,
            floor: value.floor?.trim() || undefined,
            apartment: value.apartment?.trim() || undefined,
            deliveryZoneId: value.deliveryZoneId || undefined,
        };
        try {
            if (editing.id) await customerAccountApi.updateAddress(editing.id, payload);
            else await customerAccountApi.addAddress(payload);
            toast.success(t("Address saved", "تم حفظ العنوان"));
            setEditing(null);
            reload();
        } catch (error) {
            toast.error(error instanceof Error && error.message ? error.message : t("Could not save the address", "تعذر حفظ العنوان"));
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (address: CustomerAddress) => {
        setBusyId(address.id);
        try {
            await customerAccountApi.deleteAddress(address.id);
            setAddresses(current => current?.filter(a => a.id !== address.id) ?? null);
            toast.success(t("Address removed", "تم حذف العنوان"));
        } catch {
            toast.error(t("Could not remove the address", "تعذر حذف العنوان"));
        } finally {
            setBusyId(null);
        }
    };

    const setField = <K extends keyof CustomerAddressInput>(field: K, value: CustomerAddressInput[K]) =>
        setEditing(current => current && { ...current, value: { ...current.value, [field]: value } });

    if (loadError) {
        return (
            <div role="alert" className="sf-empty">
                <p className="font-semibold">{t("Could not load your addresses", "تعذر تحميل عناوينك")}</p>
                <button type="button" onClick={reload} className="sf-btn sf-btn--outline mt-5">
                    <RefreshCw className="size-4" />
                    {t("Try again", "إعادة المحاولة")}
                </button>
            </div>
        );
    }

    if (!addresses) {
        return (
            <div role="status" className="space-y-2">
                <span className="sr-only">{t("Loading addresses", "جارٍ تحميل العناوين")}</span>
                <div className="sf-skel h-20 w-full rounded-[12px]" />
                <div className="sf-skel h-20 w-full rounded-[12px]" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {editing ? (
                <form onSubmit={save} className="sf-card space-y-3 p-5">
                    <h2 className="text-base font-semibold">{editing.id ? t("Edit address", "تعديل العنوان") : t("New address", "عنوان جديد")}</h2>
                    <label className="block">
                        <span className="sf-label">{t("Address name (e.g. Home)", "اسم العنوان (مثل: المنزل)")}</span>
                        <input className="sf-field" value={editing.value.addressName} onChange={e => setField("addressName", e.target.value)} />
                    </label>
                    {zones.length > 0 && (
                        <label className="block">
                            <span className="sf-label">{t("Delivery area", "منطقة التوصيل")}</span>
                            <select className="sf-field" value={editing.value.deliveryZoneId ?? ""} onChange={e => setField("deliveryZoneId", e.target.value || undefined)}>
                                <option value="">{t("Choose an area", "اختر المنطقة")}</option>
                                {zones.map(zone => (
                                    <option key={zone.id} value={zone.id}>{isAr ? zone.nameAr || zone.name : zone.name}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="sf-label">{t("Area / address", "المنطقة / العنوان")}</span>
                            <input className="sf-field" value={editing.value.area} onChange={e => setField("area", e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="sf-label">{t("Street", "الشارع")}</span>
                            <input className="sf-field" value={editing.value.street} onChange={e => setField("street", e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="sf-label">{t("Building", "المبنى")}</span>
                            <input className="sf-field" value={editing.value.building ?? ""} onChange={e => setField("building", e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="sf-label">{t("Floor", "الطابق")}</span>
                            <input className="sf-field" value={editing.value.floor ?? ""} onChange={e => setField("floor", e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="sf-label">{t("Apartment", "الشقة")}</span>
                            <input className="sf-field" value={editing.value.apartment ?? ""} onChange={e => setField("apartment", e.target.value)} />
                        </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editing.value.isDefault} onChange={e => setField("isDefault", e.target.checked)} />
                        {t("Use as my default address", "استخدمه كعنواني الافتراضي")}
                    </label>
                    <div className="flex gap-2">
                        <button type="submit" disabled={busyId !== null} className="sf-btn sf-btn--primary">
                            {busyId !== null && <Loader2 className="size-4 animate-spin" />}
                            {t("Save address", "حفظ العنوان")}
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className="sf-btn sf-btn--outline">{t("Cancel", "إلغاء")}</button>
                    </div>
                </form>
            ) : (
                <button type="button" onClick={() => setEditing({ id: null, value: { ...EMPTY_ADDRESS, isDefault: addresses.length === 0 } })} className="sf-btn sf-btn--primary">
                    <Plus className="size-4" />
                    {t("Add address", "إضافة عنوان")}
                </button>
            )}

            {addresses.length === 0 ? (
                !editing && (
                    <div className="sf-empty">
                        <MapPin className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                        <p className="mt-3 font-semibold">{t("No saved addresses", "لا توجد عناوين محفوظة")}</p>
                    </div>
                )
            ) : (
                <ul className="space-y-2">
                    {addresses.map(address => (
                        <li key={address.id} className="sf-card flex items-start gap-3 p-4">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {address.addressName}
                                    {address.isDefault && (
                                        <span className="ms-2 rounded-full bg-[var(--sf-surface-sunken)] px-2 py-0.5 text-xs font-medium">{t("Default", "افتراضي")}</span>
                                    )}
                                </p>
                                <p className="sf-meta mt-0.5">
                                    {[zoneName(address.deliveryZoneId), address.area, address.street, address.building, address.floor && `${t("Floor", "طابق")} ${address.floor}`, address.apartment]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label={t("Edit", "تعديل")}
                                onClick={() => setEditing({ id: address.id, value: toInput(address) })}
                                className="sf-icon-btn"
                            >
                                <Pencil className="size-4" />
                            </button>
                            <button
                                type="button"
                                aria-label={t("Remove", "حذف")}
                                disabled={busyId === address.id}
                                onClick={() => remove(address)}
                                className="sf-icon-btn"
                            >
                                {busyId === address.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function toInput(address: CustomerAddress): CustomerAddressInput {
    return {
        addressName: address.addressName,
        area: address.area,
        street: address.street,
        building: address.building ?? "",
        floor: address.floor ?? "",
        apartment: address.apartment ?? "",
        deliveryZoneId: address.deliveryZoneId,
        isDefault: address.isDefault,
    };
}
