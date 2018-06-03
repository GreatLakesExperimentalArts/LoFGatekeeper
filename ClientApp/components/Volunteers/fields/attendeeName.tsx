import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState, AppThunkAction, actionCreators } from 'store';
import { Attendee } from 'store/attendees';
import { Duration, DateTime } from 'luxon';

export interface Props {
  value: string;
  attendee: Attendee | null;
}

class AttendeeName extends Component<Props, {}> {
  public render() {
    if (this.props.attendee) {
      let { name, burnerName } = this.props.attendee;

      return (
        <span>
          {name.nickName || name.firstName}
          {burnerName || '' !== '' ? ` "${burnerName}" ` : ' '}
          {name.lastName}
        </span>
      );
    }

    return <span style={{ color: '#CCC' }}>Loading</span>;
  }
}

export default connect(
  (state: ApplicationState, ownProps: Props) => {
    if (state.attendees.attendees) {
      let attendee = state.attendees.attendees[ownProps.value] || null;
      return { ...state, attendee: attendee };
    }
    return { ...state };
  },
  actionCreators
)(AttendeeName) as any as typeof AttendeeName;