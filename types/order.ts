export interface OrderCreateDto {
    // Optional: backend falls back to the X-Tenant-ID header (tenant resolver)
    // when absent. Never send "" — it fails Guid model binding server-side.
    tenantId?: string;
    tableId?: string | null;
    tableName: string;
    orderType?: number; // 0=DineIn, 1=Takeaway, 2=Delivery
    ticketId?: number; // Session ticket ID (0 for auto-generate, or explicit value)
    discountPercentage?: number;
    // Affiliation discount group selected by the cashier. Only the Id is sent; the backend
    // loads the group, validates tenant + active state, and resolves the authoritative %.
    discountGroupId?: string | null;
    serviceChargeRate?: number;  // Passed from admin settings; validated & clamped server-side
    taxRate?: number;            // Passed from admin settings; validated & clamped server-side
    offerId?: number | null;
    offerQty?: number | null;
    offerNote?: string | null;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    customerNameAr?: string | null;
    clientOrderUUID?: string;
    publicOrderNumber?: string;
    // Local display only while offline. The server always replaces it with DI-N / TA-N / PT-N.
    orderSequenceNumber?: string;
    orderSource?: string;
    scheduledFor?: string | null;
    talabatOrderNumber?: string | null;
    talabatCustomerName?: string | null;
    talabatCustomerPhone?: string | null;
    talabatPaymentMethod?: string | null;
    talabatPickupTime?: string | null;
    talabatDeliveryFee?: number | null;
    talabatServiceFee?: number | null;
    deliveryPartnerId?: string | null;
    deliveryPartnerName?: string | null;
    deliveryPartnerNameAr?: string | null;
    deliveryPartnerCode?: string | null;
    partnerOrderNumber?: string | null;
    partnerCustomerName?: string | null;
    partnerCustomerPhone?: string | null;
    partnerPaymentMethod?: string | null;
    partnerPickupTime?: string | null;
    partnerDeliveryFee?: number | null;
    partnerServiceFee?: number | null;
    actualDeliveryCost?: number | null;
    hasPriceDifference?: boolean;
    priceDifferenceReasonCode?: DeliveryPartnerPriceAdjustmentReason | null;
    priceDifferenceNote?: string | null;
    priceDifferenceCorrectionMode?: DeliveryPartnerPriceCorrectionMode | null;
    correctPartnerTotal?: number | null;
    deliveryZoneId?: string | null;
    deliveryZoneName?: string | null;
    deliveryFee?: number | null;
    deliveryCost?: number | null;
    deliveryPaymentMode?: string | null;
    deliveryAddress?: string | null;
    deliveryNotes?: string | null;
    deliveryFeeOverride?: number | null;
    offlinePaidAt?: string | null;
    // Offline financial snapshot — used only on OFF# replays so admin rate
    // / price edits during the outage can't move the recorded totals away
    // from the printed receipt. The backend honors these only when
    // publicOrderNumber is also set; online orders ignore them.
    subtotal?: number | null;
    discountAmount?: number | null;
    serviceChargeAmount?: number | null;
    taxAmount?: number | null;
    totalAmount?: number | null;
    items: OrderItemCreateDto[];
}

export interface OrderItemCreateDto {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
    isComplimentary?: boolean;
    offerLineId?: number | null;
    offerLineName?: string | null;
    offerLineNameAr?: string | null;
    partnerCorrectedUnitPrice?: number | null;
    /** Selected product option (variant). When set, overrides product price and recipe. */
    selectedOptionId?: string | null;
    /** Per-ingredient swap choices for this order line. Each entry replaces ONE recipe row.
     *  Ignored by the server when selectedOptionId is set (option wins). */
    selectedRecipeAlternatives?: SelectedRecipeAlternativeDto[];
    modifiers: OrderItemModifierCreateDto[];
}

export interface SelectedRecipeAlternativeDto {
    recipeItemId: string;
    alternativeId: string;
}

