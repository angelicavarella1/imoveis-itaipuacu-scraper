// PropertyListing: campos obrigatórios sem undefined, opcionais com ?
export interface PropertyListing {
  id?: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  url: string;
  imageUrls: string[];
  postedDate: Date | null;
  source: string;
  scrapedAt: Date;
}

// RawPropertyData: todos opcionais, mas sem "undefined" explícito no tipo
export type RawPropertyData = {
  title?: string;
  price?: number;
  location?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  url?: string;
  imageUrls?: string[];
  postedDate?: Date | null;
  source?: string;
  priceRaw?: string;
  areaRaw?: string;
  postedDateRaw?: string;
};

export interface ScraperStats {
  total: number;
  inserted: number;
  skipped: number;
  errors: number;
  duration?: number;
}
