import { fetch, addTask } from 'domain-task';
import { Action, Reducer, ActionCreator, Store } from 'redux';
import { AppThunkAction, ApplicationState } from '..';
import { Attendee, actionCreators as attendeeActions } from '../attendees';
import { Duration, DateTime } from 'luxon';
import * as signalR from '@aspnet/signalr';
import * as _ from 'lodash';
import { Moment } from 'moment';

export interface Volunteer extends Attendee {
  // nothing here yet
}

export interface VolunteerTimeclockEntry {
  volunteerId: string;
  name?: string;
  in: DateTime;
  out?: DateTime;
}

export interface ScheduledVolunteerShift {
  id: AAGUID;
  volunteerId: string;
  begins: DateTime;
  ends: DateTime;
  task: string;
}

interface RequestShiftsAction {
  type: 'REQUEST_SHIFTS';
}

interface ReceiveShiftsAction {
  type: 'RECEIVE_SHIFTS';
  received: Array<any>;
  filter: Moment;
}

interface FilterShiftsAction {
  type: 'FILTER_SHIFTS';
  filter: Moment;
}

interface ReceiveActiveAction {
  type: 'RECEIVE_ACTIVE';
  received: Array<Array<string>>;
}

interface BeginShiftAction {
  type: 'BEGIN_SHIFT';
  row: VolunteerTimeclockEntry;
}

interface EndShiftAction {
  type: 'END_SHIFT';
  row: VolunteerTimeclockEntry;
}

export type KnownAction =
  ReceiveShiftsAction |
  RequestShiftsAction |
  FilterShiftsAction |
  ReceiveActiveAction |
  BeginShiftAction |
  EndShiftAction;

export interface VolunteersState {
  active: VolunteerTimeclockEntry[];
  displayed: ScheduledVolunteerShift[];
  scheduled: ScheduledVolunteerShift[];
  isLoading: boolean;
}

const unloadedState: VolunteersState = {
  active: [],
  displayed: [],
  scheduled: [],
  isLoading: false
};

export const reducer: Reducer<VolunteersState> =
  (state: VolunteersState, incomingAction: Action) => {
    const action = incomingAction as KnownAction;
    switch (action.type) {
      case 'RECEIVE_SHIFTS':
      {
        let typeOrder = [
          'Lead On Duty',
          'Lead Training',
          'ID Verification Shift [IDV]',
          'Volunteer Lead Shift',
          'Volunteer Shift'
        ];

        let scheduled = _.sortBy(_.map(action.received, (item: any) => {
          return {
            id: item.id,
            volunteerId: item.volunteerId,
            begins: DateTime.fromISO(item.begins),
            ends: DateTime.fromISO(item.ends),
            task: item.task
          } as ScheduledVolunteerShift;
        }), [
          (n: ScheduledVolunteerShift) => n.begins,
          (n: ScheduledVolunteerShift) => _.indexOf(typeOrder, n.task)
        ]);

        let filter = DateTime.fromISO(action.filter.toISOString());
        let displayed = _.filter(scheduled, row => row.begins > filter && row.begins <= filter.plus({ days: 1 }));

        return { ...state, scheduled, displayed, isLoading: false };
      }

      case 'FILTER_SHIFTS':
      {
        let filter = DateTime.fromISO(action.filter.toISOString());
        let displayed = _.filter(state.scheduled, row => row.begins > filter && row.begins <= filter.plus({ days: 1 }));
        return { ...state, displayed };
      }

      case 'REQUEST_SHIFTS':
      {
        return { ...state, isLoading: true };
      }

      case 'RECEIVE_ACTIVE':
        {
          let active = _.map(action.received, (item: string[]) => {
            return {
              volunteerId: item[0],
              in: DateTime.fromISO(item[1])
            } as VolunteerTimeclockEntry;
          });
          return { ...state, active };
        }

      case 'BEGIN_SHIFT':
        {
          let active = _.concat(state.active, [action.row]);
          return { ...state, active };
        }

      case 'END_SHIFT':
        {
          let active = _.filter(state.active,
            (v) => v.volunteerId === action.row.volunteerId
          );
          return { ...state, active };
        }

      default:
        const exhaustiveCheck: never = action;
    }
    return state || unloadedState;
  };

let connection: signalR.HubConnection;

export const bindSignalRHub = (store: Store<ApplicationState>) => {
  connection = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/volunteer')
    .build();

  connection.on('ActiveVolunteers', data => {
    store.dispatch({ type: 'RECEIVE_ACTIVE', received: data });
  });

  connection.start().then(() => {
    connection.send('GetActive');
  });

  return store;
};

export const actionCreators = {
  loadScheduledShifts: (
    filter: Moment
  ): AppThunkAction<KnownAction> =>
  (dispatch, getState) => {
      let { attendees, volunteers, routing } = getState();

      if (volunteers.scheduled.length === 0) {
        let fetchTask = fetch(`api/Volunteer`)
          .then(response => response.json() as Promise<ScheduledVolunteerShift[]>)
          .then(data => {
            dispatch({ type: 'RECEIVE_SHIFTS', received: data, filter });
          });

        addTask(fetchTask);
        dispatch({ type: 'REQUEST_SHIFTS' });
      } else {
        dispatch({ type: 'FILTER_SHIFTS', filter });
      }
    },
  searchByWristband: (
      wristband: string,
      callback: (volunteer: Volunteer) => void
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      let { attendees, volunteers, routing } = getState();
      let volunteer = _.find(attendees.attendees,
          (a) => a.wristband === wristband
        ) as Volunteer;

      callback(volunteer);
    },
  beginShift: (
      volunteerId: string
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      let { attendees, volunteers, routing } = getState();

      var row: VolunteerTimeclockEntry = { volunteerId, in: DateTime.utc() };
      connection.send('BeginShiftFor', row)
        .then(() => dispatch({ type: 'BEGIN_SHIFT', row }));
    },
  endShift: (
      volunteerId: string
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      let { attendees, volunteers, routing } = getState();
      let row: VolunteerTimeclockEntry = _.find(volunteers.active,
        (v) => v.volunteerId === volunteerId
      ) || { volunteerId, in: DateTime.utc() };

      connection.send('EndShiftFor', { volunteerId })
        .then(() => dispatch({ type: 'END_SHIFT', row }));
    }
};