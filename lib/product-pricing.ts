import type { ProductDto } from "@/types/pos"

export type ProductMarkupType = "percentage" | "multiplier" | "fixed"
export type ProductPricingMode = "manual" | "margin" | "multiplier"

export const DEFAULT_PROFIT_MARGIN = 75
export const MAX_MARGIN_PERCENT = 100
export const MAX_MARKUP_VALUE = 100

export const parsePricingNumber = (value: string) => {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export const clampNonNegative = (value: number) => Math.max(value, 0)

export const normalizeNonNegativeInput = (value: string) => value.startsWith("-") ? "0" : value

export const formatPricingValue = (value: number, fractionDigits = 2) => {
    if (!Number.isFinite(value)) return ""
    return value.toFixed(fractionDigits).replace(/\.?0+$/, "")
}

export const formatMarkupValue = (value: number, markupType: ProductMarkupType) => {
    return formatPricingValue(value, markupType === "multiplier" ? 4 : 2)
}

export const isValidMarginPercentage = (marginPercentage: number) => {
    return marginPercentage >= 0 && marginPercentage < MAX_MARGIN_PERCENT
}

export const roundGeneratedBasePrice = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) return 0
    const whole = Math.ceil(price)
    const rem = whole % 10
    if (rem === 0) return whole
    if (rem <= 5) return whole + (5 - rem)
    return whole + (10 - rem)
}

export const roundCurrency = (value: number) => {
    if (!Number.isFinite(value)) return 0
    return Math.round((value + Number.EPSILON) * 100) / 100
}

export const calculateBasePriceFromMarkup = (cost: number, markup: number, markupType: ProductMarkupType) => {
    if (cost <= 0 || markup < 0) return 0

    if (markupType === "percentage") {
        if (!isValidMarginPercentage(markup)) return 0
        return roundGeneratedBasePrice(cost / (1 - (markup / 100)))
    }

    if (markupType === "fixed") {
        return roundGeneratedBasePrice(cost + markup)
    }

    return roundGeneratedBasePrice(cost * markup)
}

export const calculateMarkupFromProfitMargin = (profitMargin: number, markupType: ProductMarkupType, cost: number) => {
    const safeProfitMargin = clampNonNegative(profitMargin)

    if (markupType === "percentage") {
        return safeProfitMargin
    }

    if (!isValidMarginPercentage(safeProfitMargin)) {
        return 0
    }

    const denominator = 1 - (safeProfitMargin / 100)
    if (denominator <= 0) {
        return 0
    }

    if (markupType === "fixed") {
        if (cost <= 0) return 0
        return (cost / denominator) - cost
    }

    return 1 / denominator
}

export const calculateProfitMarginFromMarkup = (
    markup: number,
    markupType: ProductMarkupType,
    cost: number,
    basePrice: number
) => {
    const safeMarkup = clampNonNegative(markup)

    if (markupType === "percentage") {
        return safeMarkup
    }

    if (cost <= 0 || basePrice <= 0) {
        return null
    }

    return (1 - (cost / basePrice)) * 100
}

export const resolveInitialMarkup = (product: ProductDto, markupType: ProductMarkupType) => {
    if (product.markup != null) {
        return product.markup
    }

    const safeCost = product.costPrice ?? 0
    if (safeCost <= 0) {
        return markupType === "multiplier" ? 1 : 0
    }

    if (markupType === "percentage") {
        return product.basePrice > 0 ? (1 - (safeCost / product.basePrice)) * 100 : 0
    }

    if (markupType === "fixed") {
        return product.basePrice - safeCost
    }

    return product.basePrice / safeCost
}
