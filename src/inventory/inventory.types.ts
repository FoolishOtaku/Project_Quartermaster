import {
  AvailabilityStatus,
  ItemCondition,
  OwnerSource,
  Prisma,
  TrackingType,
} from '@prisma/client';

/** Relations always loaded when presenting an item. */
export const itemInclude = {
  category: true,
  location: true,
} satisfies Prisma.ItemInclude;

export type ItemWithRelations = Prisma.ItemGetPayload<{
  include: typeof itemInclude;
}>;

/** Input for creating a quantity-based item (v0.2.0). */
export interface CreateItemInput {
  name: string;
  categoryId: string;
  categoryName: string;
  trackingType: TrackingType;
  quantity: number;
  unit?: string | null;
  minimumStock?: number | null;
  locationId?: string | null;
  storageDetail?: string | null;
  condition?: ItemCondition;
  availabilityStatus?: AvailabilityStatus;
  ownerSource?: OwnerSource;
  ownerName?: string | null;
  responsiblePic?: string | null;
  notes?: string | null;
}

/** Fields that /update_item may change in v0.2.0. */
export interface UpdateItemInput {
  name?: string;
  quantity?: number;
  minimumStock?: number | null;
  unit?: string | null;
  locationId?: string | null;
  storageDetail?: string | null;
  condition?: ItemCondition;
  availabilityStatus?: AvailabilityStatus;
  ownerSource?: OwnerSource;
  notes?: string | null;
}
