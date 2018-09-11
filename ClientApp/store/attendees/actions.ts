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

interface AddAttendeeAction {
  type: 'ADD_ATTENDEE';
  attendee: Attendee;
  reason: string;
  parents?: Attendee[];
}

interface ReceiveAttendeeUpdateAction {
  type: 'RECEIVE_ATTENDEE_UPDATE';
  attendee: Pick<Attendee, any>;
  callback?: () => void;
}

interface DeleteAttendeeAction {
  type: 'DELETE_ATTENDEE';
  dataid: string;
  callback: (results: Attendee[]) => void;
}

interface SearchForParentsAction {
  type: 'SEARCH_FOR_PARENTS';
  lastName: string;
  partial: string | null;
  remove: string[];
  callback: (results: Attendee[]) => void;
}

interface CheckIfWristbandUsedAction {
  type: 'CHECK_IF_WRISTBAND_USED';
  wristband: string;
  reference: string | Moment | null;
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
  dataid: string;
  state: Pick<StatefulRow, any>;
  callback?: () => void;
}

export type KnownAction =
  RequestAttendeesAction |
  ReceiveAttendeesAction |
  ReceiveAttendeeUpdateAction |
  AddAttendeeAction |
  DeleteAttendeeAction |
  SearchForParentsAction |
  CheckIfWristbandUsedAction |
  GetNextUnusedWristbandAction |
  UpdateSearchAction |
  SetTableRefAction |
  SetRowStateAction;