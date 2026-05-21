import { LoyaltyTier, Season } from '../interfaces';

/**
 * Calculates loyalty programme discounts based on member tier and booking season.
 *
 * Tier entitlements (per business rules):
 *  - Gold     → 10% discount, applicable during off-peak season only
 *  - Platinum → 15% discount, applicable year-round regardless of season
 *  - None     → no loyalty discount
 *
 * Loyalty discounts are mutually exclusive with promotional codes.
 * That exclusivity is enforced at the BookingService layer.
 */
export class LoyaltyService {
  private static readonly GOLD_DISCOUNT_RATE = 0.10;
  private static readonly PLATINUM_DISCOUNT_RATE = 0.15;

  /**
   * Calculates the dollar value of the loyalty discount for a booking.
   *
   * @param price   - price to calculate the discount against
   * @param tier    - the guest's loyalty membership tier
   * @param season  - the season derived from the check-in date
   * @returns dollar discount amount (0 if no discount applies)
   */
  calculateLoyaltyDiscount(price: number, tier: LoyaltyTier, season: Season): number {
    if (price <= 0) return 0;

    switch (tier) {
      case LoyaltyTier.Platinum:
        // Platinum members receive their 15% benefit in all seasons
        return parseFloat((price * LoyaltyService.PLATINUM_DISCOUNT_RATE).toFixed(2));

      case LoyaltyTier.Gold: {
        // Gold members are entitled to a 10% discount during off-peak periods only.
        // BUG: condition uses !== instead of ===, so the discount is incorrectly
        // applied during peak season and withheld during off-peak — the opposite
        // of the intended business rule.
        if (season !== Season.OffPeak) {
          return parseFloat((price * LoyaltyService.GOLD_DISCOUNT_RATE).toFixed(2));
        }
        return 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Returns a human-readable summary of a tier's entitlements.
   * Used for guest-facing booking confirmation emails.
   */
  describeBenefits(tier: LoyaltyTier): string {
    switch (tier) {
      case LoyaltyTier.Gold:
        return 'Gold Member: 10% discount on off-peak bookings, priority check-in';
      case LoyaltyTier.Platinum:
        return 'Platinum Member: 15% year-round discount, suite upgrade eligibility, late checkout';
      default:
        return 'Standard member: no loyalty discounts applicable';
    }
  }
}
