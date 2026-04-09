export const SELECTORS = {
  OLX_CONTAINER: '[data-testid="ad-card"], div[class*="adcard"], article[class*="ad"]',
  OLX_LINK: 'a[href*="/imovel/"]',
  OLX_PRICE: '[data-testid="ad-price"], span[class*="price"], strong',
  OLX_TITLE: '[data-testid="ad-title"], h2, h3',
  OLX_LOCATION: '[data-testid="ad-location"], span[class*="location"]',
  OLX_IMAGE: 'img[data-src], img[src], picture img',
  OLX_DATE: 'time[datetime], [data-testid="ad-date"]',
  OLX_NEXT: 'a[aria-label*="próxima"], a[aria-label*="next"]',
  
  ZAP_CONTAINER: '[data-testid="property-card"], .property-card, article[class*="property"]',
  ZAP_LINK: 'a[href*="/imovel/"], a[href*="/propriedade/"]',
  ZAP_PRICE: '[data-testid="property-price"], .price-value, strong',
  ZAP_TITLE: '[data-testid="property-title"], h3, h4',
  ZAP_LOCATION: '[data-testid="property-address"], .address',
  ZAP_IMAGE: 'img[data-src], img[src], picture img',
  ZAP_DATE: 'time[datetime], .publish-date',
  ZAP_NEXT: 'a[aria-label*="próxima"], button[class*="next"]',
  
  AGENCY_CONTAINER: 'article.property, div.listing, .imovel-card, [class*="property"], [class*="imovel"]',
  AGENCY_LINK: 'a[href*="/imovel/"], a.property-link, .card-link',
  AGENCY_PRICE: 'span.price, .valor, strong[class*="price"]',
  AGENCY_TITLE: 'h3.property-title, h4, .titulo-imovel',
  AGENCY_LOCATION: 'span.location, .endereco, [class*="bairro"]',
  AGENCY_IMAGE: 'img.property-image, img[src*="imovel"], picture img',
  AGENCY_DATE: 'time, .data-publicacao',
  AGENCY_NEXT: 'a.next, .pagination-next, a[rel="next"]',
};

export function getSelectors(source: 'olx' | 'zap' | 'vivareal' | 'agency') {
  switch (source) {
    case 'zap':
    case 'vivareal':
      return {
        container: SELECTORS.ZAP_CONTAINER,
        link: SELECTORS.ZAP_LINK,
        price: SELECTORS.ZAP_PRICE,
        title: SELECTORS.ZAP_TITLE,
        location: SELECTORS.ZAP_LOCATION,
        image: SELECTORS.ZAP_IMAGE,
        date: SELECTORS.ZAP_DATE,
        next: SELECTORS.ZAP_NEXT,
      };
    case 'agency':
      return {
        container: SELECTORS.AGENCY_CONTAINER,
        link: SELECTORS.AGENCY_LINK,
        price: SELECTORS.AGENCY_PRICE,
        title: SELECTORS.AGENCY_TITLE,
        location: SELECTORS.AGENCY_LOCATION,
        image: SELECTORS.AGENCY_IMAGE,
        date: SELECTORS.AGENCY_DATE,
        next: SELECTORS.AGENCY_NEXT,
      };
    default:
      return {
        container: SELECTORS.OLX_CONTAINER,
        link: SELECTORS.OLX_LINK,
        price: SELECTORS.OLX_PRICE,
        title: SELECTORS.OLX_TITLE,
        location: SELECTORS.OLX_LOCATION,
        image: SELECTORS.OLX_IMAGE,
        date: SELECTORS.OLX_DATE,
        next: SELECTORS.OLX_NEXT,
      };
  }
}

// 🏢 Olivia Imóveis: usa seletores genéricos (AGENCY_*)

