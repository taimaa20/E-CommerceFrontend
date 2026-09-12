"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { usePosStore } from "@/store/posStore";
import { getTables, updateTableStatus } from "@/lib/api";
import { Table, TableStatus, ProductDto, StationRouting } from "@/types/pos";
import { useLocale } from "@/components/locale-provider";
import BottomNav from "@/components/mobile/BottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
    Armchair,
    ChevronLeft,
    Search,
    ChefHat,
    Wine,
    Utensils,
    Trash2,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currencies";
import { normalizeImageSrc } from "@/lib/normalize-image-src";

export default function MobilePosPage() {
    const { t } = useLocale();
    // Store
    const {
        products,
        cart,
        selectedTable,
        fetchProducts,
        addToCart,
        removeFromCart,
        clearCart,
        setSelectedTable,
        checkoutOrder,
        currency
    } = usePosStore();

    // Local State
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchProducts();
            const tableData = await getTables();
            setTables(tableData);
            setLoading(false);
        };
        init();
    }, [fetchProducts]);

    // Derived State
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
            activeTab === "all" ? true :
                activeTab === "food" ? p.stationRouting === StationRouting.KitchenOnly || p.stationRouting === StationRouting.Both :
                    activeTab === "drink" ? p.stationRouting === StationRouting.BarOnly : true;

        return matchesSearch && matchesCategory;
    });

    const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    // Handlers
    const handleTableSelect = async (table: Table) => {
        if (table.status === TableStatus.Reserved) {
            toast.warning(t("reservedTableMsg"));
            return;
        }

        // Occupy table logic (simplified)
        if (table.status === TableStatus.Free) {
            await updateTableStatus(table.id, TableStatus.Occupied);
            // Optimistic update
            setTables(tables.map(t => t.id === table.id ? { ...t, status: TableStatus.Occupied } : t));
        }

        setSelectedTable(table);
        // Clear search and reset tab
        setSearchQuery("");
        setActiveTab("all");
    };

    const handleBackToTables = () => {
        if (cart.length > 0) {
            toast.error(t("emptyCartBeforeExit"));
            return;
        }
        setSelectedTable(null);
        // Refresh tables in background
        getTables().then(setTables);
    };

    const handleProductClick = (product: ProductDto) => {
        addToCart(product, []); // No modifiers for speed-dial
        toast.success(`${product.name} ${t("addedToCart")}`, {
            position: 'top-center',
            duration: 1000,
            icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
        });
    };

    const handleCheckout = async () => {
        if (!selectedTable) return;

        setIsProcessing(true);
        try {
            await checkoutOrder();
            toast.success(t("orderSentKitchen"), {
                position: 'top-center',
                className: 'bg-green-600 text-white border-none'
            });
            setIsCartOpen(false);
            // Optional: Auto-close table view? No, keep it open for more orders or manual exit
        } catch (error) {
            toast.error(t("orderSendFailed"));
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RENDER: Table Selection ---
    if (!selectedTable) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col pb-safe">
                <header className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm">
                    <h1 className="text-center text-xl font-bold text-slate-800">{t("tableSelection")}</h1>
                    <p className="mt-1 text-center text-sm text-slate-500">{t("tableSelectionDesc")}</p>
                </header>

                <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                    {loading ? (
                        <div className="flex justify-center pt-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : tables.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                            <Armchair className="mb-4 h-10 w-10 text-slate-300" />
                            <p className="text-base font-semibold text-slate-700">{t("noTablesMsg")}</p>
                            <p className="mt-2 text-sm text-slate-500">{t("tablesSubtitle")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white p-3 shadow-sm sm:grid-cols-3">
                                {[
                                    { status: TableStatus.Free, label: t("tableEmpty"), badge: "bg-emerald-500" },
                                    { status: TableStatus.Occupied, label: t("tableOccupied"), badge: "bg-primary" },
                                    { status: TableStatus.Reserved, label: t("tableReserved"), badge: "bg-accent-foreground" },
                                ].map((item) => (
                                    <div key={item.status} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                                        <span className={`h-3 w-3 rounded-full ${item.badge}`} />
                                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    onClick={() => handleTableSelect(table)}
                                    className={`relative aspect-square min-h-36 rounded-2xl border-2 p-3 transition-all active:scale-95
                                        flex flex-col items-center justify-center gap-2 text-center
                                        ${table.status === TableStatus.Free
                                            ? 'bg-white border-slate-200 text-slate-600 shadow-sm'
                                            : table.status === TableStatus.Occupied
                                                ? 'bg-primary/5 border-primary/20 text-primary'
                                                : 'bg-accent/10 border-indigo-200 text-indigo-700'}`}
                                    aria-label={`${table.name} - ${
                                        table.status === TableStatus.Free
                                            ? t("tableEmpty")
                                            : table.status === TableStatus.Occupied
                                                ? t("tableOccupied")
                                                : t("tableReserved")
                                    }`}
                                >
                                    <div className={`rounded-full p-3 ${table.status === TableStatus.Free ? 'bg-slate-100' :
                                            table.status === TableStatus.Occupied ? 'bg-primary/10' : 'bg-accent/10'
                                        }`}>
                                        <Armchair className="h-6 w-6" />
                                    </div>
                                    <span className="block w-full truncate text-base font-bold">
                                        {table.name}
                                    </span>
                                    <span className="text-sm font-medium">
                                        {table.status === TableStatus.Free
                                            ? t("tableEmpty")
                                            : table.status === TableStatus.Occupied
                                                ? t("tableOccupied")
                                                : t("tableReserved")}
                                    </span>
                                    {table.status !== TableStatus.Free && (
                                        <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-current animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // --- RENDER: Menu & Ordering ---
    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white shadow-sm z-10 flex-none">
                <div className="flex items-center p-3 gap-3">
                    <Button variant="ghost" size="icon" onClick={handleBackToTables} className="-ms-2">
                        <ChevronLeft className="rtl:-scale-x-100 w-6 h-6 text-slate-600" />
                    </Button>
                    <div className="flex-1">
                        <h2 className="font-bold text-slate-900">{selectedTable.name}</h2>
                        <p className="text-xs text-slate-500">{t("orderScreen")}</p>
                    </div>
                </div>

                {/* Categories & Search */}
                <div className="px-3 pb-3 space-y-3">
                    <div className="relative">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder={t("searchProductsPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl border-none bg-slate-100 ps-10"
                        />
                    </div>

                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex space-x-2 pb-1">
                            <Button
                                variant={activeTab === "all" ? "default" : "outline"}
                                onClick={() => setActiveTab("all")}
                                className={`rounded-full px-6 ${activeTab === "all" ? "bg-primary hover:bg-primary/90" : "bg-white border-slate-200 text-slate-600"}`}
                                size="sm"
                            >
                                <Utensils className="w-3 h-3 me-2" />
                                {t("allCategories")}
                            </Button>
                            <Button
                                variant={activeTab === "food" ? "default" : "outline"}
                                onClick={() => setActiveTab("food")}
                                className={`rounded-full px-6 ${activeTab === "food" ? "bg-primary hover:bg-primary/90" : "bg-white border-slate-200 text-slate-600"}`}
                                size="sm"
                            >
                                <ChefHat className="w-3 h-3 me-2" />
                                {t("foodCategory")}
                            </Button>
                            <Button
                                variant={activeTab === "drink" ? "default" : "outline"}
                                onClick={() => setActiveTab("drink")}
                                className={`rounded-full px-6 ${activeTab === "drink" ? "bg-primary hover:bg-primary/90" : "bg-white border-slate-200 text-slate-600"}`}
                                size="sm"
                            >
                                <Wine className="w-3 h-3 me-2" />
                                {t("drinksCategory")}
                            </Button>
                        </div>
                        <ScrollBar orientation="horizontal" className="invisible" />
                    </ScrollArea>
                </div>
            </header>

            {/* Product Grid */}
            <ScrollArea className="flex-1 px-3 py-2 bg-slate-50">
                <div className="grid grid-cols-2 gap-3 pb-24 md:grid-cols-3">
                    {filteredProducts.map(product => {
                        const productImageSrc = normalizeImageSrc(product.imageUrl);

                        return (
                            <Card
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="cursor-pointer overflow-hidden border-none shadow-sm transition-transform active:scale-95"
                            >
                                <div className="aspect-[4/3] bg-slate-100 relative">
                                    {productImageSrc ? (
                                        <Image
                                            src={productImageSrc}
                                            alt={product.name}
                                            fill
                                            unoptimized
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <Utensils className="w-8 h-8" />
                                        </div>
                                    )}
                                    {(product.discountedPrice && product.discountedPrice < product.basePrice) && (
                                        <span className="absolute top-2 end-2 rounded-full bg-destructive px-2 py-1 text-sm font-bold text-white">
                                            {t("saleLabel")}
                                        </span>
                                    )}
                                </div>
                                <CardContent className="p-3">
                                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 md:text-base">{product.name}</h3>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-base font-bold text-primary">
                                            {formatCurrency(product.discountedPrice || product.basePrice, currency)}
                                        </span>
                                        {product.discountedPrice && (
                                            <span className="text-sm text-slate-400 line-through">{formatCurrency(product.basePrice, currency)}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Bottom Navigation */}
            <BottomNav
                itemCount={cart.length}
                totalAmount={totalAmount}
                onCartClick={() => setIsCartOpen(true)}
            />

            {/* Cart Sheet */}
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent side="bottom" className="flex max-h-[90vh] flex-col rounded-t-3xl p-0">
                    <SheetHeader className="p-6 pb-2 border-b border-slate-100 bg-white sticky top-0 rounded-t-3xl">
                        <SheetTitle className="flex flex-wrap items-center justify-between gap-2 text-xl sm:text-2xl">
                            <span>{t("orderSummary")}</span>
                            <span className="font-bold text-primary">{selectedTable.name}</span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {cart.length === 0 ? (
                            <div className="py-20 text-center text-slate-400">{t("emptyCart")}</div>
                        ) : (
                            cart.map(item => (
                                <div key={item.cartId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-base font-semibold text-slate-900">{item.product.name}</div>
                                        <div className="text-sm text-slate-500">{formatCurrency(item.product.discountedPrice ?? item.product.basePrice, currency)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 text-end text-base font-bold text-slate-900">
                                            {formatCurrency(item.totalPrice, currency)}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.cartId)}
                                            aria-label={`${t("delete")} ${item.product.name}`}
                                            className="flex h-12 w-12 touch-manipulation items-center justify-center rounded-xl bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10 active:scale-[0.98]"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-6 safe-area-bottom">
                        <div className="flex justify-between items-end mb-6">
                            <span className="text-base font-medium text-slate-500">{t("total")}</span>
                            <span className="text-3xl font-bold text-slate-900">
                                {formatCurrency(totalAmount, currency)}
                            </span>
                        </div>

                        <Button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || isProcessing}
                            className="h-14 w-full rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90"
                        >
                            {isProcessing ? t("sendingOrder") : t("sendToKitchen")}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
