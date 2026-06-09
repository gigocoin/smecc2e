export const MOBILITY_TYPES = [
  "MSc Degree-Seeking (24 Months)",
  "PhD Degree-Seeking (36 Months)",
  "MSc Credit-Seeking (6 Months)",
  "PhD Credit-Seeking (9 Months)",
  "PhD Credit-Seeking (6 Months)",
  "Traineeship Mobility (3 Months)",
  "Staff Mobility (1 Months)",
] as const;

export type MobilityType = (typeof MOBILITY_TYPES)[number];

/** Full rubric template (questions/rows) shared with weight-only mobility types. */
export const RUBRIC_TEMPLATE_MOBILITY: MobilityType = MOBILITY_TYPES[0];

export const TRAINEESHIP_MOBILITY: MobilityType = "Traineeship Mobility (3 Months)";

/** Mobilities with their own editable questions, weights, and criterion rows. */
export const FULL_RUBRIC_MOBILITIES = [
  RUBRIC_TEMPLATE_MOBILITY,
  TRAINEESHIP_MOBILITY,
] as const;

export type FullRubricMobility = (typeof FULL_RUBRIC_MOBILITIES)[number];

export function isRubricTemplateMobility(
  mobilityType: string
): mobilityType is typeof RUBRIC_TEMPLATE_MOBILITY {
  return mobilityType === RUBRIC_TEMPLATE_MOBILITY;
}

export function isFullRubricMobility(
  mobilityType: string
): mobilityType is FullRubricMobility {
  return (FULL_RUBRIC_MOBILITIES as readonly string[]).includes(mobilityType);
}

export function isMobilityType(value: string): value is MobilityType {
  return (MOBILITY_TYPES as readonly string[]).includes(value);
}

export function resolveMobilityType(value: string | null | undefined): MobilityType {
  if (value && isMobilityType(value)) return value;
  return MOBILITY_TYPES[0];
}
