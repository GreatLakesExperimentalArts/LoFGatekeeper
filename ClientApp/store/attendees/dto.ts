import moment from 'moment';
import { Moment } from 'moment';
import { StatefulTable, StatefulRow } from './table';
import * as _ from 'lodash';

export interface Attendee {
  id: string;
  name: AttendeeName;
  dob: Moment;
  age: number;
  wristband: string | null;
  removedWristbands: string[] | null;
  permittedEntryDate: Moment | null;
  arrivalDate: Moment | null;
  emailAddress: string | null;
  confirmed: boolean;
  department: string | null;
  themeCamp: string | null;
  parents: string[] | null;
  row: StatefulRow;
}

export interface AttendeeName {
  firstName: string;
  lastName: string;
  nickname: string;
}

export interface AttendeeMap {
  [dataid: string]: Attendee;
}

export interface AttendeesState {
  searchFilter?: string;
  attendees?: AttendeeMap;
  result?: Attendee[];
  table?: StatefulTable<{}> | null;
}

export interface AttendeesValueState {
  searchFilter: string;
  attendees: AttendeeMap;
  result: Attendee[];
  table: StatefulTable<{}> | null;
}

const Capitalize = (str: string) => (str || '').replace(/\w\S*/g,
  (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
);

export const AddAttendeeProps = (state: AttendeesValueState, attendee: Attendee) => {
  attendee.dob = moment(attendee.dob).startOf('day');

  if (attendee.dob.year() === 1) {
    attendee.dob = moment()
      .startOf('day')
      .subtract(13, 'years')
      .subtract(1, 'seconds');
  }

  attendee.age = moment()
    .startOf('day')
    .diff(attendee.dob, 'years', true);

  if (typeof attendee.arrivalDate === 'string') {
    attendee.arrivalDate = moment(attendee.arrivalDate);
  }

  attendee.confirmed =
    (attendee.wristband || '') !== '' &&
    (attendee.arrivalDate || null) !== null &&
    (attendee.arrivalDate as Moment).isValid();

  if (state.table) {
    let row = attendee.row || new StatefulRow();

    if (row.wristband.valid && attendee.confirmed) {
      row = {
        dob: { ...row.dob, value: '', disabled: true },
        wristband: { ...row.wristband, value: '', valid: false, disabled: true },
        buttons: { mode: 'commit' }
      };
    }

    if (row.dob.static && row.wristband.static && !attendee.confirmed) {
      row = {
        dob: { ...row.dob, value: '', disabled: false },
        wristband: { ...row.wristband, value: '', valid: false, disabled: true },
        buttons: { mode: 'none' }
      };
    }

    row.dob.static = attendee.confirmed;
    row.dob.valid = attendee.dob.format('MM/DD/Y') === row.dob.value;
    row.wristband.static = row.dob.static || !row.dob.valid;
    row.wristband.disabled = !row.dob.valid;

    attendee.row = row;
  }

  return attendee;
};