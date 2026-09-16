import { pgEnum } from 'drizzle-orm/pg-core';

export const TX_DIRECTIONS = ['in', 'out'] as const;
export const TX_SOURCES = ['manual', 'import', 'gateway'] as const;
export const ALLOCATION_REASONS = ['note_match', 'manual', 'expense', 'carry_forward', 'surplus_to_general', 'top_up_from_general', 'correction'] as const;
export const CAMPAIGN_KINDS = ['one_off', 'recurring', 'general'] as const;
export const CAMPAIGN_STATUSES = ['draft', 'active', 'funded', 'completed', 'cancelled'] as const;
export const SPECIES = ['dog', 'cat', 'other'] as const;
export const ANIMAL_STATUSES = ['street', 'in_treatment', 'adoptable', 'adopted', 'deceased'] as const;
export const QUOTE_STATUSES = ['offered', 'accepted', 'declined', 'done'] as const;
export const ATTACHMENT_KINDS = ['receipt', 'invoice', 'photo', 'document'] as const;
export const ADOPTION_STATUSES = ['open', 'pending', 'closed'] as const;
export const ADOPTION_SOURCES = ['own', 'shelter_import'] as const;
export const ROLES = ['admin'] as const;

export const txDirectionEnum = pgEnum('tx_direction', TX_DIRECTIONS);
export const txSourceEnum = pgEnum('tx_source', TX_SOURCES);
export const allocationReasonEnum = pgEnum('allocation_reason', ALLOCATION_REASONS);
export const campaignKindEnum = pgEnum('campaign_kind', CAMPAIGN_KINDS);
export const campaignStatusEnum = pgEnum('campaign_status', CAMPAIGN_STATUSES);
export const speciesEnum = pgEnum('species', SPECIES);
export const animalStatusEnum = pgEnum('animal_status', ANIMAL_STATUSES);
export const quoteStatusEnum = pgEnum('quote_status', QUOTE_STATUSES);
export const attachmentKindEnum = pgEnum('attachment_kind', ATTACHMENT_KINDS);
export const adoptionStatusEnum = pgEnum('adoption_status', ADOPTION_STATUSES);
export const adoptionSourceEnum = pgEnum('adoption_source', ADOPTION_SOURCES);
export const roleEnum = pgEnum('role', ROLES);
