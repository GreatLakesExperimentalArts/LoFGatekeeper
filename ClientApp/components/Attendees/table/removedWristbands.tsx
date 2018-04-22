import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState, AppThunkAction } from '../../../store';
import {
  actionCreators,
  Attendee,
  StatefulComponent,
  StatefulComponentProps,
  StatefulComponentState
} from '../../../store/Attendees';

class RemovedWristbands extends Component<StatefulComponentProps, {}> {
  render() {
    return (<samp className="form-inline">{this.props.value}</samp>);
  }
}

export default connect(
  (state: ApplicationState, ownProps: StatefulComponentProps | undefined) => {
    if (ownProps) {
      let attendee = state.attendees.attendees[ownProps.index];
      let value = attendee.removedWristbands || [].join(', ');
      return { ...ownProps, value };
    }
  },
  actionCreators
)(RemovedWristbands) as typeof RemovedWristbands;