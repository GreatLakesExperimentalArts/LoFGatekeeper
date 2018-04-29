import { Moment } from 'moment';

export interface Attendee {
  id: string;
  name: AttendeeName;
  dob: Moment;
  age: number;
  wristband: string | null;
  removedWristbands: string[] | null;
  permittedEntryDate: Moment | null;
  arrivalDate: Moment | null;
  confirmed: boolean;
  index: number;
  row: StatefulRow;
}

export interface AttendeeName {
  firstName: string;
  lastName: string;
  nickname: string;
}

export interface AttendeesState {
  searchFilter?: string;
  attendees?: Attendee[];
  result?: Attendee[];
  table?: StatefulTable<{}> | null;
}

export interface AttendeesValueState {
  searchFilter: string;
  attendees: Attendee[];
  result: Attendee[];
  table: StatefulTable<{}> | null;
}