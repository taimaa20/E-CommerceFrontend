"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
    ShoppingCart,
    Truck,
    PackageCheck,
    AlertCircle,
    Plus,
    MoreHorizontal,
    CheckCircle,
    FileText,
    ArrowRight,
    Layers,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ImportedPurchaseHistory } from "@/components/purchasing/ImportedPurchaseHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ProcurementApi, PurchaseOrder, Supplier, SuggestedOrderDto } from "@/lib/api-procurement";
import { StandardFilter } from "@/components/filters/StandardFilter";
import { api, getRawMaterials } from "@/lib/api";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { useActiveBranchVersion } from "@/store/branchContextStore";
import { formatCurrency } from "@/lib/currencies";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { PurchaseOrdersPanel } from "@/components/purchasing/PurchaseOrdersPanel";

// Unit ID to Name Mapping
const UNIT_NAMES: { [key: number]: string } = {
    0: 'units',
    1: 'kg',
    2: 'g',
    3: 'l',
    4: 'ml',
    5: 'pieces',
    6: 'box',
    7: 'dozen',
    8: 'pack',
};

const getUnitName = (unitId: number | string | undefined): string => {
    if (!unitId) return 'units';
    const id = parseInt(String(unitId));
    return UNIT_NAMES[id] || 'units';
};

const PURCHASE_UNIT_PRICE_STEP = "0.001";
const PURCHASE_UNIT_PRICE_PLACEHOLDER = "0.000";
const PURCHASE_UNIT_PRICE_PRECISION_ERROR = "Unit price must have no more than 3 decimal places";
const PURCHASE_UNIT_PRICE_PATTERN = /^(?:\d+|\d*\.\d{1,3})$/;

const isValidPurchaseUnitPriceInput = (value: string): boolean => (
    PURCHASE_UNIT_PRICE_PATTERN.test(value.trim())
);

const formatPurchaseCurrency = (amount: number, currencyCode: string): string => {
    const currency = SUPPORTED_CURRENCIES[currencyCode]?.code ?? DEFAULT_CURRENCY;

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
    }).format(amount);
};

// Helper function to detect Arabic characters
const isArabic = (text: string | undefined): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
};

