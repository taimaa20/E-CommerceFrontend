import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ModifierDto, ProductDto, ProductOptionDto, Table } from '@/types/pos';
import { getCashierProducts, createOrderAndReturn, addItemsToOrder, setOrderOffer, getTableAllOrders } from '@/lib/api';
import { getConnectivityState } from '@/lib/offline/connectivity';
import { addOrderItemsOffline, createOrderSmart, isOfflineOrderId, OfflineOrderValidationError, OrderCreateClientError, type OrderItemDisplayHint } from '@/lib/offline/orders';
import { toast } from 'sonner';
import { getOrderSnapshot } from '@/lib/offline/db';
import { syncTableOrderSnapshots } from '@/lib/offline/table-order-cache';
import type { OrderDto, OrderCreateDto, OrderItemCreateDto, SelectedRecipeAlternativeDto } from '@/types/order';
import type { CustomerInsightsDto } from '@/lib/api-customer';
import type { DiscountGroupOption } from '@/lib/api-discount-groups';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import { resolveRecipeAlternativePriceImpact } from '@/lib/recipe-alternative-pricing';
import { getSelectedBranchCacheKey } from '@/lib/branch-selection';
import { generateUUID } from '@/lib/uuid';

// Helper to get initial currency from localStorage
const getInitialCurrency = () => {
    if (typeof window === 'undefined') return DEFAULT_CURRENCY;
    try {
        const saved = localStorage.getItem('pos_currency');
        return saved || DEFAULT_CURRENCY;
    } catch {
        return DEFAULT_CURRENCY;
    }
};

const hasRecipeOverride = (modifier: CartItemModifier) => (modifier.recipeItems?.length ?? 0) > 0;

const resolveCartModifierUnitPrice = (product: ProductDto, modifier: CartItemModifier) => {
    const quantity = modifier.quantity || 1;
    if (modifier.isFree && (modifier.freeQuantityLimit ?? 0) === 0) return 0;
    if (modifier.isFree && (modifier.freeQuantityLimit ?? 0) > 0 && quantity <= (modifier.freeQuantityLimit ?? 0)) return 0;

    const baseUnitPrice = product.displayPrice ?? product.discountedPrice ?? product.basePrice;
    if ((modifier.pricingType ?? 0) === 2) return 0;
    if ((modifier.pricingType ?? 0) === 1) return (baseUnitPrice * modifier.priceAdjustment) / 100;
    return modifier.priceAdjustment;
};

const resolveCartUnitPrice = (
    product: ProductDto,
    selectedModifiers: CartItemModifier[],
    selectedOption?: ProductOptionDto | null,
    selectedAlternatives?: SelectedRecipeAlternativeDto[],
) => {
    // Option price fully replaces base price (alternatives ignored — option wins).
    if (selectedOption)
        return selectedOption.price;

    const baseUnitPrice = product.displayPrice ?? product.discountedPrice ?? product.basePrice;
    const overrideTotal = selectedModifiers
        .filter(hasRecipeOverride)
        .reduce((sum, modifier) => sum + resolveCartModifierUnitPrice(product, modifier), 0);
    const additiveTotal = selectedModifiers
        .filter((modifier) => !hasRecipeOverride(modifier))
        .reduce((sum, modifier) => sum + resolveCartModifierUnitPrice(product, modifier) * (modifier.quantity || 1), 0);
    const altImpact = resolveRecipeAlternativePriceImpact(product, selectedAlternatives);

    return (overrideTotal > 0 ? overrideTotal : baseUnitPrice) + additiveTotal + altImpact;
};

export interface CartItemModifier {
    id: string;
    name: string;
    nameAr?: string;
    displayName?: string;
    priceAdjustment: number;
    pricingType?: number;
    isFree?: boolean;
    freeQuantityLimit?: number;
    maxQuantity?: number;
    isDefault?: boolean;
    isActive?: boolean;
    quantity: number; // defaults to 1
    recipeItems?: ModifierDto["recipeItems"];
}

