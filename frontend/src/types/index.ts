export type OperationType = 'SALE' | 'COMMERCIAL_RENT' | 'RESIDENTIAL_RENT';

export type PropertyType =
  | 'HOUSE'
  | 'APARTMENT'
  | 'COMMERCIAL_UNIT'
  | 'OFFICE'
  | 'LAND'
  | 'FIELD'
  | 'COUNTRY_HOUSE'
  | 'OTHER';

export type PropertyStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED' | 'PAUSED' | 'HIDDEN';

export type Currency = 'USD' | 'ARS';

export interface PropertyImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  order: number;
  isMain: boolean;
  /**
   * Qué punto de la foto tiene que quedar a la vista donde el espacio es más
   * chico que la foto (tarjetas del listado, vista previa del mapa). Va de 0 a 1
   * en cada eje; si no está, se centra.
   */
  focusX?: number;
  focusY?: number;
}

export interface Property {
  id: string;
  code: string;
  title: string;
  operationType: OperationType;
  propertyType: PropertyType;
  status: PropertyStatus;
  featured: boolean;
  demo?: boolean;

  /** null = "Consultar precio" */
  price: number | null;
  currency: Currency;
  expenses?: number | null;
  priceNote?: string | null;

  location: string;
  neighborhood?: string | null;
  exactAddress?: string;

  latitude?: number;
  longitude?: number;
  publicLatitude: number;
  publicLongitude: number;
  showExactLocation: boolean;

  coveredArea?: number | null;
  totalArea?: number | null;
  front?: number | null;
  depth?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  age?: number | null;

  garage: boolean;
  yard: boolean;
  pool: boolean;
  grill: boolean;
  quincho: boolean;
  gallery: boolean;
  terrace: boolean;
  services?: string[] | null;
  features?: string[] | null;

  description: string;
  images: PropertyImage[];

  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  operationType?: OperationType;
  location?: string;
  propertyType?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
  featured?: boolean;
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'AGENT';
}

export type LeadOperation = 'RENT' | 'SELL' | 'BUY';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  interest: string;
  operation: LeadOperation;
  propertyId?: string | null;
  propertyTitle?: string | null;
  createdAt: string;
}