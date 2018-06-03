import { Store, compose } from 'redux';
import { RouterState } from 'react-router-redux';
import { Moment } from 'moment';

import {
  AttendeesState,
  reducer as attendeeReducer,
  actionCreators as attendeeActionCreators,
  bindSignalRHub as bindAttendeeSignalRHub
} from './attendees';

import {
  VolunteersState,
  reducer as volunteerReducer,
  actionCreators as volunteerActionCreators,
  bindSignalRHub as bindVolunteerSignalRHub
} from './volunteers';

export interface ApplicationState {
  attendees: AttendeesState;
  volunteers: VolunteersState;
  routing: RouterState;
}

export const reducers = {
  attendees: attendeeReducer,
  volunteers: volunteerReducer
};

export const actionCreators = {
  ...attendeeActionCreators,
  ...volunteerActionCreators
};

export const bindSignalRHubsToStore: (store: Store<ApplicationState>) => void =
  (store) => {
    compose(
      bindAttendeeSignalRHub,
      bindVolunteerSignalRHub
    )(store);
  };

export interface AppThunkAction<TAction> {
  (dispatch: (action: TAction) => void, getState: () => ApplicationState): void;
}
