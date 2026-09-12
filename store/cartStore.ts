
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
    productId: string;
    productName: string;
    productNameAr?: string;
    imageUrl?: string;
    quantity: number;
    price: number;
    originalPrice?: number;
    selectedOptionId?: string;
    optionName?: string;
    optionNameAr?: string;
    notes?: string;
    /**
     * Set only on a line that belongs to a bundle offer. It is the offer's id, and it is the
     * ONLY thing the API is told about the offer — order intake re-derives the line price
     * from the offer itself, so this value can never lower what the shopper is charged.
     */
    offerLineId?: number;
    offerName?: string;
    offerNameAr?: string;
    /** Units of this product in ONE copy of the bundle. Makes the copy count exact. */
    offerUnitQuantity?: number;
    modifiers?: {
        modifierId?: string;
        modifierName: string;
        modifierNameAr?: string;
        price: number;
        quantity?: number;
    }[];
}

interface CartStore {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (productId: string, modifiers?: CartItem["modifiers"], selectedOptionId?: string, offerLineId?: number) => void;
    updateQuantity: (productId: string, quantity: number, modifiers?: CartItem["modifiers"], selectedOptionId?: string, offerLineId?: number) => void;
    /** Adds one complete copy of a bundle; an offer already in the cart gains a copy. */
    addOffer: (lines: CartItem[]) => void;
    /** Removes every line of one bundle at once — a half bundle is not orderable. */
    removeOffer: (offerLineId: number) => void;
    /** Scales every line of a bundle to `copies` complete copies, or removes it at zero. */
    setOfferCopies: (offerLineId: number, copies: number) => void;
    clearCart: () => void;
    totalAmount: () => number;
    itemCount: () => number;
}

/**
 * What makes two cart lines the same line. The offer id is part of it because the same
 * product can legitimately sit in the cart twice — once at its normal price and once inside
 * a bundle — and merging those two would charge the wrong amount for one of them.
 */
function isSameLine(
    item: CartItem,
    productId: string,
    modifiers: CartItem["modifiers"],
    selectedOptionId?: string,
    offerLineId?: number,
): boolean {
    return item.productId === productId
        && item.selectedOptionId === selectedOptionId
        && item.offerLineId === offerLineId
        && JSON.stringify(item.modifiers) === JSON.stringify(modifiers);
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            addToCart: (newItem) => set((state) => {
                const existingItemIndex = state.items.findIndex(
                    item => isSameLine(item, newItem.productId, newItem.modifiers, newItem.selectedOptionId, newItem.offerLineId)
                );

                if (existingItemIndex > -1) {
                    const updatedItems = [...state.items];
                    updatedItems[existingItemIndex].quantity += newItem.quantity;
                    return { items: updatedItems };
                }

                return { items: [...state.items, newItem] };
            }),
            removeFromCart: (productId, modifiers, selectedOptionId, offerLineId) => set((state) => ({
                items: state.items.filter(item =>
                    !isSameLine(item, productId, modifiers, selectedOptionId, offerLineId)
                )
            })),
            updateQuantity: (productId, quantity, modifiers, selectedOptionId, offerLineId) => set((state) => {
                if (quantity <= 0) {
                    return {
                        items: state.items.filter(item =>
                            !isSameLine(item, productId, modifiers, selectedOptionId, offerLineId)
                        )
                    };
                }

                return {
                    items: state.items.map(item =>
                        isSameLine(item, productId, modifiers, selectedOptionId, offerLineId)
                            ? { ...item, quantity }
                            : item
                    )
                };
            }),
            // A bundle enters and leaves the cart whole. Its lines carry the per-line
            // quantities the offer defines, so one more copy means one more of each.
            addOffer: (lines) => set((state) => {
                const offerLineId = lines[0]?.offerLineId;
                if (offerLineId == null || lines.length === 0) return state;
                const present = state.items.some(item => item.offerLineId === offerLineId);
                if (!present) return { items: [...state.items, ...lines] };

                return {
                    items: state.items.map(item =>
                        item.offerLineId === offerLineId
                            ? { ...item, quantity: item.quantity + (item.offerUnitQuantity ?? item.quantity) }
                            : item
                    )
                };
            }),
            removeOffer: (offerLineId) => set((state) => ({
                items: state.items.filter(item => item.offerLineId !== offerLineId),
            })),
            setOfferCopies: (offerLineId, copies) => set((state) => {
                const lines = state.items.filter(item => item.offerLineId === offerLineId);
                if (lines.length === 0) return state;
                if (copies <= 0) return { items: state.items.filter(item => item.offerLineId !== offerLineId) };

                // Each line knows its per-copy quantity, so N copies is an exact multiplication
                // rather than something inferred from the quantities already in the cart.
                return {
                    items: state.items.map(item =>
                        item.offerLineId === offerLineId
                            ? { ...item, quantity: (item.offerUnitQuantity ?? item.quantity) * copies }
                            : item
                    )
                };
            }),
            clearCart: () => set({ items: [] }),
            totalAmount: () => {
                const items = get().items;
                return items.reduce((total, item) => {
                    const itemTotal = item.price * item.quantity;
                    const modifiersTotal = (item.modifiers || [])
                        .reduce((sum, modifier) => sum + modifier.price * (modifier.quantity ?? 1), 0)
                        * item.quantity;
                    return total + itemTotal + modifiersTotal;
                }, 0);
            },
            itemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            }
        }),
        {
            name: 'restaurant-cart-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