export interface OrderItemModifierCreateDto {
    modifierId?: string;
    modifierName: string;
    modifierNameAr?: string;
    price: number;
    quantity: number;
}

export interface OrderDto {
    id: string;
    orderNumber: string;
    clientOrderUUID?: string | null;
    publicOrderNumber?: string | null;
    // Server display number (DI-16 / TA-9 / PT-4), or a provisional local number while offline.
    // Null/undefined for legacy orders created before this feature.
    orderSequenceNumber?: string | null;
    // Configured display number — "TA-1", "TA-202606-1", "OFF-TA-1", etc.
    // It may repeat after its configured reset boundary.
    // The top-level `orderNumber` field already carries this value when present,
    // so existing UI keeps working unchanged; this is exposed for code that
    // needs to know whether the new value exists.
    displayOrderNumber?: string | null;
    // Unique internal system identifier. Surfaced separately so
    // cashier/payment views can show both the user-facing display number and
    // the system reference without ambiguity. Null for legacy clients.
    systemOrderNumber?: string | null;
    ticketId: number; // Session ticket ID (one per table session; multiple orders share this)
    tableName: string;
    orderType?: string; // "DineIn", "Takeaway", or "Delivery"
    orderSource?: string;
    scheduledFor?: string | null;
    talabatOrderNumber?: string | null;
    talabatCustomerName?: string | null;
    talabatCustomerPhone?: string | null;
    talabatPaymentMethod?: string | null;
    talabatPickupTime?: string | null;
    talabatDeliveryFee?: number | null;
    talabatServiceFee?: number | null;
    deliveryPartnerId?: string | null;
    deliveryPartnerName?: string | null;
    deliveryPartnerNameAr?: string | null;
    deliveryPartnerCode?: string | null;
    partnerOrderNumber?: string | null;
    partnerCustomerName?: string | null;
    partnerCustomerPhone?: string | null;
    partnerPaymentMethod?: string | null;
    partnerPickupTime?: string | null;
    partnerDeliveryFee?: number | null;
    partnerServiceFee?: number | null;
    offerId?: number | null;
    offerName?: string | null;
    offerNameAr?: string | null;
    offerNote?: string | null;
    offerProducts?: OrderOfferProductDto[];
    isPaid?: boolean;
    // Breakdown — all calculated server-side (do NOT recompute on frontend)
    subtotal: number;          // Sum of non-complimentary items before any charges
    discountPercentage: number;
    discountAmount: number;    // subtotal × discountPercentage / 100
    // Affiliation discount group applied to the order, snapshotted server-side at creation.
    // Applied after the manual order discount and before service charge / tax.
    // discountGroupType: 0 = Percentage, 1 = FixedAmount (matches backend DiscountValueType).
    discountGroupId?: string | null;
    discountGroupName?: string | null;
    discountGroupType?: number;
    discountGroupValue?: number;
    discountGroupAmount?: number;
    // Storefront promo snapshot, frozen at order creation (applied after the group discount).
    promoCodeId?: string | null;
    promoCode?: string | null;
    promoDiscountAmount?: number;
    discountType?: OrderDiscountType | null;
    discountValue?: number;
    discountAppliedByName?: string | null;
    discountAppliedAt?: string | null;
    serviceChargeRate: number;
    serviceChargeAmount: number;
    taxRate: number;
    taxAmount: number;
    isVoucherApplied?: boolean;
    voucherDiscountAmount?: number;
    voucherAppliedAt?: string | null;
    totalAmount: number;       // Final amount due
    foodSubtotal?: number;
    customerDeliveryFee?: number;
    actualDeliveryCost?: number;
    deliveryMargin?: number;
    marketplaceDeliveryFee?: number;
    marketplaceServiceFee?: number;
    netRestaurantRevenue?: number;

