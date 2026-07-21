export const STRUCTURE_ALERT_TARGET_TYPES = [
  'KEY_LEVEL',
  'STRUCTURE_LINE',
] as const;
export type StructureAlertTargetType =
  (typeof STRUCTURE_ALERT_TARGET_TYPES)[number];

export const STRUCTURE_ALERT_EVENT_TYPES = [
  'NEAR',
  'BREAK_UP',
  'BREAK_DOWN',
] as const;
export type StructureAlertEventType =
  (typeof STRUCTURE_ALERT_EVENT_TYPES)[number];

