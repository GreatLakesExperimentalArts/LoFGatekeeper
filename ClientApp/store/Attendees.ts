import { fetch, addTask } from 'domain-task';
import { Component, PureComponent } from 'react';
import { Action, Reducer, ActionCreator, Store } from 'redux';
import { AppThunkAction, ApplicationState } from './';
import * as SignalR from '@aspnet/signalr';
import { Moment } from 'moment';
import moment from 'moment';
import {
  curry,
  each,
  filter,
  findIndex,
  flattenDeep as flatten,
  flow,
  map,
  max,
  padStart,
  property,
  over,
  remove,
  some,
  without,
  // types
  ArrayIterator,
  ListIterator,
  NotVoid,
  PartialDeep,
  StringIterator
} from 'lodash';

let connection: SignalR.HubConnection;

const curryMap = curry(
  (
    iteratee: ArrayIterator<{}, {}>,
    collection: {}[] | null | undefined
  ) =>
    map(collection, iteratee)
);

const curriedPull = curry(
  (
    predicate: string | [string, any] | ListIterator<{}, NotVoid> | PartialDeep<{}>,
    array: ArrayLike<{}>
  ) => remove(array, predicate)
);

const curriedFilter = curry(
  (
    predicate: ListIterator<any, NotVoid>,
    collection: ArrayLike<any>
  ) => filter(collection, predicate)
);

export interface AttendeesState {
  searchFilter?: string;
  attendees: Attendee[];
  result?: Attendee[];
  table: StatefulTable<{}> | null;
}

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

export abstract class StatefulComponent<
    T extends StatefulComponentProps,
    U extends StatefulComponentState
  > extends Component<T, U> {
}

export abstract class StatefulTable<T> extends Component<StatefulTableProps, T> {
  public abstract setInputState(
    index: number,
    key: keyof StatefulRow,
    state: Pick<StatefulComponentState, any>,
    callback?: () => void
  ): AppThunkAction<KnownAction>;
}

export type StatefulTableProps = StatefulTableState & typeof actionCreators;

export interface StatefulTableState extends AttendeesState {
  rowStates: StatefulRow[];
}

export interface StatefulComponentState {
  value: string;
  disabled: boolean;
  static: boolean;
  valid: boolean;
  input?: Component | null;
}

export class StatefulComponentProps implements StatefulComponentState {
  index: number = -1;
  attendee?: Attendee;
  table?: StatefulTable<any>;
  onValidated?: <T>(input: T) => void;

  value: string = '';
  static: boolean = true;
  disabled: boolean = false;
  valid: boolean = false;
}

export class StatefulRow {
  dob: StatefulComponentState = { value: '', valid: false, disabled: false, static: false, input: null };
  wristband: StatefulComponentState = { value: '', valid: false, disabled: true, static: true, input: null };
  buttons: { mode: 'commit' | 'delete' | 'none' } = { mode: 'none' };
}

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

interface CheckIfWristbandUsedAction {
  type: 'CHECK_IF_WRISTBAND_USED';
  wristband: string;
  index: number | null;
  callback: (used: boolean) => void;
}