    status: string;
    paymentStatus?: string;
    paidAmount?: number;
    remainingAmount?: number;
    paymentMethod?: string;
    cashierName?: string | null;
    createdBy?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    customerNameAr?: string | null;
    customerPhone?: string;
    amountTendered?: number;
    changeAmount?: number;
    cancelMode?: string | null;
    canceledById?: string | null;
    canceledByName?: string | null;
    canceledAt?: string | null;
    cancelReason?: string | null;
    payments?: PaymentDto[];
    items?: OrderItemDto[];
    hasPriceDifference?: boolean;
    priceDifferenceCorrectionMode?: DeliveryPartnerPriceCorrectionMode | null;
    originalPartnerTotal?: number | null;
    correctPartnerTotal?: number | null;
    totalDifferenceAmount?: number | null;
    hasPartnerDiscountOverride?: boolean;
    isFullyCancelled?: boolean;
    hasPendingCancellation?: boolean;
    hasPendingFullCancellation?: boolean;
    pendingCancellationItemIds?: string[];
    cancellationInfo?: CancellationInfoDto | null;
    // Timestamps — required for date filtering (client-side derived state)
    createdAt: string; // ISO 8601 UTC datetime
    lastUpdatedAt?: string; // ISO 8601 UTC datetime, null if never modified
    dispatchedAt?: string | null;
    // Server-set timestamp of the last confirmed write. Offline client stamps this
    // locally when an action transitions to 'synced' so stale IDB rows can be aged.
    syncedAt?: string | null;
    // Refund fields — present when order was refunded after payment
    isRefunded?: boolean;
    refundAmount?: number;
    refundedAt?: string;
    // Takeaway-only: timestamp when a Paid takeaway order was dispatched to the kitchen.
    // Null until the cashier clicks "Send to Kitchen". Null for dine-in orders.
    kitchenNotifiedAt?: string | null;
    deliveryZoneId?: string | null;
    deliveryZoneName?: string | null;
    deliveryFee?: number | null;
    deliveryCost?: number | null;
    deliveryPaymentMode?: string | null;
    deliveryAddress?: string | null;
    deliveryNotes?: string | null;
    /** Reference the customer declared at checkout, when their method required one. */
    submittedPaymentReference?: string | null;
}

export type OrderDiscountType = "FixedAmount" | "Percentage";

export interface OrderDiscountChange {
    operation: "Apply" | "Remove";
    type?: OrderDiscountType;
    value?: number;
}

export interface CancellationInfoDto {
    cancelLogId: string;
    orderItemId?: string | null;
    itemName?: string | null;
    requestedBy: string;
    requestDate: string;
    cancellationReason: string;
    notes?: string | null;
    approvalStatus: string;
    managerDecision?: string | null;
    managerNotes?: string | null;
    decisionDate?: string | null;
    approvedOrRejectedBy?: string | null;
    previousStatus?: string | null;
}

export interface OrderListItemDto {
    id: string;
    orderNumber: string;
    orderSequenceNumber?: string | null;
    ticketId: number;
    tableName: string;
    orderType: string;
    orderSource?: string;
    talabatOrderNumber?: string | null;
    talabatPickupTime?: string | null;
    deliveryPartnerId?: string | null;
    deliveryPartnerName?: string | null;
    deliveryPartnerNameAr?: string | null;
    deliveryPartnerCode?: string | null;
    partnerOrderNumber?: string | null;
    itemCount: number;
    totalAmount: number;
    foodSubtotal?: number;
    customerDeliveryFee?: number;
    actualDeliveryCost?: number;
    deliveryMargin?: number;
    marketplaceDeliveryFee?: number;
    marketplaceServiceFee?: number;
    netRestaurantRevenue?: number;
    status: string;
    isPaid: boolean;
    paymentStatus: string;
    paymentMethod?: string | null;
    paymentMethodName?: string | null;
    paymentMethodNameAr?: string | null;
    paymentMethodCode?: string | null;
    paymentReferenceNumber?: string | null;
    cashierName?: string | null;
    isVoucherApplied?: boolean;
    voucherDiscountAmount?: number;
    voucherAppliedAt?: string | null;
    paidAmount: number;
    remainingAmount: number;
    customerId?: string | null;
    customerName?: string | null;
    customerNameAr?: string | null;
    customerPhone?: string | null;
    createdAt: string;
    lastUpdatedAt?: string | null;
    hasPendingPaymentAdjustment?: boolean;
    pendingPaymentAdjustmentId?: string | null;
    hasPendingCancellationApproval?: boolean;
    pendingCancellationId?: string | null;
    hasPriceDifference?: boolean;
    hasPartnerDiscountOverride?: boolean;
}

