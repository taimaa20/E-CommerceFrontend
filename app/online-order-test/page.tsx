"use client";

// Online Order sandbox — isolated test harness for the Payment Engine
// (Paymob Hosted Checkout). NOT part of the cashier flow. This page only
// composes existing APIs: products/categories, POST /orders
// (OrderSource=Mobile), and POST /api/v1/payment-engine/payments.
// It will later become the Mobile Application payment flow.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { createOrderAndReturn, getCategories, getProducts } from "@/lib/api";
import {
    createPayment,
    getOrderPayment,
    PaymentEngineMethod,
    PaymentEngineSessionStatus,
    type CreatePaymentBillingData,
} from "@/lib/api-payment-engine";
import { saveOnlineOrderTestContext } from "@/lib/online-order-test";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { OrderDto } from "@/types/order";
import type { CategoryDto, ProductDto } from "@/types/pos";

const PAYMOB_PROVIDER_CODE = "paymob";
const PAYMOB_BILLING_COUNTRY = "EG";
const ORDER_SOURCE_MOBILE = "Mobile";
const ONLINE_ORDER_TABLE_NAME = "ONLINE";
const TAKEAWAY_ORDER_TYPE = 1;

interface CartLine {
    product: ProductDto;
    quantity: number;
}

interface CustomerInfo {
    name: string;
    phone: string;
    email: string;
    address: string;
}

const EMPTY_CUSTOMER: CustomerInfo = { name: "", phone: "", email: "", address: "" };

function getUnitPrice(product: ProductDto): number {
    return product.discountedPrice || product.basePrice;
}

function buildBillingData(customer: CustomerInfo): CreatePaymentBillingData {
    const [firstName, ...rest] = customer.name.trim().split(/\s+/);
    return {
        firstName: firstName || "Guest",
        lastName: rest.join(" ") || firstName || "Guest",
        email: customer.email.trim(),
        phoneNumber: customer.phone.trim(),
        country: PAYMOB_BILLING_COUNTRY,
        street: customer.address.trim() || null,
    };
}

function storeCallbackContext(order: OrderDto, paymentId: string): void {
    saveOnlineOrderTestContext({
        orderId: order.id,
        orderNumber: order.systemOrderNumber ?? order.orderNumber,
        amount: order.totalAmount,
        paymentId,
    });
}

