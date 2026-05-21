import { Season } from '../interfaces';

/**
 * Handles seasonal pricing adjustments based on hotel occupancy patterns.
 *
 * Peak periods:
 *  - Summer:  June 1 – August 31
 *  - Winter:  December 20 – January 5
 *
 * All other dates fall into the off-peak window.
 */
export class PricingService {
  private static readonly PEAK_MULTIPLIER = 1.3;
  private static readonly OFF_PEAK_MULTIPLIER = 0.9;

  /**
   * Infers the season from the guest's check-in date.
   * Used upstream so the caller does not need to pass a hardcoded season.
   */
  determineSeason(checkIn: Date): Season {
    const month = checkIn.getMonth() + 1; // convert to 1-based
    const day = checkIn.getDate();

    const isSummerPeak = month >= 6 && month <= 8;
    const isWinterPeak = (month === 12 && day >= 20) || (month === 1 && day <= 5);

    return isSummerPeak || isWinterPeak ? Season.Peak : Season.OffPeak;
  }

  /**
   * Applies the appropriate seasonal multiplier to a base price.
   *
   * Peak season:    basePrice × 1.3
   * Off-peak season: basePrice × 0.9
   *
   * @throws if basePrice is not a positive number
   */
  applySeasonalPricing(basePrice: number, season: Season): number {
    if (basePrice <= 0) {
      throw new Error(`Invalid base price: ${basePrice}. Must be a positive value.`);
    }

    const multiplier = this.getSeasonalMultiplier(season);
    return parseFloat((basePrice * multiplier).toFixed(2));
  }

  /** Returns the raw multiplier for the given season (useful for breakdown reports). */
  getSeasonalMultiplier(season: Season): number {
    return season === Season.Peak
      ? PricingService.PEAK_MULTIPLIER
      : PricingService.OFF_PEAK_MULTIPLIER;
  }
}