export interface OrderFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    payment?: string;
    type?: string;
    source?: string;
    branchId?: string;
    partnerId?: string;
    voucherApplied?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sort?: "newest" | "oldest";
}

export interface OrderSummaryDto {
    totalCount: number;
    activeCount: number;
    paidCount: number;
    revenue: number;
    foodRevenue?: number;
    deliveryCollected?: number;
    deliveryCost?: number;
    deliveryProfit?: number;
    marketplaceFees?: number;
    marketplaceServiceFees?: number;
    netRestaurantRevenue?: number;
    voucherCount?: number;
    voucherDiscountTotal?: number;
    partnerGrossRevenue?: number;
    partnerDiscountRevenue?: number;
    partnerDiscountAmount?: number;
    partnerDiscountCount?: number;
}

export interface PaymentDto {
    id: string;
    amount: number;
    method: string;
    paymentMethodId?: string | null;
    paymentMethodName?: string | null;
    paymentMethodNameAr?: string | null;
    paymentMethodCode?: string | null;
    referenceNumber?: string | null;
    createdAt: string;
}

export interface OrderOfferProductDto {
    productId: string;
    name: string;
    nameAr: string;
    quantity: number;
    // Real OrderItem row id — populated by backend for bundled offer children so the
    // kitchen "Ready" button can target the actual DB row instead of the synthetic
    // bundle wrapper (whose id is Guid.Empty). Optional for backward compatibility.
    orderItemId?: string;
    isReady?: boolean;
}

export interface OrderItemDto {
    id?: string;
    productId?: string;
    offerLineId?: number | null;
    productName: string;
    productNameAr?: string;
    quantity: number;
    unitPrice?: number;        // Per-item base price after order-level discount; excludes tax and service charge
    lineTotalAmount?: number;  // (unitPrice + modifiers) × quantity; 0 if complimentary
    unitPriceSnapshot?: number | null;
    lineTotalSnapshot?: number | null;
    partnerPriceSnapshot?: number | null;
    hasPartnerDiscountOverride?: boolean;
    partnerOriginalUnitPrice?: number | null;
    partnerDiscountedUnitPrice?: number | null;
    partnerDiscountReason?: string | null;
    partnerDiscountUpdatedAt?: string | null;
    partnerDiscountUpdatedBy?: string | null;
    partnerDiscountUpdatedByName?: string | null;
    notes?: string;
    isComplimentary?: boolean;
    itemStatus?: string;
    isNewlyAdded?: boolean;    // true = item was added to an existing order (kitchen "NEW" badge)
    selectedOptionName?: string | null;
    selectedOptionNameAr?: string | null;
    modifiers?: OrderItemModifierDto[];
    recipeSnapshot?: OrderItemRecipeSnapshotDto[];
    // NEW: Offer bundle support
    isOfferBundle?: boolean;   // true when this item represents an offer bundle (single item wrapping multiple products)
    bundledOfferProducts?: OrderOfferProductDto[];  // Products included in this offer bundle (only populated when isOfferBundle is true)
}

export interface OrderItemModifierDto {
    modifierId?: string;
    modifierName: string;
    modifierNameAr?: string;
    price?: number;
    quantity?: number;
}