export default function ProcurementPage() {
    const { t, locale } = useLocale()
    // Suppliers has its own sidebar entry, so ?tab= picks the opening tab. Anything
    // other than "suppliers" (including no query at all) still lands on orders.
    const searchParams = useSearchParams()
    const initialTab = searchParams.get("tab") === "suppliers" ? "suppliers" : "orders"
    const [tab, setTab] = useState(initialTab)
    // Set when the operator clicks a supplier's purchase-order badge: switch to the orders
    // tab with that supplier's name already in the search box.
    const [supplierFilter, setSupplierFilter] = useState("")
    const showSupplierOrders = (supplierName: string) => {
        setSupplierFilter(supplierName)
        setTab("orders")
    }
    return (
        <div className="min-h-screen bg-slate-50/50 p-4 space-y-6 sm:p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900">{t("procurementTitle")}</h1>
                <p className="text-slate-500">{t("procurementSubtitle")}</p>
            </div>

            {/*
              One purchasing area, and one purchase order. What a business buys — raw materials
              that feed recipes, finished products that go on the shelf — is a property of the
              item on the line, not a separate application, so both live in one list with one
              create flow. Suppliers are a single shared master serving both.
            */}
            <Tabs value={tab} onValueChange={setTab} className="space-y-6">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border bg-white sm:w-fit">
                    <TabsTrigger value="orders" className="gap-2">
                        <ShoppingCart className="w-4 h-4" /> {locale === "ar" ? "أوامر الشراء" : "Purchase Orders"}
                    </TabsTrigger>
                    <TabsTrigger value="suppliers" className="gap-2">
                        <Truck className="w-4 h-4" /> {t("suppliersTab")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-6">
                    {/* keyed so a supplier hand-off remounts the panel with the seeded search */}
                    <PurchaseOrdersPanel key={supplierFilter} initialSearch={supplierFilter} />
                    <ImportedPurchaseHistory />
                </TabsContent>

                <TabsContent value="suppliers">
                    <SupplierList onShowSupplierOrders={showSupplierOrders} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// --- Sub-Component: Smart Suggestions ---
function SmartSuggestionsSection() {
    const { t, locale } = useLocale()
    const [suggestions, setSuggestions] = useState<SuggestedOrderDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedOrderDto | null>(null);
    const branchVersion = useActiveBranchVersion();

    // Suggestions derive from the active branch's stock — refresh on branch switch.
    useEffect(() => {
        loadSuggestions();
        loadSuppliers();
    }, [branchVersion]);

    const loadSuggestions = async () => {
        try {
            const data = await ProcurementApi.getSuggestions();
            setSuggestions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadSuppliers = async () => {
        try {
            const data = await ProcurementApi.getSuppliers();
            setSuppliers(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateSuggestedOrder = (item: SuggestedOrderDto) => {
        if (suppliers.length === 0) {
            toast.error(t("noSuppliersAvailable"));
            return;
        }
        setSelectedSuggestion(item);
        setShowDialog(true);
    };

    const handleDialogClose = () => {
        setShowDialog(false);
        setSelectedSuggestion(null);
        loadSuggestions(); // Refresh suggestions
    };

    if (loading) return <div className="h-32 bg-slate-100 animate-pulse rounded-xl" />;
    if (suggestions.length === 0) return null;

    return (
        <>
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-primary" />
                        <CardTitle className="text-primary text-lg">{t("systemSuggestions")}</CardTitle>
                    </div>
                    <CardDescription className="text-primary/80">
                        {suggestions.length} raw materials detected below critical stock level.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestions.map((item) => (
                            <div key={item.rawMaterialId} className="bg-white p-4 rounded-lg border border-primary/10 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{item.rawMaterialName}</h4>
                                        <p className="text-xs text-destructive font-medium">Stock: {item.currentStock} {getUnitName(item.unit)} (Min: {item.minimumStockLevel})</p>
                                    </div>
                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                        {t("urgentBadge")}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                                    <span className="text-sm font-bold text-slate-700">
                                        Suggestion: {item.suggestedQuantity} {getUnitName(item.unit)}
                                    </span>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-xs gap-1 hover:bg-primary/5 hover:text-primary"
                                        onClick={() => handleCreateSuggestedOrder(item)}
                                    >
                                        {locale === "ar" ? "إنشاء أمر شراء متقدم" : "Create Advanced PO"} <ArrowRight className="rtl:-scale-x-100 w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Create Order Dialog */}
            {selectedSuggestion && (
                <CreateOrderDialogFromSuggestion 
                    open={showDialog}
                    onOpenChange={setShowDialog}
                    suppliers={suppliers}
                    suggestion={selectedSuggestion}
                    onSuccess={handleDialogClose}
                />
            )}
        </>
    );
}

// --- Sub-Component: Purchase Order List ---
function PurchaseOrderList() {
    const { t, locale } = useLocale()
    const currency = usePosStore((state) => state.currency);
    const [orderData, setOrderData] = useState<any>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 });
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [isLoading, setIsLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [receivingOrder, setReceivingOrder] = useState<any | null>(null);
    const [receivingRows, setReceivingRows] = useState<Array<{
        rawMaterialId: string;
        rawMaterialName: string;
        quantity: number;
        unitPrice: number;
        batchNumber: string;
        expiryDate: string;
    }>>([]);
    const [isReceiving, setIsReceiving] = useState(false);
    const [batchesDialogOpen, setBatchesDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [batches, setBatches] = useState<any[]>([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    const branchVersion = useActiveBranchVersion();

    useEffect(() => {
        loadSuppliers();
    }, []);

    // Purchase orders are branch-owned — refetch when the active branch changes.
    useEffect(() => {
        loadOrders();
    }, [pageNumber, pageSize, searchTerm, statusFilter, sortBy, sortOrder, branchVersion]);

    const loadSuppliers = async () => {
        try {
            const data = await ProcurementApi.getSuppliers();
            setSuppliers(data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const data = await ProcurementApi.getOrdersPaginated(pageNumber, pageSize, searchTerm, statusFilter, sortBy, sortOrder);
            setOrderData(data);
        } catch (error) {
            console.error("Failed to load orders:", error);
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: number) => {
        try {
            await ProcurementApi.updateStatus(id, status);
            toast.success(t("orderStatusUpdated"));
            loadOrders();
        } catch (error) {
            toast.error(t("anErrorOccurred"));
        }
    };

    const handleEditOrder = (orderId: string) => {
        setEditingOrderId(orderId);
        setEditDialogOpen(true);
    };

    const handleEditDialogClose = () => {
        setEditDialogOpen(false);
        setEditingOrderId(null);
        loadOrders();
    };

    const openReceiveDialog = (order: any) => {
        const rows = (order.items || []).map((item: any, index: number) => ({
            rawMaterialId: item.rawMaterialId,
            rawMaterialName: item.rawMaterialName || t("materialLabel"),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchNumber: `${order.orderNumber}-${index + 1}`,
            expiryDate: "",
        }));
        setReceivingOrder(order);
        setReceivingRows(rows);
        setReceiveDialogOpen(true);
    };

    const openBatchesDialog = async (order: any) => {
        setSelectedOrder(order);
        setBatchesDialogOpen(true);
        setIsLoadingBatches(true);
        try {
            const data = await ProcurementApi.getStockBatches(order.id);
            setBatches(data || []);
        } catch (error) {
            console.error("Failed to load batches:", error);
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsLoadingBatches(false);
        }
    };

    const handleReceiveSubmit = async () => {
        if (!receivingOrder) return;
        if (receivingRows.some(row => row.quantity <= 0 || !row.batchNumber.trim() || !row.expiryDate)) {
            toast.error(t("pleaseFillReceiveFields"));
            return;
        }

        setIsReceiving(true);
        try {
            const receivedItems = receivingRows.map(row => ({
                rawMaterialId: row.rawMaterialId,
                quantity: row.quantity,
                unitPrice: row.unitPrice,
            }));
            const receivedTotal = receivedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            await ProcurementApi.updateOrder(receivingOrder.id, {
                ...receivingOrder,
                totalAmount: receivedTotal,
                items: receivedItems,
            });

            await ProcurementApi.updateStatus(receivingOrder.id, 1);

            const createdBatches = await ProcurementApi.getStockBatches(receivingOrder.id);
            for (const batch of createdBatches) {
                const matchingRow = receivingRows.find(r => r.rawMaterialId === batch.materialId);
                if (matchingRow) {
                    await api.put(`/stock-batches/${batch.id}`, {
                        quantity: matchingRow.quantity,
                        expiryDate: matchingRow.expiryDate,
                        batchNumber: matchingRow.batchNumber.trim(),
                    });
                }
            }

            toast.success(t("stockReceivedAndBatchesCreated"));
            setReceiveDialogOpen(false);
            setReceivingOrder(null);
            setReceivingRows([]);
            loadOrders();
        } catch (error) {
            console.error(error);
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsReceiving(false);
        }
    };

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <Badge variant="secondary">{t("statusDraft")}</Badge>;
            case 1: return <Badge className="bg-warning hover:bg-warning/90">{t("statusReceived")}</Badge>;
            case 2: return <Badge className="bg-success hover:bg-success/90">{t("statusApproved")}</Badge>;
            case 3: return <Badge variant="destructive">{t("statusCancelled")}</Badge>;
            default: return <Badge>{t("unknownLabel")}</Badge>;
        }
    };

    const totalPages = Math.ceil(orderData.totalCount / pageSize);

    return (
        <div className={`card-wrapper ${locale === "ar" ? "rtl" : "ltr"}`}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>{t("purchaseOrdersTab")}</CardTitle>
                    <CardDescription>{orderData.totalCount} orders total</CardDescription>
                </div>
                <CreateOrderDialog suppliers={suppliers} onSuccess={loadOrders} />
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search and Filter Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                    <Input
                        placeholder={t("searchOrderSupplier")}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPageNumber(1);
                        }}
                        className="max-w-sm"
                    />
                    <div className="flex gap-2 flex-wrap">
                        <StandardFilter
                            value={statusFilter?.toString() ?? "all"}
                            onValueChange={(val) => {
                                setStatusFilter(!val || val === "all" ? undefined : parseInt(val));
                                setPageNumber(1);
                            }}
                            options={[
                                { value: "all", label: t("allStatus") },
                                { value: "0", label: t("statusDraft") },
                                { value: "1", label: t("statusReceived") },
                                { value: "2", label: t("statusApproved") },
                                { value: "3", label: t("statusCancelled") },
                            ]}
                            placeholder={t("filterStatus")}
                            searchPlaceholder={t("filterSearchPlaceholder")}
                            emptyText={t("filterNoOptions")}
                            loadingText={t("loadingText")}
                            clearLabel={t("filterClear")}
                            clearable={false}
                            triggerClassName="w-40"
                        />

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t("sortBy")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="createdAt">{t("createdDate")}</SelectItem>
                                <SelectItem value="supplier">{t("supplierCol")}</SelectItem>
                                <SelectItem value="amount">{t("amountCol")}</SelectItem>
                                <SelectItem value="date">{t("expectedDate")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="w-20"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("orderNoCol")}</TableHead>
                                <TableHead>{t("supplierCol")}</TableHead>
                                <TableHead>{t("itemCol")}</TableHead>
                                <TableHead>{t("dateCol")}</TableHead>
                                <TableHead>{t("unitCostCol")}</TableHead>
                                <TableHead>{t("amountCol")}</TableHead>
                                <TableHead>{t("itemsCountCol")}</TableHead>
                                <TableHead>{t("statusCol")}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <div className="flex justify-center"><div className="animate-spin">⌛</div></div>
                                    </TableCell>
                                </TableRow>
                            ) : orderData.items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">{t("noRecordsFound")}</TableCell>
                                </TableRow>
                            ) : (
                                orderData.items.map((po: any) => {
                                    const itemNames = po.items?.map((i: any) => i.rawMaterialName || 'N/A').join(', ') || '-';
                                    return (
                                    <TableRow key={po.id} dir={isArabic(po.orderNumber) ? "rtl" : "ltr"}>
                                        <TableCell className="font-medium">{po.orderNumber}</TableCell>
                                        <TableCell>{po.supplier?.displayName || po.supplier?.name || "-"}</TableCell>
                                        <TableCell className="text-sm text-slate-600">{itemNames}</TableCell>
                                        <TableCell>{format(new Date(po.expectedDate), 'd MMM yyyy')}</TableCell>
                                        <TableCell>{po.unitCost > 0 ? formatPurchaseCurrency(po.unitCost, currency) : "-"}</TableCell>
                                        <TableCell>{formatPurchaseCurrency(po.totalAmount, currency)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{po.itemCount}</Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                                        <TableCell className="text-end">
                                            {po.status === 2 || po.status === 3 ? null : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {po.status === 0 && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleEditOrder(po.id)} className="text-primary">
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuLabel className="text-xs">{t("changeStatus")}</DropdownMenuLabel>
                                                            </>
                                                        )}
                                                        {po.status !== 0 && <DropdownMenuLabel>{t("changeStatus")}</DropdownMenuLabel>}
                                                        {po.status === 1 ? (
                                                            <>
                                                                <DropdownMenuItem onClick={() => openBatchesDialog(po)} className="text-accent-foreground">
                                                                    <Layers className="w-4 h-4 me-2" />
                                                                    {t("stockBatchesTitle") || "View Batches"}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(po.id, 2)} className="font-medium text-primary">
                                                                    {t("approve")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(po.id, 3)} className="text-destructive">
                                                                    {t("cancelOrder")}
                                                                </DropdownMenuItem>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <DropdownMenuItem onClick={() => openReceiveDialog(po)} className="font-medium text-primary">
                                                                    <PackageCheck className="w-4 h-4 me-2" />
                                                                    {t("receiveStockEntry")}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(po.id, 3)} className="text-destructive">
                                                                    {t("cancelOrder")}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                            {t("pageOf")} {pageNumber} {t("of")} {totalPages}
                        </span>
                        <Select value={pageSize.toString()} onValueChange={(val) => {
                            setPageSize(parseInt(val));
                            setPageNumber(1);
                        }}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-slate-600">{t("perPage")}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            disabled={pageNumber === 1 || isLoading}
                        >
                            <ChevronLeft className="rtl:-scale-x-100 h-4 w-4 me-1" />
                            {t("previous")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                            disabled={pageNumber >= totalPages || isLoading}
                        >
                            {t("next")}
                            <ChevronRight className="rtl:-scale-x-100 h-4 w-4 ms-1" />
                        </Button>
                    </div>
                </div>
            </CardContent>

            <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t("receiveStockTitle")} - {receivingOrder?.orderNumber}</DialogTitle>
                        <DialogDescription>
                            {t("receiveStockDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-1">
                        {receivingRows.map((row, idx) => (
                            <div key={`${row.rawMaterialId}-${idx}`} className="grid grid-cols-12 gap-3 items-end rounded-lg border p-3">
                                <div className="col-span-3">
                                    <Label>{t("materialLabel")}</Label>
                                    <Input value={row.rawMaterialName} disabled />
                                </div>
                                <div className="col-span-2">
                                    <Label>{t("quantityLabel")}</Label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={row.quantity}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value || "0");
                                            setReceivingRows(prev => prev.map((r, i) => i === idx ? { ...r, quantity: val } : r));
                                        }}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Label>{t("batchNumberLabel")}</Label>
                                    <Input
                                        value={row.batchNumber}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setReceivingRows(prev => prev.map((r, i) => i === idx ? { ...r, batchNumber: val } : r));
                                        }}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label>{t("expiryDateCol")}</Label>
                                    <Input
                                        type="date"
                                        value={row.expiryDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setReceivingRows(prev => prev.map((r, i) => i === idx ? { ...r, expiryDate: val } : r));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={isReceiving}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleReceiveSubmit} disabled={isReceiving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isReceiving ? t("receiving") : t("confirmReceive")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Draft Order Dialog */}
            {editingOrderId && (
                <EditOrderDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    orderId={editingOrderId}
                    orders={orderData.items}
                    suppliers={suppliers}
                    onSuccess={handleEditDialogClose}
                />
            )}

            {/* Batches Dialog */}
            <Dialog open={batchesDialogOpen} onOpenChange={setBatchesDialogOpen}>
                <DialogContent className="w-[92vw] max-w-6xl max-h-[80vh] overflow-hidden p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>
                            {t("stockBatchesTitle") || "Stock Batches"} - {selectedOrder?.orderNumber || ""}
                        </DialogTitle>
                        <DialogDescription>
                            {t("stockBatchesDesc") || "Material details and batch tracking"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-lg max-h-[74vh] overflow-y-auto overflow-x-hidden">
                        <Table className="w-full">
                            <TableHeader className="bg-slate-100">
                                <TableRow>
                                    <TableHead className="text-end">{t("batchNumberCol") || "رقم الدٝعة"}</TableHead>
                                    <TableHead className="text-end">{t("materialNameCol") || "اسم المادة"}</TableHead>
                                    <TableHead className="text-center">{t("quantityLabel") || "الكمية"}</TableHead>
                                    <TableHead className="text-center">{t("unitCostCol") || "سعر الوحدة"}</TableHead>
                                    <TableHead className="text-center">المبلغ الكلي</TableHead>
                                    <TableHead className="text-center">{t("createdDate") || "تاريخ الإنشاء"}</TableHead>
                                    <TableHead className="text-center">{t("expiryDateCol") || "تاريخ الصلاحية"}</TableHead>
                                    <TableHead className="text-center">{t("statusCol") || "الحالة"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingBatches ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-slate-600">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="animate-spin">⌛</div>
                                                <span>{t("loadingText") || "جاري التحميل..."}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : batches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                            {t("noBatchesFound") || "لم يتم العثور على دٝعات"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    batches.map((batch: any) => {
                                        const displayName = locale === 'ar' && batch.materialNameAr ? batch.materialNameAr : batch.materialName;
                                        const expiryDate = new Date(batch.expiryDate);
                                        const createdDate = batch.createdAt ? new Date(batch.createdAt) : null;
                                        const createdDateLabel = createdDate && !Number.isNaN(createdDate.getTime())
                                            ? createdDate.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')
                                            : '-';
                                        const today = new Date();
                                        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        let status = "جديد";
                                        let statusClass = "bg-success/10 text-success";

                                        if (expiryDate < today) {
                                            status = "منتهي الصلاحية";
                                            statusClass = "bg-destructive/10 text-destructive";
                                        } else if (daysUntilExpiry < 7) {
                                            status = "قريب الانتهاء";
                                            statusClass = "bg-warning/10 text-warning";
                                        }
                                        
                                        return (
                                            <TableRow key={batch.id} className="border-b hover:bg-slate-50">
                                                <TableCell className="font-medium text-sm">{batch.batchNumber}</TableCell>
                                                <TableCell className="text-sm">{displayName}</TableCell>
                                                <TableCell className="text-center text-sm font-medium">{batch.quantity}</TableCell>
                                                <TableCell className="text-center text-sm">{formatPurchaseCurrency(batch.unitCost, currency)}</TableCell>
                                                <TableCell className="text-center text-sm font-semibold text-slate-700">{formatPurchaseCurrency(batch.totalCost, currency)}</TableCell>
                                                <TableCell className="text-center text-sm">{createdDateLabel}</TableCell>
                                                <TableCell className="text-center text-sm">{expiryDate.toLocaleDateString('ar-SA')}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={`${statusClass} border-0 text-xs`}>{status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                        <div className="text-slate-600">
                            {batches.length} دٝعة
                        </div>
                        <div className="font-semibold text-slate-900">
                            المبلغ الكلي: <span className="text-lg text-info">
                                {formatPurchaseCurrency(batches.reduce((sum: number, b: any) => sum + (b.totalCost || 0), 0), currency)}
                            </span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
        </div>
    );
}

/** What the supplier is actually used by, so one list replaces two screens. The
 *  purchase-order badges are clickable: the relationship was always in the data, this makes
 *  it reachable without typing the supplier name into the orders filter by hand. */
function SupplierUsage({
    supplier,
    ar,
    onShowOrders,
}: {
    supplier: Supplier;
    ar: boolean;
    onShowOrders?: (supplierName: string) => void;
}) {
    const badges: { text: string; ordersLink: boolean }[] = [];
    const retailProducts = supplier.retailProductCount ?? 0;
    // Kept apart on purpose: retail and material POs are rows in the purchase-order list, so
    // their badges can open it. Imported workbook headers are NOT in that list — they live in
    // the read-only history panel — so linking them would open an empty result.
    const retailOrders = supplier.retailPurchaseOrderCount ?? 0;
    const importedPurchases = supplier.legacyPurchaseCount ?? 0;
    const restaurantOrders = supplier.purchaseOrderCount ?? 0;

    if (retailProducts > 0) badges.push({ text: ar ? `${retailProducts} منتج تجزئة` : `${retailProducts} retail SKU`, ordersLink: false });
    if (retailOrders > 0) badges.push({ text: ar ? `${retailOrders} أمر تجزئة` : `${retailOrders} retail PO`, ordersLink: true });
    if (restaurantOrders > 0) badges.push({ text: ar ? `${restaurantOrders} أمر مواد` : `${restaurantOrders} material PO`, ordersLink: true });
    if (importedPurchases > 0) badges.push({ text: ar ? `${importedPurchases} شراء مستورد` : `${importedPurchases} imported purchase`, ordersLink: false });

    if (badges.length === 0) {
        return <span className="text-xs text-muted-foreground">{ar ? "غير مستخدم" : "Unused"}</span>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {badges.map((badge) =>
                badge.ordersLink && onShowOrders ? (
                    <button
                        key={badge.text}
                        type="button"
                        onClick={() => onShowOrders(supplier.name)}
                        title={ar ? "عرض أوامر الشراء لهذا المورد" : "Show this supplier's purchase orders"}
                    >
                        <Badge variant="outline" className="cursor-pointer text-xs font-normal hover:border-primary hover:text-primary">
                            {badge.text}
                        </Badge>
                    </button>
                ) : (
                    <Badge key={badge.text} variant="outline" className="text-xs font-normal">
                        {badge.text}
                    </Badge>
                ),
            )}
        </div>
    );
}

/**
 * Sourcing attributes on the shared supplier master. They matter for imported/retail brands
 * (country of origin, the brands carried, best sellers) and stay empty for a local food
 * supplier — which is why there is no second "retail supplier" screen.
 */
function SupplierSourcingFields({ ar, supplier }: { ar: boolean; supplier?: Supplier | null }) {
    return (
        <div className="space-y-4 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">
                {ar ? "بيانات التوريد (اختيارية)" : "Sourcing details (optional)"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label>{ar ? "الدولة" : "Country"}</Label>
                    <Input name="country" defaultValue={supplier?.country ?? ""} placeholder={ar ? "مثال: تركيا" : "e.g. Turkey"} />
                </div>
                <div className="space-y-2">
                    <Label>{ar ? "الموقع الإلكتروني" : "Website"}</Label>
                    <Input name="website" defaultValue={supplier?.website ?? ""} placeholder="e.g. supplier.com" />
                </div>
            </div>
            <div className="space-y-2">
                <Label>{ar ? "العلامات التجارية" : "Brands"}</Label>
                <Input name="brands" defaultValue={supplier?.brands ?? ""} placeholder={ar ? "مفصولة بفواصل" : "Comma separated"} />
            </div>
            <div className="space-y-2">
                <Label>{ar ? "الأكثر مبيعًا" : "Best sellers"}</Label>
                <Input name="bestSellers" defaultValue={supplier?.bestSellers ?? ""} />
            </div>
        </div>
    );
}

function SupplierList({ onShowSupplierOrders }: { onShowSupplierOrders?: (supplierName: string) => void }) {
    const { t, locale } = useLocale()
    const [supplierData, setSupplierData] = useState<any>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 });
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [isLoading, setIsLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Validation helpers
    const isEnglishOnly = (text: string) => /^[a-zA-Z0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);
    const isArabicOnly = (text: string) => /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\s\-_.,!?&()'"/+%#@]*$/.test(text);

    useEffect(() => {
        loadSuppliers();
    }, [pageNumber, pageSize, searchTerm, sortBy, sortOrder]);

    const loadSuppliers = async () => {
        setIsLoading(true);
        try {
            const data = await ProcurementApi.getSuppliersPaginated(pageNumber, pageSize, searchTerm, sortBy, sortOrder);
            setSupplierData(data);
        } catch (error) {
            console.error("Failed to load suppliers:", error);
            toast.error(t("anErrorOccurred"));
        } finally {
            setIsLoading(false);
        }
    };

    // Mirrors the backend rule: one supplier master serves food suppliers (mobile) and
    // overseas brand distributors (email / website), so any one contact is enough.
    const validateSupplierForm = (
        name: string,
        nameAr: string,
        mobileNumber: string,
        email: string,
        website: string,
    ): boolean => {
        const errors: Record<string, string> = {};

        if (!name.trim()) {
            errors.name = t("validationRequired");
        } else if (!isEnglishOnly(name.trim())) {
            errors.name = t("validationEnglishOnly");
        }

        if (nameAr.trim() && !isArabicOnly(nameAr.trim())) {
            errors.nameAr = t("validationArabicOnly");
        }

        if (!mobileNumber.trim() && !email.trim() && !website.trim()) {
            errors.mobile = locale === "ar"
                ? "أدخل وسيلة تواصل واحدة على الأقل: جوال أو بريد أو موقع"
                : "Enter at least one contact: mobile, email or website";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const readRetailFields = (form: HTMLFormElement) => ({
        country: (form.elements.namedItem("country") as HTMLInputElement)?.value.trim() || undefined,
        website: (form.elements.namedItem("website") as HTMLInputElement)?.value.trim() || undefined,
        brands: (form.elements.namedItem("brands") as HTMLInputElement)?.value.trim() || undefined,
        bestSellers: (form.elements.namedItem("bestSellers") as HTMLInputElement)?.value.trim() || undefined,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const nameAr = (form.elements.namedItem('nameAr') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const mobileNumber = (form.elements.namedItem('mobileNumber') as HTMLInputElement).value;
        const leadTimeDays = parseInt((form.elements.namedItem('leadTimeDays') as HTMLInputElement).value) || 3;
        const retail = readRetailFields(form);

        if (!validateSupplierForm(name, nameAr, mobileNumber, email, retail.website ?? "")) return;

        try {
            await ProcurementApi.createSupplier({
                name: name.trim(),
                nameAr: nameAr.trim() || undefined,
                email,
                mobileNumber,
                leadTimeDays,
                ...retail,
            });
            toast.success(t("supplierAdded"));
            setCreateDialogOpen(false);
            setFormErrors({});
            setPageNumber(1);
            loadSuppliers();
            (e.target as HTMLFormElement).reset();
        } catch (error: any) {
            if (error?.response?.status === 409) {
                const msg = error?.response?.data?.message || t("validationDuplicateName");
                setFormErrors({ name: msg });
            } else {
                toast.error(t("anErrorOccurred"));
            }
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSupplier || !editingSupplier.id) return;

        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const nameAr = (form.elements.namedItem('nameAr') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const mobileNumber = (form.elements.namedItem('mobileNumber') as HTMLInputElement).value;
        const leadTimeDays = parseInt((form.elements.namedItem('leadTimeDays') as HTMLInputElement).value) || 3;
        const retail = readRetailFields(form);

        if (!validateSupplierForm(name, nameAr, mobileNumber, email, retail.website ?? "")) return;

        try {
            await ProcurementApi.updateSupplier(editingSupplier.id, {
                name: name.trim(),
                nameAr: nameAr.trim() || undefined,
                email,
                mobileNumber,
                leadTimeDays,
                ...retail,
            });
            toast.success(t("supplierUpdated"));
            setEditDialogOpen(false);
            setFormErrors({});
            setEditingSupplier(null);
            loadSuppliers();
        } catch (error: any) {
            if (error?.response?.status === 409) {
                const msg = error?.response?.data?.message || t("validationDuplicateName");
                setFormErrors({ name: msg });
            } else {
                toast.error(t("anErrorOccurred"));
            }
        }
    };

    const handleDelete = async (supplierId: string, supplierName: string) => {
        if (!confirm(`${t("confirmDelete")} "${supplierName}"?`)) return;
        
        try {
            await ProcurementApi.deleteSupplier(supplierId);
            toast.success(t("supplierDeleted"));
            loadSuppliers();
        } catch (error) {
            toast.error(t("anErrorOccurred"));
        }
    };

    const totalPages = Math.ceil(supplierData.totalCount / pageSize);

    return (
        <div className={`card-wrapper ${locale === "ar" ? "rtl" : "ltr"}`}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle>{t("registeredSuppliers")}</CardTitle>
                    <CardDescription>{supplierData.totalCount} {t("suppliersTotal")}</CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> {t("newSupplierBtn")}</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{t("addNewSupplier")}</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>{t("companyNameLabel")} <span className="text-destructive">*</span></Label>
                                <Input name="name" placeholder="e.g. Metro Grossmarket" className={formErrors.name ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, name: "" }))} />
                                {formErrors.name && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.name}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{t("validationEnglishOnly")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("companyNameArLabel")}</Label>
                                <Input name="nameAr" placeholder="e.g. المورد" dir="rtl" className={formErrors.nameAr ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, nameAr: "" }))} />
                                {formErrors.nameAr && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.nameAr}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{t("validationArabicOnly")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("emailLabel")}</Label>
                                <Input name="email" type="email" placeholder="e.g. contact@supplier.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("mobileNumberLabel")}</Label>
                                <Input name="mobileNumber" placeholder="e.g. +1234567890" className={formErrors.mobile ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, mobile: "" }))} />
                                {formErrors.mobile && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.mobile}</p>
                                )}
                                <p className="text-xs text-muted-foreground">7-15 digits with optional + prefix</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("leadTimeDaysCol")}</Label>
                                <Input name="leadTimeDays" type="number" min="1" defaultValue="3" placeholder="أيام" />
                            </div>
                            <SupplierSourcingFields ar={locale === "ar"} />
                            <Button type="submit" className="w-full">{t("saveBtn")}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search and Filter Toolbar */}
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                    <Input
                        placeholder={t("searchSuppliers")}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPageNumber(1);
                        }}
                        className="max-w-sm"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full sm:w-40">
                                <SelectValue placeholder={t("sortBy")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">{t("sortByName")}</SelectItem>
                                <SelectItem value="leadtime">{t("sortByLeadTime")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="w-full sm:w-20"
                        >
                            {sortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t(locale === "ar" ? "companyNameArLabel" : "companyNameLabel")}</TableHead>
                                <TableHead>{locale === "ar" ? "الدولة" : "Country"}</TableHead>
                                <TableHead>{locale === "ar" ? "العلامات" : "Brands"}</TableHead>
                                <TableHead>{t("emailLabel")}</TableHead>
                                <TableHead>{t("mobileNumberLabel")}</TableHead>
                                <TableHead>{t("leadTimeDaysCol")}</TableHead>
                                <TableHead>{locale === "ar" ? "الاستخدام" : "Used by"}</TableHead>
                                <TableHead className="text-end">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex justify-center"><div className="animate-spin">⌛</div></div>
                                    </TableCell>
                                </TableRow>
                            ) : supplierData.items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">{t("noRecordsFound")}</TableCell>
                                </TableRow>
                            ) : (
                                supplierData.items.map((s: Supplier) => (
                                <TableRow key={s.id} dir={isArabic(s.nameAr || s.name) ? "rtl" : "ltr"}>
                                    <TableCell className="font-medium">{locale === "ar" ? (s.nameAr || s.displayName || s.name) : (s.displayName || s.name)}</TableCell>
                                    <TableCell>{s.country || "—"}</TableCell>
                                    <TableCell className="max-w-48 truncate" title={s.brands ?? undefined}>{s.brands || "—"}</TableCell>
                                    <TableCell>{s.email || "N/A"}</TableCell>
                                    <TableCell>{s.mobileNumber || "N/A"}</TableCell>
                                    <TableCell>{s.leadTimeDays} {t("daysUnit")}</TableCell>
                                    <TableCell><SupplierUsage supplier={s} ar={locale === "ar"} onShowOrders={onShowSupplierOrders} /></TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingSupplier(s);
                                                    setEditDialogOpen(true);
                                                }}
                                            className="text-primary hover:text-primary/80 hover:bg-primary/5"
                                            >
                                                {t("edit")}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => s.id && handleDelete(s.id, s.displayName || s.name)}
                                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                                            >
                                                {t("delete")}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                            {t("pageOf")} {pageNumber} {t("of")} {totalPages}
                        </span>
                        <Select value={pageSize.toString()} onValueChange={(val) => {
                            setPageSize(parseInt(val));
                            setPageNumber(1);
                        }}>
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-slate-600">{t("perPage")}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                            disabled={pageNumber === 1 || isLoading}
                        >
                            <ChevronLeft className="rtl:-scale-x-100 h-4 w-4 me-1" />
                            {t("previous")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                            disabled={pageNumber >= totalPages || isLoading}
                        >
                            {t("next")}
                            <ChevronRight className="rtl:-scale-x-100 h-4 w-4 ms-1" />
                        </Button>
                    </div>
                </div>
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{t("editSupplier")}</DialogTitle></DialogHeader>
                    {editingSupplier && (
                        <form onSubmit={handleEdit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>{t("companyNameLabel")} <span className="text-destructive">*</span></Label>
                                <Input name="name" defaultValue={editingSupplier.name} className={formErrors.name ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, name: "" }))} />
                                {formErrors.name && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.name}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{t("validationEnglishOnly")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("companyNameArLabel")}</Label>
                                <Input name="nameAr" defaultValue={editingSupplier.nameAr || ""} dir="rtl" className={formErrors.nameAr ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, nameAr: "" }))} />
                                {formErrors.nameAr && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.nameAr}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{t("validationArabicOnly")}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("emailLabel")}</Label>
                                <Input name="email" type="email" defaultValue={editingSupplier.email || ""} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("mobileNumberLabel")}</Label>
                                <Input name="mobileNumber" defaultValue={editingSupplier.mobileNumber || ""} className={formErrors.mobile ? "border-destructive" : ""} onChange={() => setFormErrors(prev => ({ ...prev, mobile: "" }))} />
                                {formErrors.mobile && (
                                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {formErrors.mobile}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>{t("leadTimeDaysCol")}</Label>
                                <Input name="leadTimeDays" type="number" min="1" defaultValue={editingSupplier.leadTimeDays} />
                            </div>
                            <SupplierSourcingFields ar={locale === "ar"} supplier={editingSupplier} />
                            <Button type="submit" className="w-full">{t("saveBtn")}</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
        </div>
    );
}

function CreateOrderDialog({ suppliers, onSuccess }: { suppliers: Supplier[], onSuccess: () => void }) {
    const { t, locale } = useLocale()
    const currency = usePosStore((state) => state.currency);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [supplierId, setSupplierID] = useState("");
    const [orderNumber, setOrderNumber] = useState(`PO-${Date.now()}`);
    const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");

    const selectedItem = rawMaterials.find(rm => rm.id === selectedItemId);
    const unitCost = selectedItem?.costPerUnit || 0;
    const newPrice = parseFloat(price) || 0;
    const totalAmount = (parseFloat(quantity) || 0) * (newPrice > 0 ? newPrice : unitCost);

    // Load raw materials when dialog opens
    useEffect(() => {
        if (open) {
            setOrderNumber(`PO-${Date.now()}`);
            const loadItems = async () => {
                try {
                    const items = await getRawMaterials();
                    setRawMaterials(items);
                } catch (error) {
                    console.error("Failed to load raw materials:", error);
                }
            };
            loadItems();
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!supplierId || !expectedDate || !selectedItemId || !quantity || !price) {
            toast.error(t("fillAllFields"));
            return;
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            toast.error("Unit price must be greater than 0");
            return;
        }

        if (!isValidPurchaseUnitPriceInput(price)) {
            toast.error(PURCHASE_UNIT_PRICE_PRECISION_ERROR);
            return;
        }

        setLoading(true);
        try {
            // Get the full supplier object
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) {
                toast.error(t("supplierNotFound"));
                setLoading(false);
                return;
            }

            await ProcurementApi.createOrder({
                supplierId,
                supplier,
                orderNumber,
                expectedDate: new Date(expectedDate).toISOString(),
                totalAmount: totalAmount,
                items: [
                    {
                        rawMaterialId: selectedItemId,
                        quantity: parseFloat(quantity),
                        unitPrice: priceNum
                    }
                ]
            });

            toast.success(t("orderDraftCreated"));
            
            // Reset form
            setSelectedItemId("");
            setSupplierID("");
            setExpectedDate(new Date().toISOString().split('T')[0]);
            setQuantity("");
            setPrice("");
            setOpen(false);
            onSuccess();
        } catch (error) {
            console.error("Failed to create order:", error);
            toast.error(t("failedToCreateOrder"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 me-2" /> {locale === "ar" ? "أمر شراء متقدم" : "Advanced Purchase Order"}</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{locale === "ar" ? "إنشاء أمر شراء متقدم" : "Create Advanced Purchase Order"}</DialogTitle>
                    <DialogDescription>
                        {locale === "ar"
                            ? "إنشاء مسودة أمر شراء باستخدام سير العمل المتقدم."
                            : "Create a draft purchase order using the advanced workflow."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Item Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="item" className="text-sm font-medium">Item *</Label>
                        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                            <SelectTrigger id="item" className="w-full">
                                <SelectValue placeholder="Select an item" />
                            </SelectTrigger>
                            <SelectContent>
                                {rawMaterials.length === 0 ? (
                                    <div className="p-2 text-sm text-slate-500">No items available</div>
                                ) : (
                                    rawMaterials.map(item => item.id && (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.displayName || item.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Item Details Display */}
                    {selectedItem && (
                        <div className="bg-info/10 p-3 rounded-lg border border-info/20 space-y-2">
                            <p className="text-sm text-slate-700"><strong>Item:</strong> {selectedItem.displayName || selectedItem.name}</p>
                            <p className="text-sm text-slate-700"><strong>Unit Cost:</strong> {formatPurchaseCurrency(unitCost, currency)}</p>
                            <p className="text-sm text-slate-700"><strong>Unit:</strong> {getUnitName(selectedItem.unit)}</p>
                            <p className="text-sm text-slate-700"><strong>Current Stock:</strong> {selectedItem.currentStock} {getUnitName(selectedItem.unit)}</p>
                         </div>
                    )}

                    {/* Supplier Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium">{t("selectSupplierLabel")} *</Label>
                        <Select value={supplierId} onValueChange={setSupplierID}>
                            <SelectTrigger id="supplier" className="w-full">
                                <SelectValue placeholder={t("selectSupplierPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.length === 0 ? (
                                    <div className="p-2 text-sm text-slate-500">{t("noSuppliersAvailable")}</div>
                                ) : (
                                    suppliers.map(s => s.id && (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.displayName || s.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orderNumber" className="text-sm font-medium">{t("orderNoCol")}</Label>
                            <Input
                                id="orderNumber"
                                name="orderNumber"
                                value={orderNumber}
                                disabled
                                className="bg-slate-100 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium">Quantity ({getUnitName(selectedItem?.unit)}) *</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                placeholder="0.00"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Unit Price (Optional) */}
                    <div className="space-y-2">
                        <div>
                            <Label htmlFor="price" className="text-sm font-medium">{t("unitPriceLabel")}</Label>
                            <p className="text-xs text-slate-500 mt-1">{t("unitPriceDesc")}</p>
                        </div>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            step={PURCHASE_UNIT_PRICE_STEP}
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={PURCHASE_UNIT_PRICE_PLACEHOLDER}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="expectedDate" className="text-sm font-medium">{t("dateCol")} *</Label>
                        <Input
                            id="expectedDate"
                            name="expectedDate"
                            type="date"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            required
                            disabled={loading}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Total Amount Display */}
                    {selectedItem && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-700">Total Amount:</span>
                                <span className="text-lg font-bold text-slate-900">{formatPurchaseCurrency(totalAmount, currency)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {quantity || 0} × {formatPurchaseCurrency(newPrice > 0 ? newPrice : unitCost, currency)} = {formatPurchaseCurrency(totalAmount, currency)}
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loading || !supplierId || !expectedDate || !selectedItemId || !quantity}
                    >
                        {loading ? t("loadingText") : t("createOrderBtn")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Dialog for editing draft orders
function EditOrderDialog({
    open,
    onOpenChange,
    orderId,
    orders,
    suppliers,
    onSuccess
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orders: PurchaseOrder[];
    suppliers: Supplier[];
    onSuccess: () => void;
}) {
    const { t } = useLocale()
    const currency = usePosStore((state) => state.currency);
    const [loading, setLoading] = useState(false);
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [supplierId, setSupplierID] = useState("");
    const [quantity, setQuantity] = useState("");
    const [expectedDate, setExpectedDate] = useState("");
    const [price, setPrice] = useState("");

    const order = orders.find(o => o.id === orderId);
    const selectedItem = rawMaterials.find(rm => rm.id === order?.items?.[0]?.rawMaterialId);
    const unitCost = selectedItem?.costPerUnit || order?.unitCost || 0;
    const newPrice = parseFloat(price) || 0;
    const totalAmount = (parseFloat(quantity) || 0) * (newPrice > 0 ? newPrice : unitCost);

    // Load raw materials and populate form when dialog opens
    useEffect(() => {
        if (open && order) {
            setSupplierID(order.supplierId || "");
            setQuantity((order.items?.[0]?.quantity || 0).toString());
            setExpectedDate(order.expectedDate?.split('T')[0] || "");
            setPrice("");

            const loadItems = async () => {
                try {
                    const items = await getRawMaterials();
                    setRawMaterials(items);
                } catch (error) {
                    console.error("Failed to load raw materials:", error);
                }
            };
            loadItems();
        }
    }, [open, order]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId || !expectedDate || !quantity || !price || !order) {
            toast.error(t("fillAllFields"));
            return;
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            toast.error("Unit price must be greater than 0");
            return;
        }

        if (!isValidPurchaseUnitPriceInput(price)) {
            toast.error(PURCHASE_UNIT_PRICE_PRECISION_ERROR);
            return;
        }

        setLoading(true);
        try {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) {
                toast.error(t("supplierNotFound"));
                setLoading(false);
                return;
            }

            const itemId = order.items?.[0]?.rawMaterialId;
            if (!itemId) {
                toast.error("Invalid order item");
                setLoading(false);
                return;
            }

            await ProcurementApi.updateOrder(order.id, {
                orderNumber: order.orderNumber,
                supplierId,
                supplier,
                expectedDate: new Date(expectedDate).toISOString(),
                totalAmount: totalAmount,
                items: [
                    {
                        rawMaterialId: itemId,
                        quantity: parseFloat(quantity),
                        unitPrice: priceNum
                    }
                ]
            });

            toast.success("Order updated");
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error("Failed to update order:", error);
            toast.error("Failed to update order");
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Purchase Order - {order.orderNumber}</DialogTitle>
                    <DialogDescription>
                        Update order details for draft orders
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Item Details Display */}
                    {order.items && order.items.length > 0 && (
                        <div className="bg-info/10 p-3 rounded-lg border border-info/20 space-y-2">
                            <p className="text-sm text-slate-700"><strong>Item:</strong> {order.items[0].rawMaterialName}</p>
                            <p className="text-sm text-slate-700"><strong>Unit Cost:</strong> {formatPurchaseCurrency(unitCost, currency)}</p>
                            <p className="text-sm text-slate-700"><strong>Unit:</strong> {getUnitName(selectedItem?.unit)}</p>
                            {selectedItem && (
                                <p className="text-sm text-slate-700"><strong>Current Stock:</strong> {selectedItem.currentStock} {getUnitName(selectedItem.unit)}</p>
                            )}
                        </div>
                    )}

                    {/* Supplier Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium">{t("selectSupplierLabel")} *</Label>
                        <Select value={supplierId} onValueChange={setSupplierID}>
                            <SelectTrigger id="supplier" className="w-full">
                                <SelectValue placeholder={t("selectSupplierPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.length === 0 ? (
                                    <div className="p-2 text-sm text-slate-500">{t("noSuppliersAvailable")}</div>
                                ) : (
                                    suppliers.map(s => s.id && (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.displayName || s.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Quantity and Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium">Quantity ({getUnitName(selectedItem?.unit)}) *</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                placeholder="0.00"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expectedDate" className="text-sm font-medium">{t("dateCol")} *</Label>
                            <Input
                                id="expectedDate"
                                name="expectedDate"
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                required
                                disabled={loading}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    {/* Unit Price (Optional) */}
                    <div className="space-y-2">
                        <div>
                            <Label htmlFor="price" className="text-sm font-medium">{t("unitPriceLabel")}</Label>
                            <p className="text-xs text-slate-500 mt-1">{t("unitPriceDesc")}</p>
                        </div>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            step={PURCHASE_UNIT_PRICE_STEP}
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={PURCHASE_UNIT_PRICE_PLACEHOLDER}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Total Amount Display */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">Total Amount:</span>
                            <span className="text-lg font-bold text-slate-900">{formatPurchaseCurrency(totalAmount, currency)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {quantity || 0} × {formatPurchaseCurrency(newPrice > 0 ? newPrice : unitCost, currency)} = {formatPurchaseCurrency(totalAmount, currency)}
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || !supplierId || !expectedDate || !quantity}
                    >
                        {loading ? t("loadingText") : "Update Order"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Dialog for creating order from system suggestions
function CreateOrderDialogFromSuggestion({ 
    open, 
    onOpenChange, 
    suppliers, 
    suggestion,
    onSuccess 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    suppliers: Supplier[]; 
    suggestion: SuggestedOrderDto;
    onSuccess: () => void; 
}) {
    const { t, locale } = useLocale()
    const currency = usePosStore((state) => state.currency);
    const [loading, setLoading] = useState(false);
    const [supplierId, setSupplierID] = useState(suppliers.length > 0 ? suppliers[0].id || "" : "");
    const [orderNumber, setOrderNumber] = useState(`PO-${Date.now()}`);
    const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState(suggestion.suggestedQuantity.toString());
    const [actualUnitCost, setActualUnitCost] = useState<number>(0);
    const [price, setPrice] = useState("");
    
    const priceNum = parseFloat(price) || 0;
    const totalAmount = (parseFloat(quantity) || 0) * priceNum;

    // Load actual unit cost from inventory when dialog opens
    useEffect(() => {
        if (open && suggestion?.rawMaterialId) {
            const loadActualCost = async () => {
                try {
                    // Fetch raw materials to get the current unit cost
                    const rawMaterials = await getRawMaterials();
                    const rawMaterial = rawMaterials.find((rm: any) => rm.id === suggestion.rawMaterialId);
                    const unitCost = Number(rawMaterial?.costPerUnit || 0);
                    setActualUnitCost(unitCost);
                    setPrice(unitCost > 0 ? unitCost.toString() : "");
                } catch (error) {
                    console.error("Failed to fetch raw material cost:", error);
                }
            };
            loadActualCost();
        }
    }, [open, suggestion?.rawMaterialId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!supplierId || !orderNumber || !expectedDate || !quantity || !price) {
            toast.error(t("fillAllFields"));
            return;
        }

        if (isNaN(priceNum) || priceNum <= 0) {
            toast.error("Unit price must be greater than 0");
            return;
        }

        if (!isValidPurchaseUnitPriceInput(price)) {
            toast.error(PURCHASE_UNIT_PRICE_PRECISION_ERROR);
            return;
        }

        setLoading(true);
        try {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (!supplier) {
                toast.error(t("supplierNotFound"));
                setLoading(false);
                return;
            }

            await ProcurementApi.createOrder({
                supplierId,
                supplier,
                orderNumber,
                expectedDate: new Date(expectedDate).toISOString(),
                totalAmount: totalAmount,
                items: [
                    {
                        rawMaterialId: suggestion.rawMaterialId,
                        quantity: parseFloat(quantity),
                        unitPrice: priceNum
                    }
                ]
            });

            toast.success(t("orderDraftCreated"));
            onOpenChange(false);
            onSuccess();
        } catch (error) {
            console.error("Failed to create order:", error);
            toast.error(t("failedToCreateOrder"));
        } finally {
            setLoading(false);
        }
    };

    const suggestionUnitName = getUnitName(suggestion.unit);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{locale === "ar" ? "إنشاء أمر شراء متقدم" : "Create Advanced Purchase Order"}</DialogTitle>
                    <DialogDescription>
                        {locale === "ar"
                            ? "إنشاء مسودة أمر شراء من اقتراح المخزون باستخدام سير العمل المتقدم."
                            : "Create a draft purchase order from this stock suggestion using the advanced workflow."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Suggested Item Info */}
                    <div className="bg-info/10 p-3 rounded-lg border border-info/20 space-y-2">
                        <p className="text-sm text-slate-700"><strong>Item:</strong> {suggestion.rawMaterialName}</p>
                        <p className="text-sm text-slate-700"><strong>Suggested Quantity:</strong> {suggestion.suggestedQuantity} {suggestionUnitName}</p>
                        <p className="text-sm text-slate-700"><strong>Unit Cost:</strong> {formatPurchaseCurrency(actualUnitCost, currency)}</p>
                        <p className="text-sm text-destructive"><strong>Current Stock:</strong> {suggestion.currentStock} {suggestionUnitName}</p>
                    </div>

                    {/* Supplier Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium">{t("selectSupplierLabel")} *</Label>
                        <Select value={supplierId} onValueChange={setSupplierID}>
                            <SelectTrigger id="supplier" className="w-full">
                                <SelectValue placeholder={t("selectSupplierPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.length === 0 ? (
                                    <div className="p-2 text-sm text-slate-500">{t("noSuppliersAvailable")}</div>
                                ) : (
                                    suppliers.map(s => s.id && (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.displayName || s.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orderNumber" className="text-sm font-medium">{t("orderNoCol")} *</Label>
                            <Input
                                id="orderNumber"
                                name="orderNumber"
                                value={orderNumber}
                                disabled
                                className="bg-slate-100 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-medium">Quantity ({suggestionUnitName}) *</Label>
                            <Input
                                id="quantity"
                                name="quantity"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                                placeholder="0.00"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="expectedDate" className="text-sm font-medium">{t("dateCol")} *</Label>
                        <Input
                            id="expectedDate"
                            name="expectedDate"
                            type="date"
                            value={expectedDate}
                            onChange={(e) => setExpectedDate(e.target.value)}
                            required
                            disabled={loading}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-2">
                        <div>
                            <Label htmlFor="price" className="text-sm font-medium">{t("unitPriceLabel")}</Label>
                            <p className="text-xs text-slate-500 mt-1">{t("unitPriceDesc")}</p>
                        </div>
                        <Input
                            id="price"
                            name="price"
                            type="number"
                            step={PURCHASE_UNIT_PRICE_STEP}
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder={PURCHASE_UNIT_PRICE_PLACEHOLDER}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Total Amount Display */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">Total Amount:</span>
                            <span className="text-lg font-bold text-slate-900">{formatPurchaseCurrency(totalAmount, currency)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {quantity || 0} × {formatPurchaseCurrency(priceNum, currency)} = {formatPurchaseCurrency(totalAmount, currency)}
                        </p>
                    </div>

                    {/* Submit Button */}
                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loading || !supplierId || !orderNumber || !expectedDate || !quantity || !price}
                    >
                        {loading ? t("loadingText") : t("createOrderBtn")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