export interface CartItem {
    cartId: string;
    product: ProductDto;
    selectedModifiers: CartItemModifier[];
    selectedOption?: ProductOptionDto | null;
    // Per-ingredient swaps chosen at order time. Ignored when selectedOption is set.
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[];
    quantity: number;
    totalPrice: number;
    notes?: string;
    isComplimentary: boolean;
    offerLineOfferId?: number | null;
    offerLineName?: string | null;
    offerLineNameAr?: string | null;
}

interface PosState {
    products: ProductDto[];
    // Epoch ms of the last successful fetchProducts that populated `products`.
    // 0 means never loaded. Used as a freshness gate so that navigating between
    // cashier ↔ takeaway ↔ kitchen ↔ mobile reuses the in-memory list instead
    // of refiring the cashier product feed on every mount.
    productsLastLoaded: number;
    productsBranchKey: string | null;
    cart: CartItem[];
    selectedTable: Table | null;
    offerId: number | null;
    offerName: string | null;
    offerNote: string | null;
    offerQty: number;
    discountPercentage: number;
    serviceChargeRate: number;
    taxRate: number;
    currency: string;

    // Active order (when table is occupied)
    // All active orders for the current table
    activeOrders: any[];
    // The specific order selected to append new items to (null = create fresh)
    activeOrder: any | null;

    // CRM
    selectedCustomer: CustomerInsightsDto | null;
    customerPhone: string;
    redeemPoints: boolean;

    // Affiliation discount group applied to the (new) order. Independent of the customer —
    // a group can be applied with no customer attached. Backend re-resolves the % at creation.
    selectedDiscountGroup: DiscountGroupOption | null;

    // `force: true` bypasses the freshness gate — use after an admin mutation
    // when the caller knows the cached list is stale.
    fetchProducts: (opts?: { force?: boolean }) => Promise<void>;
    resetForBranchSwitch: () => void;
    addToCart: (product: ProductDto, selectedModifiers: CartItemModifier[], quantity?: number, notes?: string, preserveOfferContext?: boolean, offerLineOfferId?: number | null, offerLineOfferName?: string | null, offerLineOfferNameAr?: string | null, selectedOption?: ProductOptionDto | null, selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[]) => void;
    removeFromCart: (cartId: string) => void;
    removeOfferFromCart: (offerId: number) => void;
    clearCart: () => void;

    setDiscountPercentage: (val: number) => void;
    setServiceChargeRate: (val: number) => void;
    setTaxRate: (val: number) => void;
    toggleComplimentary: (cartId: string) => void;
    toggleOfferComplimentary: (offerId: number) => void;

    checkoutOrder: () => Promise<void>;
    setSelectedTable: (table: Table | null) => void;
    setActiveOrder: (order: any | null) => void;
    setActiveOrders: (orders: any[]) => void;
    setCurrency: (currency: string) => void;
    setOfferContext: (offerId: number | null, offerName?: string | null, offerNote?: string | null, offerQty?: number) => void;

    // CRM Actions
    setCustomer: (customer: CustomerInsightsDto | null) => void;
    setCustomerPhone: (phone: string) => void;
    clearCustomer: () => void;
    toggleRedeemPoints: () => void;
    setDiscountGroup: (group: DiscountGroupOption | null) => void;
}

// How long a fetched product list is considered fresh enough to skip the
// network entirely. Products rarely change minute-to-minute, and a caller
// that knows it just mutated can pass { force: true } to bypass the gate.
// 60s is conservative for cashier/kitchen/takeaway/mobile navigation.
const PRODUCTS_FRESH_MS = 60_000;

