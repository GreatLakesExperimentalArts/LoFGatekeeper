import moment from 'moment';
import { Moment } from 'moment';
import { StatefulTable, StatefulRow } from './table';

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

export const AddAttendeeProps = (state: AttendeesValueState, attendee: Attendee, index: number) => {
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

  attendee.index = index;

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