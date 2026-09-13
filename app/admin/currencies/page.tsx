"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/components/locale-provider";
import {
    currencyApi,
    type CurrencyCreateInput,
    type CurrencyLookup,
} from "@/lib/api-currencies";

interface CurrencyForm {
    id?: string;
    code: string;
    name: string;
    nameAr: string;
    symbol: string;
    isActive: boolean;
    sortOrder: number;
}

const emptyForm = (): CurrencyForm => ({
    code: "", name: "", nameAr: "", symbol: "", isActive: true, sortOrder: 0,
});

/**
 * The currencies the business may select.
 *
 * This screen manages a lookup, not money. Nothing here converts an amount, sets an exchange
 * rate or touches an order, a payment or a price — the currency the store actually operates in
 * stays on the Store Settings screen, and this list only decides what that screen may offer.
 */
export default function AdminCurrenciesPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const t = (en: string, ar: string) => (isAr ? ar : en);

    const [currencies, setCurrencies] = useState<CurrencyLookup[]>([]);
    const [form, setForm] = useState<CurrencyForm>(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setCurrencies(await currencyApi.list());
        } catch {
            toast.error(t("Could not load currencies", "تعذر تحميل العملات"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const edit = (currency: CurrencyLookup) => {
        setForm({
            id: currency.id,
            code: currency.code,
            name: currency.name,
            nameAr: currency.nameAr ?? "",
            symbol: currency.symbol ?? "",
            isActive: currency.isActive,
            sortOrder: currency.sortOrder,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const save = async () => {
        const code = form.code.trim().toUpperCase();
        if (!form.id && !/^[A-Z]{3}$/.test(code)) {
            toast.error(t("A currency code is three letters, such as QAR.", "رمز العملة من ثلاثة أحرف، مثل QAR."));
            return;
        }
        if (!form.name.trim()) {
            toast.error(t("A currency name is required", "اسم العملة مطلوب"));
            return;
        }

        const payload: CurrencyCreateInput = {
            code,
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || undefined,
            symbol: form.symbol.trim() || undefined,
            isActive: form.isActive,
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
        };

        setSaving(true);
        try {
            if (form.id) {
                const { code: _unused, ...update } = payload;
                await currencyApi.update(form.id, update);
            } else {
                await currencyApi.create(payload);
            }
            toast.success(t("Currency saved", "تم حفظ العملة"));
            setForm(emptyForm());
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Could not save the currency", "تعذر حفظ العملة"));
        } finally {
            setSaving(false);
        }
    };

    /** Activation is the only availability control — a currency is never deleted. */
    const setActive = async (currency: CurrencyLookup, isActive: boolean) => {
        setTogglingId(currency.id);
        try {
            await currencyApi.update(currency.id, {
                name: currency.name,
                nameAr: currency.nameAr,
                symbol: currency.symbol,
                isActive,
                sortOrder: currency.sortOrder,
            });
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Could not update the currency", "تعذر تحديث العملة"));
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isAr ? "rtl" : "ltr"}>
            <div>
                <h1 className="text-2xl font-bold">{t("Currencies", "العملات")}</h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    {t(
                        "The currencies this business can choose from. Deactivating one removes it from selection lists — it never changes an existing order, payment or price, and no amount is converted anywhere.",
                        "العملات التي يمكن لهذا النشاط الاختيار منها. إلغاء تفعيل عملة يزيلها من قوائم الاختيار فقط — ولا يغيّر أي طلب أو دفعة أو سعر قائم، ولا يتم تحويل أي مبلغ.",
                    )}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{form.id ? t("Edit currency", "تعديل العملة") : t("New currency", "عملة جديدة")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="currency-code">{t("Code", "الرمز")}</Label>
                            <Input
                                id="currency-code"
                                value={form.code}
                                maxLength={3}
                                disabled={!!form.id}
                                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                                placeholder="QAR"
                                className="uppercase"
                            />
                            <p className="text-xs text-muted-foreground">
                                {form.id
                                    ? t(
                                        "A code cannot be changed — records that already carry it would change meaning.",
                                        "لا يمكن تغيير الرمز — فالسجلات التي تحمله ستتغيّر دلالتها.",
                                    )
                                    : t("Standard ISO code, three letters.", "رمز ISO القياسي، ثلاثة أحرف.")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency-name">{t("Name", "الاسم")}</Label>
                            <Input
                                id="currency-name"
                                value={form.name}
                                maxLength={60}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t("Qatari Riyal", "ريال قطري")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency-name-ar">{t("Name (Arabic)", "الاسم (عربي)")}</Label>
                            <Input
                                id="currency-name-ar"
                                value={form.nameAr}
                                maxLength={60}
                                onChange={(event) => setForm({ ...form, nameAr: event.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency-symbol">{t("Symbol", "الرمز المعروض")}</Label>
                            <Input
                                id="currency-symbol"
                                value={form.symbol}
                                maxLength={10}
                                onChange={(event) => setForm({ ...form, symbol: event.target.value })}
                                placeholder="ر.ق"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("For display only — several currencies share a symbol.", "للعرض فقط — عدة عملات قد تتشارك الرمز نفسه.")}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="currency-sort">{t("Sort order", "الترتيب")}</Label>
                            <Input
                                id="currency-sort"
                                type="number"
                                value={form.sortOrder}
                                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                                />
                                {t("Available for selection", "متاحة للاختيار")}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="me-2 size-4 animate-spin" /> : <Plus className="me-2 size-4" />}
                            {form.id ? t("Save changes", "حفظ التغييرات") : t("Add currency", "إضافة عملة")}
                        </Button>
                        {form.id && (
                            <Button variant="outline" onClick={() => setForm(emptyForm())}>
                                {t("Cancel", "إلغاء")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("All currencies", "كل العملات")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : currencies.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t("No currencies yet.", "لا توجد عملات بعد.")}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {currencies.map((currency) => (
                                <li key={currency.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <span className="w-14 shrink-0 font-mono text-sm font-semibold">{currency.code}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{currency.name}</span>
                                        {currency.nameAr && (
                                            <span className="block truncate text-sm text-muted-foreground">{currency.nameAr}</span>
                                        )}
                                    </span>
                                    {currency.symbol && <Badge variant="secondary">{currency.symbol}</Badge>}
                                    {currency.isStoreCurrency && (
                                        <Badge>{t("Store currency", "عملة المتجر")}</Badge>
                                    )}
                                    {!currency.isActive && <Badge variant="outline">{t("Inactive", "غير مفعّلة")}</Badge>}
                                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Switch
                                            checked={currency.isActive}
                                            disabled={currency.isStoreCurrency || togglingId === currency.id}
                                            onCheckedChange={(checked) => void setActive(currency, checked)}
                                        />
                                        {t("Selectable", "قابلة للاختيار")}
                                    </label>
                                    <Button variant="outline" size="sm" onClick={() => edit(currency)}>
                                        {t("Edit", "تعديل")}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-4 text-xs text-muted-foreground">
                        {t(
                            "Currencies are never deleted. Deactivate one to withdraw it from selection while every record that already names it stays readable.",
                            "لا يتم حذف العملات نهائياً. ألغِ تفعيل العملة لسحبها من الاختيار مع بقاء كل السجلات التي تحمل رمزها قابلة للقراءة.",
                        )}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
