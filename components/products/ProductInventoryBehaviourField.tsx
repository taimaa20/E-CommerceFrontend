"use client";

import { Boxes, ChevronRight, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";

/**
 * How a product turns into stock.
 *
 * There is one Products area and one product form; this is the single choice that decides
 * which parts of it are relevant. It is not stored on its own — a product with its own stock
 * record is a finished good, and everything else is recipe-based — so the form can never
 * disagree with what the product actually is.
 */
export type ProductInventoryBehaviour = "recipe" | "finished";

export function ProductInventoryBehaviourField({
    value,
    onChange,
    disabledReason,
}: {
    value: ProductInventoryBehaviour;
    onChange: (next: ProductInventoryBehaviour) => void;
    /** Shown instead of the choice when the product already has data that settles it. */
    disabledReason?: string;
}) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    {ar ? "كيف يُخزَّن هذا المنتج" : "How this product is stocked"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {ar
                        ? "يحدّد هذا الخيار الأقسام المعروضة في هذه الشاشة وكيف يُخصم المخزون عند البيع."
                        : "This decides which sections of this form apply, and how stock comes off when it sells."}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <BehaviourChoice
                    selected={value === "recipe"}
                    icon={<Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
                    title={ar ? "يُحضَّر من مكوّنات" : "Made from ingredients"}
                    body={
                        ar
                            ? "يُحضَّر عند الطلب من مواد خام حسب الوصفة. البيع يخصم المكوّنات من المخزون."
                            : "Prepared to order from raw materials through its recipe. Selling it consumes the ingredients."
                    }
                    onClick={() => onChange("recipe")}
                    disabled={Boolean(disabledReason)}
                />
                <BehaviourChoice
                    selected={value === "finished"}
                    icon={<Boxes className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
                    title={ar ? "منتج جاهز يُباع كما هو" : "Finished product, sold as itself"}
                    body={
                        ar
                            ? "يُشترى جاهزًا ويُخزَّن بذاته — له رمز SKU وتكلفة شراء. البيع يخصم قطعة من المخزون."
                            : "Bought ready-made and stocked as itself — it gets a SKU and a purchase cost. Selling it takes one off the shelf."
                    }
                    onClick={() => onChange("finished")}
                    disabled={Boolean(disabledReason)}
                />
                {disabledReason && (
                    <p className="text-xs text-muted-foreground">{disabledReason}</p>
                )}
            </CardContent>
        </Card>
    );
}

function BehaviourChoice({
    selected,
    icon,
    title,
    body,
    onClick,
    disabled,
}: {
    selected: boolean;
    icon: React.ReactNode;
    title: string;
    body: string;
    onClick: () => void;
    disabled: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={selected}
            className={`flex w-full items-start gap-3 rounded-lg border p-4 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                selected ? "border-primary bg-accent" : "hover:border-primary hover:bg-accent"
            }`}
        >
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="flex-1">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
            </span>
            {!disabled && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />}
        </button>
    );
}
