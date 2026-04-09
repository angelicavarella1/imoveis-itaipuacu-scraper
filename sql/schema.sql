CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  location TEXT NOT NULL,
  bedrooms INT,
  bathrooms INT,
  area NUMERIC(8,2),
  url TEXT UNIQUE NOT NULL,
  image_urls TEXT[],
  posted_date DATE,
  source TEXT NOT NULL DEFAULT 'olx-itaipuacu',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_url ON listings(url);
CREATE INDEX IF NOT EXISTS idx_listings_scraped ON listings(scraped_at DESC);
