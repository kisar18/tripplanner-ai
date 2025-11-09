export interface Trip {
  id: number;
  city: string;
  days: number;
  // itinerary is now always a string (backend stores it as String column)
  itinerary: string;
}
