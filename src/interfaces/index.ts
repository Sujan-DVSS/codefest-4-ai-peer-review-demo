// ─── Enumerations ────────────────────────────────────────────────────────────

export enum Season {
  Peak = 'peak',
  OffPeak = 'off-peak',
}

export enum LoyaltyTier {
  None = 'none',
  Gold = 'gold',
  Platinum = 'platinum',
}

export enum BookingStatus {
  Confirmed = 'confirmed',
  Failed = 'failed',
  Pending = 'pending',
}

// ─── Request / Response contracts ────────────────────────────────────────────

export interface BookingRequest {
  /** Unique identifier for the room being booked */
  roomId: string;
  /** Guest identifier (maps to loyalty profile) */
  guestId: string;
  checkIn: Date;
  checkOut: Date;
  /** Nightly room rate before any adjustments */
  baseRoomPrice: number;
  loyaltyTier: LoyaltyTier;
  /** Optional promotional code supplied at checkout */
  promoCode?: string;
}

export interface PricingContext {
  basePrice: number;
  season: Season;
  loyaltyTier: LoyaltyTier;
  /** Whether a valid promo code was supplied */
  hasPromoCode: boolean;
  /** Fractional discount rate from the promo code (e.g. 0.20 for 20%) */
  promoDiscountRate: number;
  /** Guest's requested check-in date — used for early bird eligibility */
  checkIn: Date;
  /** Date the booking was made — used to calculate days until check-in */
  bookingDate: Date;
}

export interface PricingBreakdown {
  basePrice: number;
  seasonalMultiplier: number;
  priceAfterSeasonal: number;
  loyaltyDiscount: number;
  promoDiscount: number;
  /** Dollar saving from the early bird promotion (0 if not applicable) */
  earlyBirdDiscount: number;
  totalDiscount: number;
  finalPrice: number;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
}

export interface BookingResult {
  bookingId: string;
  guestId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  pricing: PricingBreakdown;
  status: BookingStatus;
  message: string;
}
