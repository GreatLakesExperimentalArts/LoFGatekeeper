import { Moment } from 'moment';
import { Attendee } from './dto';
import { StatefulTable, StatefulRow } from './table';

interface RequestAttendeesAction {
  type: 'REQUEST_ATTENDEES';
}

interface ReceiveAttendeesAction {
  type: 'RECEIVE_ATTENDEES';
  attendees: Attendee[];
}

interface RequestAttendeeUpdateAction {
  type: 'REQUEST_ATTENDEE_UPDATE';
  attendee: Pick<Attendee, any>;
}

interface ReceiveAttendeeUpdateAction {
  type: 'RECEIVE_ATTENDEE_UPDATE';
  index: number;
  attendee: Pick<Attendee, any>;
}

interface SearchForParentsAction {
  type: 'SEARCH_FOR_PARENTS';
  lastName: string;
  partial: string | null;
  callback: (results: string[]) => void;
}

interface CheckIfWristbandUsedAction {
  type: 'CHECK_IF_WRISTBAND_USED';
  wristband: string;
  reference: number | Moment | null;
  callback: (used: boolean) => void;
}

interface GetNextUnusedWristbandAction {
  type: 'GET_NEXT_UNUSED_WRISTBAND';
  reference: number | Moment;
  callback: (next: string) => void;
}

interface UpdateSearchAction {
  type: 'UPDATE_SEARCH';
  search: string;
  categoryFilter: string;
}

interface SetTableRefAction {
  type: 'SET_TABLE_REF';
  table: StatefulTable<{}>;
}

interface SetRowStateAction {
  type: 'SET_ROW_STATE';
  index: number;
  state: Pick<StatefulRow, any>;
  callback?: () => void;
}

export type KnownAction =
  RequestAttendeesAction |
  ReceiveAttendeesAction |
  RequestAttendeeUpdateAction |
  ReceiveAttendeeUpdateAction |
  SearchForParentsAction |
  CheckIfWristbandUsedAction |
  GetNextUnusedWristbandAction |
  UpdateSearchAction |
  SetTableRefAction |
  SetRowStateAction;