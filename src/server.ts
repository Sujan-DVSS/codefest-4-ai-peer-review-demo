import express, { Request, Response } from 'express';
import path from 'path';
import { BookingService } from './services/BookingService';
import { PricingService } from './services/PricingService';
import { DiscountService } from './services/DiscountService';
import { LoyaltyTier, PricingContext } from './interfaces';
import { rooms } from './data/rooms';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Service instances ────────────────────────────────────────────────────────
const bookingService = new BookingService();
const pricingService = new PricingService();
const discountService = new DiscountService();

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Returns the full room catalog */
app.get('/api/rooms', (_req: Request, res: Response) => {
  res.json(rooms);
});

/**
 * Calculates a price breakdown without creating a booking.
 * Used by the UI to show live pricing as the guest changes their options.
 */
app.post('/api/price-preview', (req: Request, res: Response) => {
  const { baseRoomPrice, checkIn, loyaltyTier, promoCode } = req.body;

  if (!baseRoomPrice || !checkIn || !loyaltyTier) {
    res.status(400).json({ error: 'baseRoomPrice, checkIn, and loyaltyTier are required.' });
    return;
  }

  const checkInDate = new Date(checkIn as string);
  if (isNaN(checkInDate.getTime())) {
    res.status(400).json({ error: 'Invalid checkIn date.' });
    return;
  }

  const numericPrice = Number(baseRoomPrice);
  if (numericPrice <= 0) {
    res.status(400).json({ error: 'baseRoomPrice must be a positive number.' });
    return;
  }

  let promoDiscountRate = 0;
  if (promoCode) {
    promoDiscountRate = discountService.resolvePromoCode(String(promoCode));
  }

  const season = pricingService.determineSeason(checkInDate);

  const context: PricingContext = {
    basePrice: numericPrice,
    season,
    loyaltyTier: loyaltyTier as LoyaltyTier,
    hasPromoCode: promoDiscountRate > 0,
    promoDiscountRate,
    checkIn: checkInDate,
    bookingDate: new Date(),
  };

  try {
    const pricing = bookingService.applyFinalPricing(context);
    res.json({ season, pricing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pricing calculation failed.';
    res.status(500).json({ error: message });
  }
});

/**
 * Guest booking history lookup.
 * Defined before /:id to prevent Express matching "guest" as a booking ID.
 */
app.get('/api/bookings/guest/:guestId', (req: Request, res: Response) => {
  const bookings = bookingService.getGuestBookings(req.params.guestId);
  res.json(bookings);
});

/** Creates a new booking and returns the result (confirmed or failed) */
app.post('/api/bookings', async (req: Request, res: Response) => {
  const { roomId, guestId, checkIn, checkOut, baseRoomPrice, loyaltyTier, promoCode } = req.body;

  if (!roomId || !guestId || !checkIn || !checkOut || !baseRoomPrice || !loyaltyTier) {
    res.status(400).json({ error: 'Missing required booking fields.' });
    return;
  }

  try {
    const result = await bookingService.createBooking({
      roomId: String(roomId),
      guestId: String(guestId),
      checkIn: new Date(checkIn as string),
      checkOut: new Date(checkOut as string),
      baseRoomPrice: Number(baseRoomPrice),
      loyaltyTier: loyaltyTier as LoyaltyTier,
      promoCode: promoCode ? String(promoCode) : undefined,
    });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Booking creation failed.';
    res.status(500).json({ error: message });
  }
});

/** Retrieves a single booking by ID */
app.get('/api/bookings/:id', (req: Request, res: Response) => {
  const booking = bookingService.getBooking(req.params.id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  res.json(booking);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   ReviewIQ Grand Hotel — Booking Engine     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n   Server running at http://localhost:${PORT}\n`);
});
