import { fetch, addTask } from 'domain-task';
import { Action, Reducer, ActionCreator, Store } from 'redux';
import { AppThunkAction, ApplicationState } from '..';
import { Attendee, actionCreators as attendeeActions } from '../attendees';
import { Duration, DateTime } from 'luxon';
import * as signalR from '@aspnet/signalr';
import * as _ from 'lodash';

export interface Volunteer extends Attendee {
  // nothing here yet
}

export interface VolunteerTimeclockEntry {
  volunteerId: string;
  name?: string;
  in: DateTime;
  out?: DateTime;
}

export interface VolunteersState {
  active: VolunteerTimeclockEntry[];
}

interface ReceiveAllAction {
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
  ReceiveAllAction |
  BeginShiftAction |
  EndShiftAction;

const unloadedState: VolunteersState = {
  active: []
};

export const reducer: Reducer<VolunteersState> =
  (state: VolunteersState, incomingAction: Action) => {
    const action = incomingAction as KnownAction;
    switch (action.type) {
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