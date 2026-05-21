/**
 * Manages promotional discount codes and enforces the global discount ceiling.
 *
 * Business rules enforced here:
 *  - Each promo code maps to a fixed percentage discount
 *  - Discount cap: no single booking may receive more than $200 off regardless of source
 */
export class DiscountService {
  /**
   * Maximum combined discount allowed on any single booking.
   * Applies to loyalty + promo discounts in aggregate.
   */
  private static readonly MAX_DISCOUNT_AMOUNT = 200;

  /**
   * Registry of active promotional codes and their fractional discount rates.
   * In production this would be fetched from a promotions DB with expiry dates.
   */
  private static readonly PROMO_CODES: Record<string, number> = {
    SUMMER20: 0.20,
    LOYALTY10: 0.10,
    NEWGUEST15: 0.15,
    FLASH25: 0.25,
  };

  /**
   * Resolves a promo code string to its discount rate.
   * Code lookup is case-insensitive.
   *
   * @returns fractional rate (e.g. 0.20) or 0 if invalid / expired
   */
  resolvePromoCode(promoCode: string): number {
    const normalised = promoCode.trim().toUpperCase();
    return DiscountService.PROMO_CODES[normalised] ?? 0;
  }

  /**
   * Converts a fractional promo rate to a dollar discount amount
   * based on the price that is passed in (post-seasonal adjustment).
   */
  calculatePromoDiscount(price: number, promoRate: number): number {
    if (promoRate <= 0 || promoRate > 1) return 0;
    return parseFloat((price * promoRate).toFixed(2));
  }

  /**
   * Enforces the $200 maximum discount ceiling across all discount sources.
   * Any combined discount exceeding this threshold must be capped.
   *
   * @param discountAmount - the raw combined discount before capping
   * @returns the capped discount that should be applied to the booking
   */
  enforceDiscountCap(discountAmount: number): number {
    const cappedDiscount = Math.min(discountAmount, DiscountService.MAX_DISCOUNT_AMOUNT);
    return cappedDiscount;
  }
}
