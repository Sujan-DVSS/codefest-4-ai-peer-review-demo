/* global fetch, document, window */

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  rooms: [],
  selectedRoom: null,
  pricing: null,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const el = {
  roomsGrid:            () => document.getElementById('rooms-grid'),
  selectedRoomBanner:   () => document.getElementById('selected-room-banner'),
  checkIn:              () => document.getElementById('check-in'),
  checkOut:             () => document.getElementById('check-out'),
  guestId:              () => document.getElementById('guest-id'),
  loyaltyTier:          () => document.getElementById('loyalty-tier'),
  promoCode:            () => document.getElementById('promo-code'),
  bookBtn:              () => document.getElementById('book-btn'),
  bookingForm:          () => document.getElementById('booking-form'),
  pricingPlaceholder:   () => document.getElementById('pricing-placeholder'),
  pricingBreakdown:     () => document.getElementById('pricing-breakdown'),
  seasonBadge:          () => document.getElementById('season-badge'),
  pricingRows:          () => document.getElementById('pricing-rows'),
  totalAmount:          () => document.getElementById('total-amount'),
  pricingNote:          () => document.getElementById('pricing-note'),
  modalOverlay:         () => document.getElementById('modal-overlay'),
  modalContent:         () => document.getElementById('modal-content'),
  modalClose:           () => document.getElementById('modal-close'),
  historyGuestId:       () => document.getElementById('history-guest-id'),
  historySearchBtn:     () => document.getElementById('history-search-btn'),
  historyResults:       () => document.getElementById('history-results'),
};

// ─── Initialisation ───────────────────────────────────────────────────────────
async function init() {
  setDefaultDates();
  await loadRooms();
  attachEventListeners();
}

function setDefaultDates() {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const threeDays = addDays(today, 3);

  el.checkIn().min = toISODate(today);
  el.checkIn().value = toISODate(tomorrow);
  el.checkOut().min = toISODate(tomorrow);
  el.checkOut().value = toISODate(threeDays);
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    state.rooms = await res.json();
    renderRooms();
  } catch {
    el.roomsGrid().innerHTML = '<p style="text-align:center;color:#6b7280;padding:40px">Failed to load rooms. Is the server running?</p>';
  }
}

