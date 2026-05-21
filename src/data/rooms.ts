export interface Room {
  id: string;
  name: string;
  type: 'standard' | 'deluxe' | 'suite';
  description: string;
  basePrice: number;
  capacity: number;
  amenities: string[];
  /** CSS gradient used as the room card image */
  gradient: string;
}

export const rooms: Room[] = [
  {
    id: 'STANDARD-110',
    name: 'Classic Room',
    type: 'standard',
    description: 'Comfortable city-view room with modern amenities, ideal for business or leisure stays.',
    basePrice: 200,
    capacity: 2,
    amenities: ['Free WiFi', 'Smart TV', 'Mini Bar', 'City View'],
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'STANDARD-205',
    name: 'Superior Room',
    type: 'standard',
    description: 'Spacious room with tranquil garden views and a dedicated work area.',
    basePrice: 180,
    capacity: 2,
    amenities: ['Free WiFi', 'Smart TV', 'Work Desk', 'Garden View'],
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'DELUXE-102',
    name: 'Deluxe Room',
    type: 'deluxe',
    description: 'Elegantly appointed room with premium furnishings, king bed, and pool access.',
    basePrice: 250,
    capacity: 2,
    amenities: ['Free WiFi', '55" OLED TV', 'Pool Access', 'Marble Bathroom', 'King Bed'],
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    id: 'SUITE-301',
    name: 'Grand Suite',
    type: 'suite',
    description: 'Luxurious suite with a separate living area, Jacuzzi, and panoramic skyline views.',
    basePrice: 400,
    capacity: 3,
    amenities: ['Butler Service', 'Jacuzzi', 'Panoramic View', 'Living Room', 'Champagne'],
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 'SUITE-405',
    name: 'Presidential Suite',
    type: 'suite',
    description: 'The pinnacle of luxury — a full-floor suite with private terrace and personal chef.',
    basePrice: 1500,
    capacity: 6,
    amenities: ['Private Chef', 'Rooftop Terrace', 'Home Theater', 'Spa Room', 'Limousine'],
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  },
];
