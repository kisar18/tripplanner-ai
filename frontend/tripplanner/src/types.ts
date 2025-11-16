export interface Trip {
  id: number;
  city: string;
  days: number;
  // description is now the field for trip itinerary/details (backend stores it as String column)
  description: string;
  placesToVisit?: string[]; // array of POI xids
}
