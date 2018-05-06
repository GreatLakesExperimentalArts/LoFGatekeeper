import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState, AppThunkAction } from 'store';
import { actionCreators } from 'store/attendees';
import { StatefulComponentProps } from 'store/attendees/table';

class ArrivalDate extends Component<StatefulComponentProps, {}> {
  render() {
    return (<samp className="form-inline">{this.props.value}</samp>);
  }
}

export default connect(
  (state: ApplicationState, ownProps: StatefulComponentProps | undefined) => {
    if (ownProps) {
      let attendee = state.attendees.attendees[ownProps.dataid];
      if (attendee && attendee.arrivalDate && attendee.arrivalDate.isValid()) {
        let value = attendee.arrivalDate.format('ddd DD @ HH:mm');
        return { ...ownProps, value };
      }

      return ownProps;
    }
  },
  actionCreators
)(ArrivalDate) as typeof ArrivalDate;