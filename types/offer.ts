export interface OfferProductDto {
  productId: string;
  name: string;
  nameAr: string;
  description?: string | null;
  descriptionAr?: string | null;
  calories?: number | null;
  allergens: number;
  quantity: number;
  price: number;
  // Public-menu hint for product badges inside an offer. Availability is
  // decided by the offer schedule, not by hiding the whole bundle.
  isSoon?: boolean;
}

export interface OfferResponseDto {
  id: number;
  name: string;
  nameAr: string;
  description?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  discountType: number;
  discountValue: number;
  finalPrice: number;
  originalTotal: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isAvailableNow: boolean;
  products: OfferProductDto[];
}

export interface OfferProductItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateOfferRequest {
  name: string;
  nameAr: string;
  description?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  discountType: number;
  discountValue: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  products: OfferProductItemRequest[];
}