export const usePosStore = create<PosState>()(persist(
(set, get) => ({
    products: [],
    productsLastLoaded: 0,
    productsBranchKey: null,
    cart: [],
    selectedTable: null,
    offerId: null,
    offerName: null,
    offerNote: null,
    offerQty: 1,
    discountPercentage: 0,
    serviceChargeRate: 0,
    taxRate: 0,
    currency: getInitialCurrency(),
    activeOrder: null,
    activeOrders: [],
    selectedCustomer: null,
    customerPhone: "",
    redeemPoints: false,
    selectedDiscountGroup: null,

    fetchProducts: async (opts) => {
        // Skip the round-trip when we already have a recent in-memory list.
        // cachedReferenceList still dedupes simultaneous calls via its own
        // in-flight Map; this gate is what stops *sequential* refetches as
        // the user navigates between POS pages on the same shift.
        const branchKey = getSelectedBranchCacheKey();
        const { products, productsLastLoaded, productsBranchKey } = get();
        if (
            !opts?.force &&
            products.length > 0 &&
            productsBranchKey === branchKey &&
            Date.now() - productsLastLoaded < PRODUCTS_FRESH_MS
        ) {
            return;
        }
        const data = await getCashierProducts();
        set({ products: data, productsLastLoaded: Date.now(), productsBranchKey: branchKey });
    },

    resetForBranchSwitch: () => set({
        products: [],
        productsLastLoaded: 0,
        productsBranchKey: null,
        cart: [],
        selectedTable: null,
        offerId: null,
        offerName: null,
        offerNote: null,
        offerQty: 1,
        activeOrder: null,
        activeOrders: [],
        selectedCustomer: null,
        customerPhone: "",
        redeemPoints: false,
        selectedDiscountGroup: null,
    }),

    setCustomer: (customer) => set((state) => ({
        selectedCustomer: customer,
        customerPhone: customer?.phoneNumber ?? state.customerPhone,
        redeemPoints: false,
    })),
    setCustomerPhone: (phone) => set({ customerPhone: phone }),
    clearCustomer: () => set({ selectedCustomer: null, customerPhone: "", redeemPoints: false }),
    toggleRedeemPoints: () => set((state) => ({ redeemPoints: !state.redeemPoints })),
    setDiscountGroup: (group) => set({ selectedDiscountGroup: group }),

    setSelectedTable: (table) => set({ selectedTable: table }),
    setActiveOrder: (order) => set({ activeOrder: order }),
    setActiveOrders: (orders) => {
        // Deduplicate by order.id — defence against merge races between the
        // server fetch and the IDB snapshot mirror. Last occurrence wins so a
        // freshly-refetched server row always overrides a stale snapshot.
        const seen = new Map<string, any>();
        const anonymous: any[] = [];
        for (const o of orders ?? []) {
            const id = o?.id;
            if (typeof id === "string" && id.length > 0) {
                seen.set(id, o);
            } else {
                anonymous.push(o);
            }
        }
        set({ activeOrders: [...seen.values(), ...anonymous] });
    },
    setOfferContext: (offerId, offerName = null, offerNote = null, offerQty = 1) => set({ offerId, offerName, offerNote, offerQty }),
    
    setCurrency: (currency) => {
        // Save to localStorage
        try {
            localStorage.setItem('pos_currency', currency);
        } catch {
            console.warn('Failed to save currency to localStorage');
        }
        set({ currency });
    },

    addToCart: (product, selectedModifiers, quantity = 1, notes = "", preserveOfferContext = false, offerLineOfferId = null, offerLineOfferName = null, offerLineOfferNameAr = null, selectedOption = null, selectedRecipeAlternatives) => {
        // Option wins over ingredient swaps — silently drop swaps when an option is set.
        const effectiveAlternatives = selectedOption ? undefined : selectedRecipeAlternatives;
        const unitPrice = resolveCartUnitPrice(product, selectedModifiers, selectedOption, effectiveAlternatives);
        const safeQuantity = Math.max(1, Math.floor(quantity));
        const itemTotalPrice = unitPrice * safeQuantity;

        const newItem: CartItem = {
            cartId: generateUUID(),
            product,
            selectedModifiers,
            selectedOption,
            selectedRecipeAlternatives: effectiveAlternatives,
            quantity: safeQuantity,
            totalPrice: itemTotalPrice,
            notes: notes || undefined,
            isComplimentary: false,
            offerLineOfferId,
            offerLineName: offerLineOfferName,
            offerLineNameAr: offerLineOfferNameAr,
        };

        set((state) => {
            const nextCart = [...state.cart, newItem];
            const activeOfferLine = nextCart.find((item) => item.offerLineOfferId != null);

            return {
                cart: nextCart,
                offerId: activeOfferLine?.offerLineOfferId ?? (preserveOfferContext ? state.offerId : null),
                offerName: activeOfferLine ? (offerLineOfferName ?? state.offerName) : (preserveOfferContext ? state.offerName : null),
            };
        });
    },

    removeFromCart: (cartId) =>
        set((state) => {
            const nextCart = state.cart.filter((item) => item.cartId !== cartId);
            const activeOfferLine = nextCart.find((item) => item.offerLineOfferId != null);

            return {
                cart: nextCart,
                offerId: activeOfferLine?.offerLineOfferId ?? null,
                offerName: activeOfferLine ? state.offerName : null,
            };
        }),

    removeOfferFromCart: (offerId) =>
        set((state) => {
            const nextCart = state.cart.filter((item) => item.offerLineOfferId !== offerId);
            const activeOfferLine = nextCart.find((item) => item.offerLineOfferId != null);

            return {
                cart: nextCart,
                offerId: activeOfferLine?.offerLineOfferId ?? null,
                offerName: activeOfferLine ? state.offerName : null,
            };
        }),

    clearCart: () => set({ cart: [], discountPercentage: 0, offerId: null, offerName: null, offerNote: null, offerQty: 1 }),  // Do NOT wipe activeOrders — paid orders must stay visible  // Do NOT wipe activeOrders — paid orders must stay visible

    setDiscountPercentage: (val) => set({ discountPercentage: Math.min(100, Math.max(0, val)) }),
    setServiceChargeRate: (val) => set({ serviceChargeRate: Math.min(100, Math.max(0, val)) }),
    setTaxRate: (val) => set({ taxRate: Math.min(100, Math.max(0, val)) }),

    toggleComplimentary: (cartId) => set((state) => ({
        cart: state.cart.map(item =>
            item.cartId === cartId
                ? { ...item, isComplimentary: !item.isComplimentary }
                : item
        )
    })),

    toggleOfferComplimentary: (offerId) => set((state) => ({
        cart: state.cart.map(item =>
            item.offerLineOfferId === offerId
                ? { ...item, isComplimentary: !item.isComplimentary }
                : item
        )
    })),

    checkoutOrder: async () => {
        const state = get();
        if (state.cart.length === 0) return;

        if (!state.selectedTable) {
            console.error("No table selected");
            return;
        }

        const tenantId = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const tableId = state.selectedTable.id;
        const tableName = state.selectedTable.name;
        const distinctOfferIds = Array.from(
            new Set(
                state.cart
                    .map((item) => item.offerLineOfferId)
                    .filter((id): id is number => id != null)
            )
        );
        const singleOfferId = distinctOfferIds.length === 1 ? distinctOfferIds[0] : null;

        const refreshTableOrders = async (selectedOrderId?: string | null) => {
            // Use getTableAllOrders so paid orders remain visible (filtered by ticketId in page.tsx)
            const refreshedOrders = await getTableAllOrders(tableId);
            await syncTableOrderSnapshots([tableName], refreshedOrders as OrderDto[]);
            const refreshedSelectedOrder = selectedOrderId
                ? refreshedOrders.find((order: any) => order.id === selectedOrderId) ?? null
                : null; // Never auto-select; page.tsx re-applies ticket filter

            set({
                cart: [],
                discountPercentage: 0,
                activeOrders: refreshedOrders,
                activeOrder: refreshedSelectedOrder,
                selectedCustomer: null,
                customerPhone: "",
                redeemPoints: false,
                selectedDiscountGroup: null,
                offerId: null,
                offerName: null,
                offerNote: null,
                offerQty: 1,
            });
        };

        // Offline equivalents of refreshTableOrders:
        //  - `mergeOfflineOrderUpdate` splices a single updated order into the
        //    current activeOrders (preserves session scope — we never widen
        //    it to every historical order on the table).
        //  - `setOfflineFreshOrder` starts a brand-new session around the
        //    offline-created order so the UI treats it as the current ticket.
        const isFinishedPaid = (o: OrderDto) => {
            const finished = o.status === "Served" || o.status === "Completed";
            const paid = o.isPaid === true || o.status === "Paid" || !!o.paymentMethod;
            return finished && paid;
        };
        const mergeOfflineOrderUpdate = async (orderId: string) => {
            try {
                const snap = await getOrderSnapshot(orderId);
                const updated = snap?.data as OrderDto | undefined;
                const current = get().activeOrders as OrderDto[];
                const next = updated
                    ? current.some((o) => o.id === orderId)
                        ? current.map((o) => (o.id === orderId ? updated : o))
                        : [...current, updated]
                    : current;
                set({
                    cart: [],
                    discountPercentage: 0,
                    activeOrders: next,
                    activeOrder: updated ?? null,
                    selectedCustomer: null,
                    customerPhone: "",
                    redeemPoints: false,
                    selectedDiscountGroup: null,
                    offerId: null,
                    offerName: null,
                    offerNote: null,
                    offerQty: 1,
                });
            } catch (err) {
                console.error("Failed to merge offline order update:", err);
            }
        };
        const setOfflineFreshOrder = async (orderId: string) => {
            try {
                const snap = await getOrderSnapshot(orderId);
                const created = snap?.data as OrderDto | undefined;
                // A brand-new offline order anchors a fresh session. Carry
                // forward live orders already present for this table (same
                // pattern as handleTableClick offline) so the cashier still
                // sees any paid-but-not-served rows from the prior ticket.
                const priorLive = (get().activeOrders as OrderDto[]).filter(
                    (o) => !isFinishedPaid(o) && o.id !== orderId
                );
                const next = created ? [...priorLive, created] : priorLive;
                set({
                    cart: [],
                    discountPercentage: 0,
                    activeOrders: next,
                    activeOrder: created ?? null,
                    selectedCustomer: null,
                    customerPhone: "",
                    redeemPoints: false,
                    selectedDiscountGroup: null,
                    offerId: null,
                    offerName: null,
                    offerNote: null,
                    offerQty: 1,
                });
            } catch (err) {
                console.error("Failed to set offline fresh order:", err);
            }
        };

        const buildItemsPayload = (): OrderItemCreateDto[] =>
            state.cart.map((item: CartItem) => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: resolveCartUnitPrice(item.product, item.selectedModifiers, item.selectedOption, item.selectedRecipeAlternatives),
                notes: item.notes ?? "",
                isComplimentary: item.isComplimentary,
                offerLineId: item.offerLineOfferId ?? null,
                offerLineName: item.offerLineName ?? null,
                offerLineNameAr: item.offerLineNameAr ?? null,
                selectedOptionId: item.selectedOption?.id ?? null,
                selectedRecipeAlternatives: item.selectedOption
                    ? []
                    : (item.selectedRecipeAlternatives ?? []),
                modifiers: item.selectedModifiers.map((m: CartItemModifier) => ({
                    modifierId: m.id,
                    modifierName: m.name,
                    modifierNameAr: m.nameAr,
                    price: resolveCartModifierUnitPrice(item.product, m),
                    quantity: m.quantity || 1,
                })),
            }));

        // Parallel to buildItemsPayload. Resolves variant/swap display names so
        // the offline synthetic snapshot renders identical chips to the online
        // OrderDto. Server ignores these — they're UI hints only.
        const buildDisplayHints = (): OrderItemDisplayHint[] =>
            state.cart.map((item: CartItem) => {
                const opt = item.selectedOption;
                const swaps = opt ? [] : (item.selectedRecipeAlternatives ?? []);
                const recipeSnapshot = swaps.flatMap((s) => {
                    const row = item.product.recipeItems?.find((ri) => ri.id === s.recipeItemId);
                    const alt = row?.alternatives?.find((a) => a.id === s.alternativeId);
                    if (!row || !alt) return [];
                    return [{
                        rawMaterialId: alt.rawMaterialId,
                        rawMaterialName: alt.rawMaterialName,
                        rawMaterialNameAr: alt.rawMaterialNameAr,
                        sourceRecipeItemId: row.id,
                        sourceAlternativeId: alt.id,
                        sourceAlternativeName: alt.name ?? alt.rawMaterialName,
                        sourceAlternativeNameAr: alt.nameAr ?? alt.rawMaterialNameAr,
                        quantity: alt.amount ?? 0,
                    }];
                });
                return {
                    selectedOptionName: opt?.name ?? null,
                    selectedOptionNameAr: opt?.nameAr ?? null,
                    recipeSnapshot,
                };
            });

            const online = getConnectivityState() === "online";
            const customerPhone = state.customerPhone.trim() || state.selectedCustomer?.phoneNumber?.trim() || undefined;
            const customerName = state.selectedCustomer?.displayName || state.selectedCustomer?.name || undefined;

            if (state.activeOrder) {
            // Add new items to the existing active order
            const newItems = buildItemsPayload();
            if (online) {
                try {
                    const updatedOrder = await addItemsToOrder(state.activeOrder.id, newItems);
                    if (updatedOrder) {
                        // Legacy Order.OfferId supports only one offer; set it only when this batch has exactly one offer.
                        if (singleOfferId != null) {
                            await setOrderOffer(updatedOrder.id, singleOfferId, state.offerNote, state.offerQty ?? 1);
                        }
                        await refreshTableOrders(updatedOrder.id);
                        return;
                    }
                } catch (err) {
                    console.warn("addItemsToOrder failed online, falling back to offline queue:", err);
                }
            }
            // Offline / server failure: queue + mirror snapshot. `addOrderItemsOffline`
            // writes the updated snapshot to IDB via updateSnapshotForAction, so
            // reading the snapshot back gives us the new totals and line items.
            try {
                await addOrderItemsOffline(state.activeOrder.id, newItems, buildDisplayHints());
            } catch (err) {
                if (err instanceof OfflineOrderValidationError) {
                    toast.error(err.message);
                    return;
                }
                throw err;
            }
            await mergeOfflineOrderUpdate(state.activeOrder.id);
        } else {
            // Create a brand-new order. Routes through createOrderSmart so:
            //  1. clientOrderUUID is generated once and shared between the
            //     online attempt and any offline replay → backend idempotency
            //     middleware collapses a delayed-response duplicate.
            //  2. 4xx errors throw OrderCreateClientError → surface to the
            //     cashier, do NOT silently enqueue a payload the server will
            //     reject on every retry.
            //  3. Only navigator.onLine === false skips the network attempt;
            //     "degraded" still tries the API since the order POST is the
            //     truth-source for reachability.
            const orderDto: OrderCreateDto = {
                tenantId,
                tableId,
                tableName,
                customerId: state.selectedCustomer?.customerId,
                customerPhone,
                customerName,
                customerNameAr: state.selectedCustomer?.nameAr,
                discountPercentage: 0,
                discountGroupId: state.selectedDiscountGroup?.id ?? null,
                serviceChargeRate: state.serviceChargeRate,
                taxRate: state.taxRate,
                offerId: singleOfferId,
                offerNote: state.offerNote,
                offerQty: state.offerQty ?? 1,
                items: buildItemsPayload(),
            };
            let createdOrder: OrderDto | null = null;
            try {
                createdOrder = await createOrderSmart(orderDto, createOrderAndReturn, buildDisplayHints());
            } catch (err) {
                if (err instanceof OrderCreateClientError) {
                    toast.error(err.message);
                    return;
                }
                if (err instanceof OfflineOrderValidationError) {
                    toast.error(err.message);
                    return;
                }
                throw err;
            }
            if (!createdOrder) {
                toast.error("Failed to create order");
                return;
            }
            if (isOfflineOrderId(createdOrder.id)) {
                // Offline path — never call the server-dependent receipt printer
                // or the table-orders refresh; both would hit a stale cache.
                await setOfflineFreshOrder(createdOrder.id);
                return;
            }
            // Online path — print receipt fire-and-forget; lazy import keeps
            // html2canvas out of bundles that never print.
            void import("@/lib/print-receipt-image").then(
                ({ autoPrintReceiptForOrder }) =>
                    autoPrintReceiptForOrder(createdOrder),
            );
            await refreshTableOrders(createdOrder.id);
        }
    },
}),
{
    name: 'pos-settings',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        currency: state.currency,
        taxRate: state.taxRate,
        serviceChargeRate: state.serviceChargeRate,
    }),
}
));
