import { v4 as uuidv4 } from 'uuid';
import {
  BookingRequest,
  BookingResult,
  BookingStatus,
  PaymentResult,
  PricingBreakdown,
  PricingContext,
} from '../interfaces';
import { PricingService } from './PricingService';
import { DiscountService } from './DiscountService';
import { LoyaltyService } from './LoyaltyService';

/**
 * Orchestrates the full booking lifecycle:
 *   1. Resolve promo codes and determine season
 *   2. Calculate final price (seasonal + loyalty/promo adjustments)
 *   3. Attempt payment
 *   4. Confirm or reject the booking
 *
 * Pricing must always be computed before payment is attempted.
 * A booking is only persisted on successful payment.
 */
export class BookingService {
  private pricingService: PricingService;
  private discountService: DiscountService;
  private loyaltyService: LoyaltyService;

  /** In-memory booking store — simulates a confirmed-bookings table */
  private bookings: Map<string, BookingResult> = new Map();

  constructor() {
    this.pricingService = new PricingService();
    this.discountService = new DiscountService();
    this.loyaltyService = new LoyaltyService();
  }

  // ─── Pricing pipeline ────────────────────────────────────────────────────

  /**
   * Computes the final adjusted price for a booking by sequentially applying:
   *   1. Seasonal multiplier (peak or off-peak)
   *   2. Loyalty discount (if eligible and no promo code present)
   *   3. Promotional discount (mutually exclusive with loyalty)
   *   4. Global discount cap ($200 maximum)
   *
   * Returns a full pricing breakdown for audit and display purposes.
   *
   * BUG (order of operations): The loyalty discount is calculated against the
   * raw basePrice before the seasonal multiplier has been applied. It should
   * be computed against priceAfterSeasonal so that the discount correctly
   * reflects a percentage of the adjusted rate rather than the lower base rate.
   */
  applyFinalPricing(context: PricingContext): PricingBreakdown {
    const { basePrice, season, loyaltyTier, hasPromoCode, promoDiscountRate } = context;

    const seasonalMultiplier = this.pricingService.getSeasonalMultiplier(season);

    // Apply the seasonal multiplier to derive the adjusted room rate
    const priceAfterSeasonal = this.pricingService.applySeasonalPricing(basePrice, season);

    // Loyalty discount is calculated against the season-adjusted price so that
    // the percentage reflects what the guest is actually being charged.
    const loyaltyDiscount = this.loyaltyService.calculateLoyaltyDiscount(
      priceAfterSeasonal,
      loyaltyTier,
      season,
    );

    // Promo and loyalty discounts are mutually exclusive — promo is only
    // considered when no loyalty discount is active on this booking.
    let promoDiscount = 0;
    if (hasPromoCode && promoDiscountRate > 0 && loyaltyDiscount === 0) {
      promoDiscount = this.discountService.calculatePromoDiscount(
        priceAfterSeasonal,
        promoDiscountRate,
      );
    }

    // Combine discount sources and apply the global cap
    const rawDiscount = loyaltyDiscount + promoDiscount;
    const totalDiscount = this.discountService.enforceDiscountCap(rawDiscount);

    const finalPrice = parseFloat(
      Math.max(priceAfterSeasonal - totalDiscount, 0).toFixed(2),
    );

    return {
      basePrice,
      seasonalMultiplier,
      priceAfterSeasonal,
      loyaltyDiscount,
      promoDiscount,
      totalDiscount,
      finalPrice,
    };
  }

  // ─── Booking flow ─────────────────────────────────────────────────────────

  /**
   * Creates a new booking for the given request.
   *
   * Flow:
   *  1. Resolve promo code (warn and ignore if invalid)
   *  2. Determine season from check-in date
   *  3. Compute final price via applyFinalPricing()
   *  4. Attempt payment — booking is only confirmed on success
   */
  async createBooking(request: BookingRequest): Promise<BookingResult> {
    const { roomId, guestId, checkIn, checkOut, baseRoomPrice, loyaltyTier, promoCode } =
      request;

    // Resolve promotional code if one was supplied
    let promoDiscountRate = 0;
    if (promoCode) {
      promoDiscountRate = this.discountService.resolvePromoCode(promoCode);
      if (promoDiscountRate === 0) {
        console.warn(`[BookingService] Promo code "${promoCode}" is invalid or expired — ignoring.`);
      }
    }

    // Derive season from the guest's check-in date
    const season = this.pricingService.determineSeason(checkIn);

    const pricingContext: PricingContext = {
      basePrice: baseRoomPrice,
      season,
      loyaltyTier,
      hasPromoCode: promoDiscountRate > 0,
      promoDiscountRate,
    };

    // Pricing must be finalised before any payment attempt
    const pricing = this.applyFinalPricing(pricingContext);

    const bookingId = uuidv4();

    // Attempt payment via the gateway; booking status depends on outcome
    const payment = await this.processPayment(bookingId, pricing.finalPrice);

    if (!payment.success) {
      return {
        bookingId,
        guestId,
        roomId,
        checkIn,
        checkOut,
        pricing,
        status: BookingStatus.Failed,
        message: `Payment declined for transaction ${payment.transactionId}. Please retry or use a different payment method.`,
      };
    }

    const confirmedBooking: BookingResult = {
      bookingId,
      guestId,
      roomId,
      checkIn,
      checkOut,
      pricing,
      status: BookingStatus.Confirmed,
      message: `Booking confirmed. Transaction ID: ${payment.transactionId}`,
    };

    this.bookings.set(bookingId, confirmedBooking);
    return confirmedBooking;
  }

  // ─── Payment simulation ───────────────────────────────────────────────────

  /**
   * Simulates a payment gateway call (Stripe / Adyen in production).
   * Intentionally fails ~10% of calls to test the failure path.
   */
  private async processPayment(bookingId: string, amount: number): Promise<PaymentResult> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    const success = Math.random() > 0.1;
    return {
      success,
      transactionId: `TXN-${bookingId.slice(0, 8).toUpperCase()}`,
      amount,
    };
  }

  // ─── Query helpers ────────────────────────────────────────────────────────

  /** Retrieves a confirmed booking by ID, or undefined if not found. */
  getBooking(bookingId: string): BookingResult | undefined {
    return this.bookings.get(bookingId);
  }

  /** Lists all confirmed bookings associated with a given guest ID. */
  getGuestBookings(guestId: string): BookingResult[] {
    return Array.from(this.bookings.values()).filter(
      (b) => b.guestId === guestId && b.status === BookingStatus.Confirmed,
    );
  }
}