export interface OrderItemRecipeSnapshotDto {
    rawMaterialId: string;
    sourceModifierId?: string | null;
    sourceOptionId?: string | null;
    /** Set when this row came from an ingredient-level swap. */
    sourceRecipeItemId?: string | null;
    sourceAlternativeId?: string | null;
    /** Snapshot of the alternative's display name at order time. */
    sourceAlternativeName?: string | null;
    sourceAlternativeNameAr?: string | null;
    rawMaterialName: string;
    rawMaterialNameAr?: string;
    quantity: number;
}

export interface PartnerDiscountOverridePayload {
    hasPartnerDiscountOverride: boolean;
    partnerOriginalUnitPrice?: number | null;
    partnerDiscountedUnitPrice?: number | null;
    reasonCode?: string | null;
    partnerDiscountReason?: string | null;
    note?: string | null;
}

export interface PartnerDiscountOverrideDto extends PartnerDiscountOverridePayload {
    orderId: string;
    orderItemId: string;
    partnerDiscountUpdatedAt?: string | null;
    partnerDiscountUpdatedBy?: string | null;
    partnerDiscountUpdatedByName?: string | null;
}

export interface OrderTotalOverridePayload {
    correctedTotalAmount: number;
    reason?: string | null;
}

export interface OrderTotalOverrideDto extends OrderTotalOverridePayload {
    orderId: string;
    previousTotalAmount: number;
    updatedAt: string;
    updatedBy?: string | null;
    updatedByName?: string | null;
}

export interface PartnerPriceOverrideAuditDto {
    id: string;
    orderId: string;
    orderItemId: string;
    oldPrice?: number | null;
    newPrice?: number | null;
    oldDiscountAmount?: number | null;
    newDiscountAmount?: number | null;
    reasonCode?: string | null;
    reason?: string | null;
    note?: string | null;
    deliveryPartnerId?: string | null;
    deliveryPartnerName?: string | null;
    deliveryPartnerNameAr?: string | null;
    deliveryPartnerCode?: string | null;
    correctionMode?: DeliveryPartnerPriceCorrectionMode | null;
    originalTotal?: number | null;
    correctTotal?: number | null;
    differenceAmount?: number | null;
    updatedBy?: string | null;
    updatedByName?: string | null;
    updatedAt: string;
}

export type DeliveryPartnerPriceAdjustmentReason =
    | "PriceDifference"
    | "NoDiscountApplied"
    | "ExtraDiscountApplied"
    | "Other";

export type DeliveryPartnerPriceCorrectionMode = "PerItem" | "OrderTotal";

export interface DeliveryPartnerPriceAdjustmentPayload {
    hasPriceDifference: boolean;
    reasonCode: DeliveryPartnerPriceAdjustmentReason;
    note?: string | null;
    correctionMode?: DeliveryPartnerPriceCorrectionMode;
    correctPartnerTotal?: number | null;
    items: DeliveryPartnerPriceAdjustmentItemPayload[];
}

export interface DeliveryPartnerPriceAdjustmentItemPayload {
    orderItemId: string;
    newUnitPrice: number;
}

export interface ValidatePriceRequest {
    offerId?: number | null;
    offerQty?: number | null;
    items: OrderLineValidationItem[];
}

export interface OrderLineValidationItem {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface ValidatePriceResponse {
    isValid: boolean;
    expectedTotal: number;
    submittedTotal: number;
    discrepancy: number;
    message: string;
    unavailableItems: string[];
}

// Cancel feature types
export type OrderCancelReasonCode =
    | "CLIENT_CHANGED_MIND"
    | "WRONG_ORDER_ENTERED"
    | "CLIENT_LEFT"
    | "ALLERGY_CONCERN"
    | "ITEM_UNAVAILABLE"
    | "OTHER";

export interface CancelOrderPayload {
    cancelReason: OrderCancelReasonCode;
    cancelReasonNote?: string;
    mode?: "DIRECT" | "KITCHEN";
}
