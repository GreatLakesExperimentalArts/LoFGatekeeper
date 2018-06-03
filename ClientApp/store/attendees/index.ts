import { fetch, addTask } from 'domain-task';
import { Action, Reducer, ActionCreator, Store } from 'redux';
import { AppThunkAction, ApplicationState } from '../';
import * as signalR from '@aspnet/signalr';
import { Moment } from 'moment';
import moment from 'moment';
import {
  ArrayIterator,
  ListIterator,
  NotVoid,
  PartialDeep,
  StringIterator
} from 'lodash';
import * as _ from 'lodash';
import StringSimilarity from 'string-similarity';

import {
  Attendee as AttendeeIntl,
  AttendeesState as AttendeesStateIntl,
  AttendeeMap as AttendeeMapIntl,
  AttendeesValueState,
  AddAttendeeProps,
  AttendeesState
} from './dto';
import { KnownAction } from './actions';
import { StatefulTable, StatefulRow } from './table';
import AttendeeSearch from '../../components/Attendees';

export type Attendee = AttendeeIntl;
export type AttendeesState = AttendeesStateIntl;
export type AttendeeMap = AttendeeMapIntl;

let connection: signalR.HubConnection;

export const bindSignalRHub = (store: Store<ApplicationState>) => {
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/attendee')
    .build();

  connection.on('Add', data => {
    const state = store.getState().attendees;
    store.dispatch({ type: 'RECEIVE_ATTENDEE_UPDATE', attendee: data });
  });

  connection.on('Update', data => {
    const state = store.getState().attendees;
    store.dispatch({ type: 'RECEIVE_ATTENDEE_UPDATE', attendee: data });
  });

  connection.on('Delete', data => {
    const state = store.getState().attendees;
    store.dispatch({ type: 'DELETE_ATTENDEE', dataid: data.id });
  });

  connection.start().then(() => {
    let fetchTask = fetch(`api/Attendees`)
    .then(response => response.json() as Promise<Attendee[]>)
    .then(data => {
      store.dispatch({ type: 'RECEIVE_ATTENDEES', attendees: data });
    });

    addTask(fetchTask);
    store.dispatch({ type: 'REQUEST_ATTENDEES' });
  });

  return store;
};

export const actionCreators = {
  updateAttendee: (
      attendee: Pick<Attendee, any>,
      sendServerUpdate: boolean = false,
      parents?: string[]
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      if ('id' in attendee === false) {
        return;
      }

      const state = getState().attendees as AttendeesState;
      let { attendees } = state;

      attendee.parents = _.map(parents || attendee.parents, (parentValue) => {
          var val = parentValue.replace(/^@/gi, '');
          if (!(/[0-9]{4}/gi).test(val)) {
            return;
          }

          var parent = _.find(attendees, (a) => a.wristband === val) as Attendee;
          return parent.id;
        }).filter(p => p !== undefined) as string[];

      if (sendServerUpdate) {
        let { row, ...update } = attendee;
        addTask(connection.send('Update', update));
      }

      dispatch({ type: 'RECEIVE_ATTENDEE_UPDATE', attendee });
    },
  deleteAttendee: (id: string): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      addTask(
        connection.send('Delete', { Id: id })
      );
    },
  AddAttendee: (
      attendee: Attendee,
      reason: string,
      parents?: string[]
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      if (parents) {
        const state = getState().attendees as AttendeesState;
        let { attendees } = state;

        parents = _.map(parents, (parentValue) => {
          var val = parentValue.replace(/^@/gi, '');
          if (!(/[0-9]{4}/gi).test(val)) {
            return;
          }

          var parent = _.find(attendees, (a) => a.wristband === val) as Attendee;
          return parent.id;
        }).filter(p => p !== undefined) as string[];
      }

      let { dob, name, wristband } = attendee;

      addTask(
        connection.send('Add', { attendee: { dob, name, wristband }, reason, parents: parents })
      );
    },
  checkIfWristbandUsed: (
      wristband: string | null,
      reference: string | Moment | null,
      callback: (used: boolean) => void
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      wristband = wristband || '';
      dispatch({ type: 'CHECK_IF_WRISTBAND_USED', wristband, reference, callback });
    },
  getWristbandFromId: (id: string): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      const state = getState().attendees as AttendeesState;
      let { attendees } = state;
      return (_.find(attendees, (a) => a.id === id) || { wristband: null }).wristband;
    },
  getDisplayNameFromId: (id: string): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      const state = getState().attendees as AttendeesState;
      let { attendees } = state;

      let attendee: Attendee = _.find(attendees, (a) => a.id === id) as Attendee;
      if (!attendee) { return; }

      let burnerName = attendee.burnerName;

      return { ...attendee.name, burnerName };
    },
  searchForParents: (
      lastName: string,
      partial: string | null,
      remove: string[],
      callback: (results: Attendee[]) => void
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      dispatch({ type: 'SEARCH_FOR_PARENTS', lastName, partial, remove, callback });
    },
  getNextUnusedWristband: (
      reference: number | Moment,
      callback: (next: string) => void
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      dispatch({ type: 'GET_NEXT_UNUSED_WRISTBAND', callback, reference });
    },
  updateSearch: (
      search: string,
      categoryFilter: string,
      force?: boolean
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      dispatch({ type: 'UPDATE_SEARCH', search, categoryFilter, force: force || false });
    },
  setTableRef: (table: StatefulTable<{}>): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      dispatch({ type: 'SET_TABLE_REF', table });
    },
  setRowState: (dataid: string, state: Pick<StatefulRow, any>): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      dispatch({ type: 'SET_ROW_STATE', dataid, state });
    }
};