function renderRooms() {
  el.roomsGrid().innerHTML = state.rooms.map(room => `
    <div class="room-card" data-id="${room.id}">
      <div class="room-card-image" style="background: ${room.gradient}">
        <span class="room-type-badge">${room.type.toUpperCase()}</span>
      </div>
      <div class="room-card-body">
        <h3 class="room-name">${room.name}</h3>
        <p class="room-desc">${room.description}</p>
        <div class="room-amenities">
          ${room.amenities.slice(0, 3).map(a => `<span class="amenity-tag">${a}</span>`).join('')}
        </div>
        <div class="room-footer">
          <div class="room-price">
            <span class="price-amount">$${room.basePrice}</span>
            <span class="price-per">/night</span>
          </div>
          <span class="room-capacity">&#128100; ${room.capacity}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function selectRoom(roomId) {
  state.selectedRoom = state.rooms.find(r => r.id === roomId) ?? null;
  if (!state.selectedRoom) return;

  document.querySelectorAll('.room-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === roomId);
  });

  el.selectedRoomBanner().innerHTML = `
    <div class="selected-room-info">
      <span class="selected-room-dot"></span>
      <strong>${state.selectedRoom.name}</strong>
      <span>&mdash; $${state.selectedRoom.basePrice}/night base rate</span>
    </div>
  `;
  el.selectedRoomBanner().classList.add('active');

  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  schedulePricePreview();
}

// ─── Price Preview ────────────────────────────────────────────────────────────
let previewTimer = null;

function schedulePricePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(fetchPricePreview, 350);
}

async function fetchPricePreview() {
  if (!state.selectedRoom || !el.checkIn().value || !el.checkOut().value) return;

  try {
    const res = await fetch('/api/price-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseRoomPrice: state.selectedRoom.basePrice,
        checkIn: el.checkIn().value,
        loyaltyTier: el.loyaltyTier().value,
        promoCode: el.promoCode().value.trim() || undefined,
      }),
    });

    if (!res.ok) return;

    const { season, pricing } = await res.json();
    state.pricing = pricing;
    renderPricingBreakdown(season, pricing);
    el.bookBtn().disabled = false;
  } catch {
    /* silently fail — user can still submit the form */
  }
}

function renderPricingBreakdown(season, pricing) {
  el.pricingPlaceholder().classList.add('hidden');
  el.pricingBreakdown().classList.remove('hidden');

  const isPeak = season === 'peak';
  el.seasonBadge().textContent = isPeak ? '🌅 Peak Season' : '🍂 Off-Peak Season';
  el.seasonBadge().className = `season-badge ${isPeak ? 'peak' : 'offpeak'}`;

  const nights = calcNights(el.checkIn().value, el.checkOut().value);

  el.pricingRows().innerHTML = `
    <div class="pricing-row">
      <span>Base rate (per night)</span>
      <span>$${fmt(pricing.basePrice)}</span>
    </div>
    <div class="pricing-row">
      <span>Seasonal multiplier (&times;${pricing.seasonalMultiplier})</span>
      <span>$${fmt(pricing.priceAfterSeasonal)}</span>
    </div>
    ${pricing.loyaltyDiscount > 0 ? `
    <div class="pricing-row discount">
      <span>Loyalty discount</span>
      <span>&minus;$${fmt(pricing.loyaltyDiscount)}</span>
    </div>` : ''}
    ${pricing.promoDiscount > 0 ? `
    <div class="pricing-row discount">
      <span>Promo discount</span>
      <span>&minus;$${fmt(pricing.promoDiscount)}</span>
    </div>` : ''}
    ${pricing.earlyBirdDiscount > 0 ? `
    <div class="pricing-row discount">
      <span>Early Bird discount (10%)</span>
      <span>&minus;$${fmt(pricing.earlyBirdDiscount)}</span>
    </div>` : ''}
    ${nights > 1 ? `
    <div class="pricing-row muted">
      <span>${nights} nights &times; $${fmt(pricing.finalPrice)}</span>
      <span>$${fmt(nights * pricing.finalPrice)}</span>
    </div>` : ''}
  `;

  el.totalAmount().textContent = nights > 1
    ? `$${fmt(nights * pricing.finalPrice)}`
    : `$${fmt(pricing.finalPrice)}`;

  if (pricing.loyaltyDiscount > 0 && pricing.promoDiscount === 0) {
    el.pricingNote().textContent = '✓ Loyalty discount applied. Promo codes are unavailable when a loyalty discount is active.';
  } else if (pricing.promoDiscount > 0) {
    el.pricingNote().textContent = '✓ Promotional discount applied.';
  } else if (pricing.earlyBirdDiscount > 0) {
    el.pricingNote().textContent = '✓ Early Bird discount applied — you are booking 30+ days in advance.';
  } else {
    el.pricingNote().textContent = '';
  }
}

// ─── Booking Submission ───────────────────────────────────────────────────────
async function submitBooking(e) {
  e.preventDefault();

  if (!state.selectedRoom) {
    alert('Please select a room first.');
    return;
  }

  const btn = el.bookBtn();
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: state.selectedRoom.id,
        guestId: el.guestId().value.trim(),
        checkIn: el.checkIn().value,
        checkOut: el.checkOut().value,
        baseRoomPrice: state.selectedRoom.basePrice,
        loyaltyTier: el.loyaltyTier().value,
        promoCode: el.promoCode().value.trim() || undefined,
      }),
    });

    const booking = await res.json();
    showConfirmationModal(booking);
  } catch {
    alert('Booking request failed. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Book';
  }
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function showConfirmationModal(booking) {
  const isConfirmed = booking.status === 'confirmed';
  const nights = calcNights(
    new Date(booking.checkIn).toISOString().split('T')[0],
    new Date(booking.checkOut).toISOString().split('T')[0],
  );

  el.modalContent().innerHTML = `
    <div class="modal-status ${isConfirmed ? 'success' : 'failed'}">
      <div class="modal-icon">${isConfirmed ? '✓' : '✗'}</div>
      <h2>${isConfirmed ? 'Booking Confirmed!' : 'Payment Failed'}</h2>
      <p>${booking.message}</p>
    </div>
    ${isConfirmed ? `
    <div class="modal-details">
      <div class="detail-row"><span>Booking ID</span><strong>${booking.bookingId.slice(0, 8).toUpperCase()}</strong></div>
      <div class="detail-row"><span>Room</span><strong>${booking.roomId}</strong></div>
      <div class="detail-row"><span>Guest</span><strong>${booking.guestId}</strong></div>
      <div class="detail-row"><span>Check-in</span><strong>${displayDate(booking.checkIn)}</strong></div>
      <div class="detail-row"><span>Check-out</span><strong>${displayDate(booking.checkOut)}</strong></div>
      <div class="detail-row"><span>Nights</span><strong>${nights}</strong></div>
      <div class="detail-row highlight">
        <span>Total Charged</span>
        <strong>$${fmt(nights * booking.pricing.finalPrice)}</strong>
      </div>
    </div>` : `
    <p class="modal-retry">Please check your payment details and try again.</p>`}
  `;

  el.modalOverlay().classList.remove('hidden');
}

// ─── Booking History ──────────────────────────────────────────────────────────
async function searchGuestHistory() {
  const guestId = el.historyGuestId().value.trim();
  if (!guestId) return;

  el.historyResults().innerHTML = '<p class="history-empty">Searching…</p>';

  try {
    const res = await fetch(`/api/bookings/guest/${encodeURIComponent(guestId)}`);
    const bookings = await res.json();
    renderHistory(bookings, guestId);
  } catch {
    el.historyResults().innerHTML = '<p class="history-empty">Failed to load history.</p>';
  }
}

function renderHistory(bookings, guestId) {
  if (!bookings.length) {
    el.historyResults().innerHTML = `
      <p class="history-empty">No confirmed bookings found for <strong>${guestId}</strong>.</p>`;
    return;
  }

  el.historyResults().innerHTML = `
    <p class="history-count">${bookings.length} confirmed booking(s) for <strong>${guestId}</strong></p>
    <div class="history-table-wrapper">
      <table class="history-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Room</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Base Rate</th>
            <th>Discount</th>
            <th>Final/Night</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td class="mono">${b.bookingId.slice(0, 8).toUpperCase()}</td>
              <td>${b.roomId}</td>
              <td>${displayDate(b.checkIn)}</td>
              <td>${displayDate(b.checkOut)}</td>
              <td>$${fmt(b.pricing.basePrice)}</td>
              <td class="${b.pricing.totalDiscount > 0 ? 'discount-cell' : ''}">
                ${b.pricing.totalDiscount > 0 ? `&minus;$${fmt(b.pricing.totalDiscount)}` : '&mdash;'}
              </td>
              <td class="final-price">$${fmt(b.pricing.finalPrice)}</td>
              <td><span class="status-badge ${b.status}">${b.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function attachEventListeners() {
  // Room card click via delegation
  el.roomsGrid().addEventListener('click', e => {
    const card = e.target.closest('.room-card');
    if (card) selectRoom(card.dataset.id);
  });

  // Booking form inputs → live price preview
  el.checkIn().addEventListener('change', () => {
    // Push check-out forward if it's no longer after check-in
    if (el.checkOut().value <= el.checkIn().value) {
      el.checkOut().value = toISODate(addDays(new Date(el.checkIn().value), 1));
    }
    el.checkOut().min = el.checkIn().value;
    schedulePricePreview();
  });
  el.checkOut().addEventListener('change', schedulePricePreview);
  el.loyaltyTier().addEventListener('change', schedulePricePreview);
  el.promoCode().addEventListener('input', schedulePricePreview);

  // Form submit
  el.bookingForm().addEventListener('submit', submitBooking);

  // Modal close
  el.modalClose().addEventListener('click', closeModal);
  el.modalOverlay().addEventListener('click', e => {
    if (e.target === el.modalOverlay()) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // History search
  el.historySearchBtn().addEventListener('click', searchGuestHistory);
  el.historyGuestId().addEventListener('keypress', e => {
    if (e.key === 'Enter') searchGuestHistory();
  });
}

function closeModal() {
  el.modalOverlay().classList.add('hidden');
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n).toFixed(2); }

function toISODate(date) { return date.toISOString().split('T')[0]; }

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function calcNights(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.round(ms / 86_400_000));
}

function displayDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
