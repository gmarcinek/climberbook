export interface AppUser {
  id: string;
  name: string;
}

export enum CalendarEventType {
  Offset = 'OFFSET',
  Alternating = 'ALTERNATING',
  Event = 'EVENT',
  Trip = 'TRIP',
  Birthday = 'BIRTHDAY',
  Medical = 'MEDICAL',
  School = 'SCHOOL',
  Camp = 'CAMP',
}

export interface CalendarEvent {
  id: string;
  groupId: string;
  date: string;
  type: CalendarEventType;
  issuer: string;
  creationTime: number;
  name?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  description?: string;
  style?: {
    background: string;
    color: string;
  };
  // Sync-related fields
  unsynced?: boolean; // User edited offline
  lastEditTime?: number; // When last edited locally
  hasConflict?: boolean; // Conflict detected
  conflictData?: any; // Remote conflict data
  deleted?: boolean; // Tombstone for deleted events
  deletedAt?: number; // When deleted locally
}
