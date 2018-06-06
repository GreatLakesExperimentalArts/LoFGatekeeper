import { fetch, addTask } from 'domain-task';
import { Action, Reducer, ActionCreator, Store } from 'redux';
import { AppThunkAction, ApplicationState } from '..';
import { Attendee, actionCreators as attendeeActions } from '../attendees';
import * as signalR from '@aspnet/signalr';
import * as _ from 'lodash';

// import { Duration, DateTime } from 'luxon';
import moment, { Moment } from 'moment';

export interface Volunteer extends Attendee {
  // nothing here yet
}

export interface VolunteerTimeclockEntry {
  volunteerId: string;
  name?: string;
  in: Moment;
  out?: Moment;
}

export interface ScheduledVolunteerShift {
  id: string;
  volunteerId: string;
  begins: Moment;
  ends: Moment;
  task: string;
}

interface RequestShiftsAction {
  type: 'REQUEST_SHIFTS';
}

interface FilterShiftsAction {
  type: 'FILTER_SHIFTS';
  received?: Array<any>;
  filter: Moment;
  callback?: () => void;
}

interface ReceiveActiveAction {
  type: 'RECEIVE_ACTIVE';
  received: Array<Array<string>>;
}

interface BeginShiftAction {
  type: 'BEGIN_SHIFT';
  entry: VolunteerTimeclockEntry;
}

interface EndShiftAction {
  type: 'END_SHIFT';
  volunteerId: string;
}

export type KnownAction =
  RequestShiftsAction |
  FilterShiftsAction |
  ReceiveActiveAction |
  BeginShiftAction |
  EndShiftAction;

export interface VolunteersState {
  active: VolunteerTimeclockEntry[];
  displayed: ScheduledVolunteerShift[];
  scheduled: ScheduledVolunteerShift[];
  hasLoaded: boolean;
}

const unloadedState: VolunteersState = {
  active: [],
  displayed: [],
  scheduled: [],
  hasLoaded: false
};

export const reducer: Reducer<VolunteersState> =
  (state: VolunteersState, incomingAction: Action) => {
    const action = incomingAction as KnownAction;
    switch (action.type) {
      case 'FILTER_SHIFTS':
      {
        let typeOrder = [
          'Lead On Duty',
          'Lead Training',
          'ID Verification Shift [IDV]',
          'Volunteer Lead Shift',
          'Volunteer Shift'
        ];

        let scheduled = _.sortBy(_.map(action.received || state.scheduled, (item: any) => {
          return {
            id: item.id,
            volunteerId: item.volunteerId,
            begins: moment(item.begins),
            ends: moment(item.ends),
            task: item.task
          } as ScheduledVolunteerShift;
        }), [
          (n: ScheduledVolunteerShift) => n.begins,
          (n: ScheduledVolunteerShift) => _.indexOf(typeOrder, n.task)
        ]);

        var filter = moment(action.filter.startOf('day'));

        if (!_.find(scheduled, o => o.id === 'custom')) {
          var extra = {
            id: 'custom',
            volunteerId: '10855-a25f573b1fd4c1eaa2229a98933ad47e',
            begins: moment().local().startOf('day').add(0, 'hours'),
            ends: moment().local().startOf('day').add(1, 'days'),
            task: 'Lead On Duty'
          };

          scheduled = [ extra, ...scheduled ];
        }

        let displayed = _.filter(scheduled, row => {
          var before = Math.abs(
            moment.duration(
              filter.startOf('day').diff(row.begins)
            ).asDays()
          );
          var after = Math.abs(
            moment.duration(
              filter.endOf('day').diff(row.begins)
            ).asDays()
          );
          return before <= 1 && after < 1;
        });

        if (action.callback) { action.callback(); }
        return { ...state, scheduled, displayed, hasLoaded: true };
      }

      case 'REQUEST_SHIFTS':
      {
        return { ...state, isLoading: true };
      }

      case 'RECEIVE_ACTIVE':
        {
          let active = _.map(action.received, (item: string[]) => {
            return {
              id: item[0],
              volunteerId: item[1],
              in: moment(item[2])
            } as VolunteerTimeclockEntry;
          });
          return { ...state, active };
        }

      case 'BEGIN_SHIFT':
        {
          let active = _.concat(state.active, [action.entry]);
          return { ...state, active };
        }

      case 'END_SHIFT':
        {
          let active = _.filter(state.active,
            (v) => v.volunteerId !== action.volunteerId
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

  connection.on('VolunteerStartShift', data => {
    store.dispatch({ type: 'BEGIN_SHIFT', entry: data });
  });

  connection.on('VolunteerEndedShift', data => {
    store.dispatch({ type: 'END_SHIFT', volunteerId: data.volunteerId });
  });

  connection.on('ActiveVolunteers', data => {
    store.dispatch({ type: 'RECEIVE_ACTIVE', received: data });
  });

  connection.start().then(() => {
    connection.send('GetActive');

    let fetchTask = fetch(`api/Volunteer`)
    .then(response => response.json() as Promise<ScheduledVolunteerShift[]>)
    .then(data => {
      store.dispatch({ type: 'FILTER_SHIFTS', received: data, filter: moment() });
    });

    addTask(fetchTask);
    store.dispatch({ type: 'REQUEST_SHIFTS' });
  });

  return store;
};

export const actionCreators = {
  loadScheduledShifts: (
    filter?: Moment,
    callback?: () => void
  ): AppThunkAction<KnownAction> =>
  (dispatch, getState) => {
      dispatch({ type: 'FILTER_SHIFTS', filter: filter || moment(), callback });
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

      var entry: VolunteerTimeclockEntry = { volunteerId, in: moment() };
      connection.send('BeginShiftFor', entry);
    },
  endShift: (
      volunteerId: string
    ): AppThunkAction<KnownAction> =>
    (dispatch, getState) => {
      let { attendees, volunteers, routing } = getState();
      let row: VolunteerTimeclockEntry | undefined =
        _.find(volunteers.active,
          (v) => v.volunteerId === volunteerId
        );

      if (!row) {
        dispatch({ type: 'END_SHIFT', volunteerId });
        return;
      }

      connection.send('EndShiftFor', row);
    }
};