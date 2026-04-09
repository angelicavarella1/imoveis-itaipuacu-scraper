import { z } from 'zod';
import type { RawPropertyData, PropertyListing } from '../types';

const PropertySchema = z.object({
  title: z.string().min(3),
  price: z.number().positive(),
  location: z.string().min(5),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  area: z.number().positive().nullable().optional(),
  url: z.string().url(),
  imageUrls: z.array(z.string().url()).optional().default([]),
  postedDate: z.date().nullable().optional(),
  source: z.string().optional().default('unknown'),
});

export function validateAndClean(raw: RawPropertyData): PropertyListing | null {
  const price = raw.price ?? (() => {
    if (!raw.priceRaw) return null;
    const match = raw.priceRaw.match(/[\d.,]+/);
    return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : null;
  })();

  const area = raw.area ?? (() => {
    if (!raw.areaRaw) return null;
    const match = raw.areaRaw.match(/[\d.,]+/);
    return match ? parseFloat(match[0].replace(/\./g, '').replace(',', '.')) : null;
  })();

  const parsed = {
    title: raw.title ?? '',
    price: price ?? 0,
    location: raw.location ?? '',
    bedrooms: raw.bedrooms ?? null,
    bathrooms: raw.bathrooms ?? null,
    area: area ?? null,
    url: raw.url ?? '',
    imageUrls: raw.imageUrls ?? [],
    postedDate: raw.postedDate ?? null,
    source: raw.source ?? 'unknown',
  };

  const result = PropertySchema.safeParse(parsed);
  if (!result.success) return null;
  
  const data = result.data;
  // Constrói PropertyListing SEM atribuir undefined explicitamente
  const listing: PropertyListing = {
    title: data.title,
    price: data.price,
    location: data.location,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    area: data.area ?? null,
    url: data.url,
    imageUrls: data.imageUrls,
    postedDate: data.postedDate ?? null,
    source: data.source,
    scrapedAt: new Date(),
  };
  // id é opcional, então só adiciona se existir
  if (raw.url) {
    listing.id = Buffer.from(raw.url).toString('base64url');
  }
  
  return listing;
}