const unloadedState: AttendeesValueState = {
  attendees: {},
  result: [],
  table: null,
  searchFilter: ''
};

const MatchEval = (n: Pick<Attendee, any>, s: string) => eval(s);

const StandardSort = (attendees: ArrayLike<Attendee>, defaultPermittedDate: Moment) => {
  return _.sortBy(attendees, [
    (val: Attendee) => val.wristband !== '' && val.wristband,
    (val: Attendee) => (val.permittedEntryDate !== null && val.permittedEntryDate) || defaultPermittedDate,
    (val: Attendee) => (val.name.lastName || '').toLowerCase(),
    (val: Attendee) => (val.name.firstName || '').toLowerCase()
  ]);
};

export const reducer: Reducer<AttendeesValueState> = (state: AttendeesValueState, incomingAction: Action) => {
  const action = incomingAction as KnownAction;
  switch (action.type) {
    case 'REQUEST_ATTENDEES':
      return {
          ...state,
          isLoading: true
      };

    case 'RECEIVE_ATTENDEES':
      {
        let attendees: AttendeeMap = {};
        _.each(action.attendees, (item) => {
          attendees[item.id] = AddAttendeeProps(state, item);
        });

        return {
          ...state,
          attendees: attendees
        };
      }

    case 'UPDATE_SEARCH':
      {
        let attendees = _.values(state.attendees);

        if (attendees === undefined) {
          return {
            ...state,
            searchFilter: action.search,
            result: []
          };
        }

        attendees = StandardSort(attendees, state.settings.eventDefaultEntryDate);

        if ((action.search || '').length === 0 && (action.categoryFilter || '') === '') {
          return {
            ...state,
            searchFilter: action.search,
            result: [...attendees]
          };
        }

        var exp = new RegExp(action.search, 'gi');
        let result = _.filter(attendees, function (o: Attendee) {
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

          return _.some(['name', 'emailAddress', 'wristband', 'removedWristbands', 'id'], function (s: keyof Attendee) {
            switch (s) {
              case 'name':
                return exp.test(`${o.name.firstName} ${o.name.lastName}`);
              case 'emailAddress':
                return exp.test(`${o.emailAddress}`);
              case 'removedWristbands':
                return _.findIndex(o.removedWristbands, (i: string & null) => exp.test(i || '')) > -1;
              default:
                let key: (keyof Attendee) = s;
                return exp.test((o[s] || '').toString());
            }
          });
        });

        return {
          ...state,
          searchFilter: action.search,
          result: result
        };
      }

    case 'RECEIVE_ATTENDEE_UPDATE':
      {
        state = state || unloadedState;
        state.attendees[action.attendee.id] = AddAttendeeProps(state, {
          ...state.attendees[action.attendee.id],
          ...action.attendee
        });

        let { result } = state;

        if (!_.some(state.result, r => r.id === action.attendee.id)) {
          result = [...state.result, state.attendees[action.attendee.id]];
        }

        return { ...state, result: StandardSort(result, state.settings.eventDefaultEntryDate) };
      }

    case 'ADD_ATTENDEE':
      return { ...state };

    case 'DELETE_ATTENDEE':
      {
        let attendees: AttendeeMap = {};
        _.each(_.values(state.attendees), (item) => {
          if (item.id !== action.dataid) {
            attendees[item.id] = AddAttendeeProps(state, item);
          }
        });

        return { ...state, attendees, result: _.filter(state.result, r => r.id !== action.dataid) };
      }

    case 'SEARCH_FOR_PARENTS':
      {
        let subset = _.filter(_.values(state.attendees), val => {
          if (val === null) {
            return false;
          }

          return new RegExp(`^${action.partial || '[0-9]{4}$'}`, 'gi').test(val.wristband || '') &&
            !action.remove
              .map(r => r.replace(/[@]/gi, ''))
              .some(r => r === (val.wristband || ''));
        });

        subset = _.sortBy(_.map(subset, (item) => {
            return {
              attendee: item,
              closeness: 1 - StringSimilarity.compareTwoStrings(item.name.lastName, action.lastName),
              wristband: item.wristband
            };
          }), ['closeness', 'wristband'])
          .filter((item) => item.closeness !== 1)
          .map((item) => item.attendee);

        subset = _.take(subset, 20);

        action.callback(subset);
      }
      return { ...state };

    case 'CHECK_IF_WRISTBAND_USED':
      action.callback((() => {
        let id: string;
        let outOfBounds = false;

        if (action.reference) {
          let attendee: Pick<Attendee, any>;
          if (typeof action.reference === 'string') {
            attendee = state.attendees[action.reference];
            id = attendee.id;
          }
          if (action.reference instanceof moment) {
            attendee = { age: moment().startOf('day').diff(action.reference, 'years', true) };
          }

          let segment = _.find(state.wristbandSegments, (n) => MatchEval(attendee, n.match));
          let wi = parseInt(action.wristband);

          if (wi < segment.start || wi > segment.endAt) {
            outOfBounds = true;
          }
        }

        return _.findIndex(_.values(state.attendees), (val) => {
          return (
            val.wristband === action.wristband ||
            _.some(val.removedWristbands || [], (w) => w === action.wristband)
          ) && val.id !== id;
        }) > -1 || outOfBounds;
      })());

      return { ...state };

    case 'GET_NEXT_UNUSED_WRISTBAND':
      let { reference } = action;
      let { dob } = (typeof reference === 'string' && state.attendees[reference as string]) ||
        { dob: action.reference as Moment };

      action.callback((() => {
        const comparer = { age: moment().startOf('day').diff(dob, 'years', true) };
        var popSegment = _.find(state.wristbandSegments, (n) => MatchEval(comparer, n.match));

        let subset = _.filter(_.values(state.attendees), val => val !== null && MatchEval(val, popSegment.match));

        let wristbands = _.flatten<number>(_.map(subset, (val: Attendee) => {
          let ret = val.removedWristbands || [];
          if (val.wristband) { ret.push(val.wristband); }
          return _.map(ret, parseInt) as number[];
        }));

        let next = (
          _.max([ (_.max(wristbands) || 0) - popSegment.start + 1, 0 ])
        ) as number + popSegment.start;

        if (next > popSegment.endAt) {
          return 'NONE';
        }

        return _.padStart(next.toString(), 4, '0000');
      })());

      return { ...state };

    case 'SET_TABLE_REF':
      let { table } = action;
      return { ...state, table };

    case 'SET_ROW_STATE':
      {
        let { attendees } = state;
        let rowState = attendees[action.dataid].row || new StatefulRow();

        attendees[action.dataid].row = { ...rowState, ...action.state };
        attendees[action.dataid] = AddAttendeeProps(state, attendees[action.dataid]);

        return { ...state, attendees };
      }

    default:
      const exhaustiveCheck: never = action;
  }

  return state || unloadedState;
};