interface GetNextUnusedWristbandAction {
  type: 'GET_NEXT_UNUSED_WRISTBAND';
  index: number;
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
  CheckIfWristbandUsedAction |
  GetNextUnusedWristbandAction |
  UpdateSearchAction |
  SetTableRefAction |
  SetRowStateAction;

export type CheckIfWristbandUsed = (
  wristband: string,
  index: number,
  callback: (used: boolean) => void
) => void;

export type GetNextUnusedWristband = (
  index: number,
  callback: (next: string) => void
) => void;

export const bindConnectionToStore = (store: Store<ApplicationState>, callback: Function) => {
  connection = new SignalR.HubConnection('/hubs/attendee');

  connection.on('Update', data => {
    let state = store.getState().attendees;
    let index = findIndex(state.attendees, (attendee: Attendee) => attendee.id === data.id);

    store.dispatch({ type: 'RECEIVE_ATTENDEE_UPDATE', attendee: data, index });

    if (state.table) {
      setTimeout(() => {
        let table = store.getState().attendees.table;
        if (table) {
          table.forceUpdate();
        }
      }, 100);
    }
  });

  connection.start(); // .then(callback());
};

export const actionCreators = {
  requestAttendees: (): AppThunkAction<KnownAction> => (dispatch, getState) => {
    let fetchTask = fetch(`api/Attendees`)
      .then(response => response.json() as Promise<Attendee[]>)
      .then(data => {
          dispatch({ type: 'RECEIVE_ATTENDEES', attendees: data });
      });

    addTask(fetchTask);
    dispatch({ type: 'REQUEST_ATTENDEES' });
  },
  updateAttendee: (
      attendee: Pick<Attendee, any>,
      sendServerUpdate: boolean = false,
      forceReceiveState: boolean = false
    ):
    AppThunkAction<KnownAction> => (dispatch, getState) => {

    if ('id' in attendee === false) {
      return;
    }

    if (sendServerUpdate) {
      const arrival = attendee.arrivalDate || moment();

      addTask(
        connection.send('Update', {
          Id: attendee.id,
          Wristband: attendee.wristband,
          RemovedWristbands: attendee.removedWristbands,
          Date: arrival.toISOString()
        })
      );
    }

    if (forceReceiveState) {
      dispatch({ type: 'RECEIVE_ATTENDEE_UPDATE', index: attendee.index, attendee });
      return;
    }
    dispatch({ type: 'REQUEST_ATTENDEE_UPDATE', attendee });
  },
  checkIfWristbandUsed: (
      wristband: string | null,
      index: number | null,
      callback: (used: boolean) => void
    ):
    AppThunkAction<KnownAction> => (dispatch, getState) => {

    wristband = wristband || '';
    dispatch({ type: 'CHECK_IF_WRISTBAND_USED', wristband, index, callback });
  },
  getNextUnusedWristband: (
      index: number,
      callback: (next: string) => void
    ):
    AppThunkAction<KnownAction> => (dispatch, getState) => {

    dispatch({ type: 'GET_NEXT_UNUSED_WRISTBAND', callback, index });
  },
  updateSearch: (search: string, categoryFilter: string): AppThunkAction<KnownAction> => (dispatch, getState) => {
    dispatch({ type: 'UPDATE_SEARCH', search, categoryFilter });
  },
  setTableRef: (table: StatefulTable<{}>):
    AppThunkAction<KnownAction> => (dispatch, getState) => {

    dispatch({ type: 'SET_TABLE_REF', table });
  },
  setRowState: (index: number, state: Pick<StatefulRow, any>):
    AppThunkAction<KnownAction> => (dispatch, getState) => {

    dispatch({ type: 'SET_ROW_STATE', index, state });
  }
};

const unloadedState: StatefulTableState = {
  attendees: [],
  result: [],
  table: null,
  searchFilter: '',
  rowStates: []
};

const addAttendeeProps = (state: StatefulTableState, attendee: Attendee, index: number) => {
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

export const reducer: Reducer<StatefulTableState> = (state: StatefulTableState, incomingAction: Action) => {
  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_ATTENDEES':
      return {
          ...state,
          isLoading: true
      };

    case 'RECEIVE_ATTENDEES':
      each(action.attendees, (item, idx: number) => addAttendeeProps(state, item, idx));

      return {
        ...state,
        attendees: action.attendees
      };

    case 'UPDATE_SEARCH':
      {
        let attendees = state.attendees;

        if (attendees === undefined) {
          return {
            ...state,
            searchFilter: action.search,
            result: []
          };
        }

        if (action.search.length === 0 && (action.categoryFilter || '') === '') {
          return {
            ...state,
            searchFilter: action.search,
            result: [...attendees]
          };
        }

        var exp = new RegExp(action.search, 'gi');
        var result = filter(attendees, function (o: Attendee) {
          switch (action.categoryFilter) {
            case 'EarlyEntry':
              if (!o.permittedEntryDate || !o.permittedEntryDate.isValid()) {
                return false;
              }
              break;
            case 'Confirmed':
              if (o.confirmed === false) {
                return false;
              }
              break;
            case 'Unconfirmed':
              if (o.confirmed === true) {
                return false;
              }
              break;
            default:
              break;
          }

          return some(['name', 'wristband', 'removedWristbands', 'id'], function (s: keyof Attendee) {
            switch (s) {
              case 'name':
                return exp.test(`${o.name.firstName} ${o.name.lastName}`);
              case 'removedWristbands':
                return findIndex(o.removedWristbands, (i: string & null) => exp.test(i || '')) > -1;
              default:
                let key: (keyof Attendee) = s;
                return exp.test((o[s] || '').toString());
            }
          });
        });
      }

      return {
        ...state,
        searchFilter: action.search,
        result: result
      };

    case 'REQUEST_ATTENDEE_UPDATE':
      {
        let attendee = action.attendee;
        if (!state.attendees) {
          return unloadedState;
        }

        state.attendees[attendee.index] = {
          ...state.attendees[attendee.index],
          ...attendee
        };
      }
      return { ...state };

    case 'RECEIVE_ATTENDEE_UPDATE':
      {
        let attendee = {
          ...state.attendees[action.index],
          ...action.attendee
        };

        state.attendees[action.index] = addAttendeeProps(state, attendee, action.index);
      }
      return { ...state };

    case 'CHECK_IF_WRISTBAND_USED':
      action.callback((() => {
        let id: string;

        if (action.index) {
          let attendee = state.attendees[action.index];
          id = attendee.id;
        }

        return findIndex(state.attendees, (val) => {
          return (
            val.wristband === action.wristband ||
            some(val.removedWristbands || [], (w) => w === action.wristband)
          ) && val.id !== id;
        }) > -1;
      })());

      return { ...state };

    case 'GET_NEXT_UNUSED_WRISTBAND':
      let { index } = action;
      let { dob } = state.attendees[index];

      action.callback((() => {

        const isAdult = moment()
          .startOf('day')
          .diff(dob, 'years', true) >= 21;

        let subset = filter(state.attendees, val => val !== null && (val.age >= 21) === isAdult);

        let wristbands = flatten(map(subset, (val: Attendee) => {
          let ret = val.removedWristbands || [];
          if (val.wristband) { ret.push(val.wristband); }
          return ret as string[];
        }));

        let next = (
          max(map(wristbands,
            flow(
              (val: string) => isAdult ? val : val.substring(1, 4),
              parseInt
            )
          )) || 0
        ) as number + 1;

        return padStart(next.toString(), 4, isAdult ? '0000' : 'M000');
      })());

      return { ...state };

    case 'SET_TABLE_REF':
      let { table } = action;
      return { ...state, table };

    case 'SET_ROW_STATE':
      {
        let { attendees } = state;
        let rowState = attendees[action.index].row || new StatefulRow();

        attendees[action.index].row = { ...rowState, ...action.state };
        attendees[action.index] = addAttendeeProps(state, attendees[action.index], action.index);

        return { ...state, attendees };
      }

    default:
      const exhaustiveCheck: never = action;
  }

  return state || unloadedState;
};