import { BookingService } from './services/BookingService';
import { LoyaltyTier } from './interfaces';

/**
 * Demo runner exercising the Dynamic Pricing & Loyalty Discount Engine
 * across representative booking scenarios.
 */
async function runDemo(): Promise<void> {
  const bookingService = new BookingService();

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     ReviewIQ — Hotel Booking Engine Demo         ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 1: Peak season · Platinum member · no promo
  // Expected: base $400 → ×1.3 = $520 → 15% off $520 = $78 discount → $442
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Scenario 1: Peak Season · Platinum Member ───────');
  const booking1 = await bookingService.createBooking({
    roomId: 'SUITE-301',
    guestId: 'GUEST-001',
    checkIn: new Date('2026-07-15'),
    checkOut: new Date('2026-07-20'),
    baseRoomPrice: 400,
    loyaltyTier: LoyaltyTier.Platinum,
  });
  printBooking(booking1);

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 2: Off-peak · Gold member · no promo
  // Expected: base $250 → ×0.9 = $225 → 10% off $225 = $22.50 discount → $202.50
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Scenario 2: Off-Peak Season · Gold Member ───────');
  const booking2 = await bookingService.createBooking({
    roomId: 'DELUXE-102',
    guestId: 'GUEST-002',
    checkIn: new Date('2026-02-10'),
    checkOut: new Date('2026-02-14'),
    baseRoomPrice: 250,
    loyaltyTier: LoyaltyTier.Gold,
  });
  printBooking(booking2);

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 3: Peak season · no loyalty · promo SUMMER20 (20% off)
  // Expected: base $180 → ×1.3 = $234 → 20% off $234 = $46.80 discount → $187.20
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Scenario 3: Peak Season · No Loyalty · Promo SUMMER20 ──');
  const booking3 = await bookingService.createBooking({
    roomId: 'STANDARD-205',
    guestId: 'GUEST-003',
    checkIn: new Date('2026-08-01'),
    checkOut: new Date('2026-08-05'),
    baseRoomPrice: 180,
    loyaltyTier: LoyaltyTier.None,
    promoCode: 'SUMMER20',
  });
  printBooking(booking3);

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 4: Off-peak · Platinum member · promo FLASH25 supplied
  // Promo should be suppressed because loyalty discount is active.
  // Expected: base $1500 → ×0.9 = $1350 → 15% off $1350 = $202.50 → capped at $200 → $1150
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Scenario 4: Off-Peak · Platinum + Promo (promo blocked) ──');
  const booking4 = await bookingService.createBooking({
    roomId: 'SUITE-405',
    guestId: 'GUEST-004',
    checkIn: new Date('2026-03-20'),
    checkOut: new Date('2026-03-25'),
    baseRoomPrice: 1500,
    loyaltyTier: LoyaltyTier.Platinum,
    promoCode: 'FLASH25',
  });
  printBooking(booking4);

  // ─────────────────────────────────────────────────────────────────────────
  // Scenario 5: Off-peak · Gold member · invalid promo code
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Scenario 5: Off-Peak · Gold Member · Invalid Promo ──');
  const booking5 = await bookingService.createBooking({
    roomId: 'STANDARD-110',
    guestId: 'GUEST-005',
    checkIn: new Date('2026-10-05'),
    checkOut: new Date('2026-10-08'),
    baseRoomPrice: 200,
    loyaltyTier: LoyaltyTier.Gold,
    promoCode: 'EXPIRED99',
  });
  printBooking(booking5);
}

function printBooking(booking: object): void {
  console.log(JSON.stringify(booking, null, 2));
  console.log();
}

runDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