export default function OnlineOrderTestPage() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    // The Payment Engine rejects payments whose currency differs from the
    // restaurant's configured currency, so this must come from settings.
    const currency = useSettingsStore((s) => s.settings.currency);

    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
    const [menuError, setMenuError] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const [cart, setCart] = useState<Record<string, CartLine>>({});
    const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);

    const [order, setOrder] = useState<OrderDto | null>(null);
    // Snapshot taken at order creation so retried payment calls send an
    // identical request body (the Payment Engine idempotency fingerprint
    // covers billing data — a drifting form would turn a replay into a 409).
    const [billingSnapshot, setBillingSnapshot] = useState<CreatePaymentBillingData | null>(null);

    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [isStartingPayment, setIsStartingPayment] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        (async () => {
            setIsLoadingMenu(true);
            setMenuError(null);
            try {
                const [categoryList, productList] = await Promise.all([getCategories(), getProducts()]);
                if (cancelled) return;
                setCategories(categoryList.filter((c) => c.isActive));
                setProducts(productList.filter((p) => p.isActive));
            } catch {
                if (!cancelled) setMenuError("Failed to load the menu. Check that the backend is running and you are logged in.");
            } finally {
                if (!cancelled) setIsLoadingMenu(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isAuthenticated]);

    const visibleProducts = useMemo(
        () => (selectedCategoryId ? products.filter((p) => p.categoryId === selectedCategoryId) : products),
        [products, selectedCategoryId],
    );

    const cartLines = useMemo(() => Object.values(cart), [cart]);
    const cartTotal = cartLines.reduce((sum, line) => sum + getUnitPrice(line.product) * line.quantity, 0);

    const isCustomerValid =
        customer.name.trim().length > 0 &&
        customer.phone.trim().length > 0 &&
        /.+@.+\..+/.test(customer.email.trim());

    const changeQuantity = (product: ProductDto, delta: number) => {
        setCart((prev) => {
            const existing = prev[product.id];
            const nextQty = (existing?.quantity ?? 0) + delta;
            if (nextQty <= 0) {
                const rest = { ...prev };
                delete rest[product.id];
                return rest;
            }
            return { ...prev, [product.id]: { product, quantity: nextQty } };
        });
    };

    const handleCreateOrder = async () => {
        if (cartLines.length === 0) {
            toast.error("Add at least one product");
            return;
        }
        if (!isCustomerValid) {
            toast.error("Name, phone and a valid email are required");
            return;
        }

        setIsCreatingOrder(true);
        try {
            const created = await createOrderAndReturn({
                tableId: null,
                tableName: ONLINE_ORDER_TABLE_NAME,
                orderType: TAKEAWAY_ORDER_TYPE,
                orderSource: ORDER_SOURCE_MOBILE,
                customerName: customer.name.trim(),
                customerPhone: customer.phone.trim(),
                deliveryAddress: customer.address.trim() || undefined,
                items: cartLines.map((line) => ({
                    productId: line.product.id,
                    productName: line.product.name,
                    price: getUnitPrice(line.product),
                    quantity: line.quantity,
                    modifiers: [],
                })),
            });
            if (!created) {
                toast.error("Order creation returned no order");
                return;
            }
            setOrder(created);
            setBillingSnapshot(buildBillingData(customer));
            toast.success(`Order ${created.orderNumber} created`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create the order");
        } finally {
            setIsCreatingOrder(false);
        }
    };

    const handlePayWithPaymob = async () => {
        if (!order || !billingSnapshot) return;
        setIsStartingPayment(true);
        try {
            // Idempotency: if this order already has a live checkout session,
            // reuse its URL instead of creating another Payment. Sessions past
            // their provider deadline are skipped — the Payment Engine expires
            // them and attaches a fresh session to the same Payment aggregate.
            const existing = await getOrderPayment(order.id).catch(() => null);
            const reusableSession = existing?.currentPayment?.sessions.find(
                (s) => s.checkoutUrl
                    && (s.status === PaymentEngineSessionStatus.Created ||
                        s.status === PaymentEngineSessionStatus.Pending ||
                        s.status === PaymentEngineSessionStatus.RequiresAction)
                    && (!s.expiresAtUtc || new Date(s.expiresAtUtc).getTime() > Date.now()));
            if (existing?.currentPayment && reusableSession?.checkoutUrl) {
                storeCallbackContext(order, existing.currentPayment.paymentId);
                window.location.href = reusableSession.checkoutUrl;
                return;
            }

            // Stable key per order: a replay returns the existing session; an
            // expired session gets a new attempt on the same Payment aggregate.
            const response = await createPayment({
                orderId: order.id,
                merchantReference: order.systemOrderNumber ?? order.orderNumber,
                amount: order.totalAmount,
                currency: currency,
                method: PaymentEngineMethod.Card,
                providerCode: PAYMOB_PROVIDER_CODE,
                idempotencyKey: `online-order:${order.id}`,
                billingData: billingSnapshot,
                items: [],
            });
            if (!response.checkoutUrl) {
                toast.error("Payment Engine did not return a checkout URL");
                return;
            }
            storeCallbackContext(order, response.paymentId);
            window.location.href = response.checkoutUrl;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to start the payment");
        } finally {
            setIsStartingPayment(false);
        }
    };

    const resetFlow = () => {
        setOrder(null);
        setBillingSnapshot(null);
        setCart({});
        setCustomer(EMPTY_CUSTOMER);
    };

    if (!isAuthenticated) {
        return (
            <main className="mx-auto max-w-2xl p-8">
                <h1 className="text-xl font-semibold">Online Order Test</h1>
                <p className="mt-4 text-sm text-muted-foreground">
                    You must be logged in to use this sandbox. <Link className="underline" href="/login">Go to login</Link>
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-4xl space-y-8 p-6">
            <header>
                <h1 className="text-2xl font-semibold">Online Order Test</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Payment Engine sandbox — simulates the future mobile ordering flow. Not a cashier tool.
                </p>
            </header>

            {order === null ? (
                <>
                    <section className="space-y-3">
                        <h2 className="text-lg font-medium">1 · Choose products</h2>
                        {isLoadingMenu && <p className="text-sm text-muted-foreground">Loading menu…</p>}
                        {menuError && <p className="text-sm text-red-600 dark:text-red-400">{menuError}</p>}
                        {!isLoadingMenu && !menuError && (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategoryId(null)}
                                        className={`rounded-full border px-3 py-1 text-sm ${selectedCategoryId === null ? "bg-primary text-primary-foreground" : "bg-background"}`}
                                    >
                                        All
                                    </button>
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => setSelectedCategoryId(category.id)}
                                            className={`rounded-full border px-3 py-1 text-sm ${selectedCategoryId === category.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
                                        >
                                            {category.displayName || category.name}
                                        </button>
                                    ))}
                                </div>
                                {visibleProducts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No products in this category.</p>
                                ) : (
                                    <ul className="grid gap-2 sm:grid-cols-2">
                                        {visibleProducts.map((product) => {
                                            const quantity = cart[product.id]?.quantity ?? 0;
                                            return (
                                                <li key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{product.displayName || product.name}</p>
                                                        <p className="text-sm text-muted-foreground">{getUnitPrice(product).toFixed(2)} {currency}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => changeQuantity(product, -1)} disabled={quantity === 0} className="h-8 w-8 rounded border disabled:opacity-40">−</button>
                                                        <span className="w-6 text-center tabular-nums">{quantity}</span>
                                                        <button type="button" onClick={() => changeQuantity(product, 1)} className="h-8 w-8 rounded border">+</button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-medium">2 · Customer information</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Name *</span>
                                <input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} className="w-full rounded border bg-background px-3 py-2" placeholder="Customer name" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Phone *</span>
                                <input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} className="w-full rounded border bg-background px-3 py-2" placeholder="+20100…" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Email *</span>
                                <input type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} className="w-full rounded border bg-background px-3 py-2" placeholder="customer@example.com" />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Delivery address (optional)</span>
                                <input value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} className="w-full rounded border bg-background px-3 py-2" placeholder="Street, building…" />
                            </label>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-medium">3 · Create order</h2>
                        <p className="text-sm text-muted-foreground">
                            {cartLines.length} item{cartLines.length === 1 ? "" : "s"} · total {cartTotal.toFixed(2)} {currency} (final total is computed by the server)
                        </p>
                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={isCreatingOrder || cartLines.length === 0 || !isCustomerValid}
                            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                        >
                            {isCreatingOrder ? "Creating order…" : "Create Online Order"}
                        </button>
                    </section>
                </>
            ) : (
                <>
                    <section className="space-y-3">
                        <h2 className="text-lg font-medium">4 · Order created</h2>
                        <dl className="grid gap-x-8 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-2">
                            <div><dt className="text-muted-foreground">Order ID</dt><dd className="break-all font-mono">{order.id}</dd></div>
                            <div><dt className="text-muted-foreground">Order Number</dt><dd>{order.systemOrderNumber ?? order.orderNumber}</dd></div>
                            <div><dt className="text-muted-foreground">Amount</dt><dd>{order.totalAmount.toFixed(2)} {currency}</dd></div>
                            <div><dt className="text-muted-foreground">Payment Status</dt><dd>{order.paymentStatus ?? (order.isPaid ? "Paid" : "Unpaid")}</dd></div>
                            <div><dt className="text-muted-foreground">Order Status</dt><dd>{order.status}</dd></div>
                            <div><dt className="text-muted-foreground">Order Source</dt><dd>{order.orderSource ?? ORDER_SOURCE_MOBILE}</dd></div>
                        </dl>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-lg font-medium">5 · Payment method</h2>
                        <div className="rounded-lg border p-4">
                            <label className="flex items-center gap-3 text-sm">
                                <input type="radio" checked readOnly />
                                <span className="font-medium">Paymob</span>
                                <span className="text-muted-foreground">— Hosted Checkout</span>
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePayWithPaymob}
                                disabled={isStartingPayment}
                                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                            >
                                {isStartingPayment ? "Starting payment…" : "Pay with Paymob"}
                            </button>
                            <button type="button" onClick={resetFlow} className="rounded-lg border px-4 py-2">
                                Start a new test order
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            You will be redirected to Paymob Hosted Checkout, then back to /payment/paymob/callback.
                        </p>
                    </section>
                </>
            )}
        </main>
    );
}
