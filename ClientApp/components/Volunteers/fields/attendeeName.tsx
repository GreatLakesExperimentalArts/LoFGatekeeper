import * as React from 'react';
import * as _ from 'lodash';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState, AppThunkAction, actionCreators } from 'store';
import { Attendee } from 'store/attendees';
import { Duration, DateTime } from 'luxon';

export interface Props extends React.ClassAttributes<HTMLSpanElement> {
  value: string;
  attendee?: Attendee;
}

class AttendeeName extends Component<Props, {}> {
  public render() {
    let { attendee, value, ...props } = this.props;
    let className = _.get(props, 'className');
    props = _.pickBy(props, v => !_.isFunction(v));

    if (attendee) {
      let { name, burnerName } = attendee;

      return (
        <span {...(_.merge(props, { className: `attendeeName ${className || ''}` }))}>
          {name.nickName || name.firstName}
          {burnerName || '' !== '' ? ` "${burnerName}" ` : ' '}
          {name.lastName}
        </span>
      );
    }

    return <span {...(_.merge(props, { style: { color: '#CCC' }}))}>No Info</span>;
  }
}

export default connect(
  (state: ApplicationState, ownProps: Props) => {
    if (state.attendees.attendees) {
      let attendee = state.attendees.attendees[ownProps.value] || null;
      return { ...ownProps, attendee: attendee };
    }
    return { ...ownProps };
  },
  actionCreators
)(AttendeeName) as any as typeof AttendeeName;