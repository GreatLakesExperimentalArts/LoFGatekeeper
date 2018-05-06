import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState, AppThunkAction } from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { StatefulComponentProps } from 'store/attendees/table';

import { Button } from 'antd';
import { without } from 'lodash';
import $ from 'jquery';

interface Props extends StatefulComponentProps {
  updateAttendee: (
    attendee: Pick<Attendee, any>,
    sendServerUpdate: boolean,
    forceReceiveState: boolean
  ) => AppThunkAction<any>;
  mode: 'commit' | 'delete' | 'none';
}

class Buttons extends Component<Props, {}> {
  componentWillMount() {
    this.onCommit = this.onCommit.bind(this);
    this.onRemove = this.onRemove.bind(this);
  }

  render() {
    switch (this.props.mode) {
      case 'commit':
        let committer = (event: React.MouseEvent<HTMLButtonElement>) => this.onCommit(event);
        return (<Button icon="check" type="primary" size="small" onClick={committer} />);
      case 'delete':
        let remover = (event: React.MouseEvent<HTMLButtonElement>) => this.onRemove(event);
        return (<Button icon="delete" type="danger" size="small" onClick={remover} />);
      case 'none':
      default:
        return (<span>&nbsp;</span>);
    }
  }

  private onCommit(event: React.FormEvent<HTMLButtonElement>) {
    let interimValue = $(event.currentTarget)
      .closest('tr')
      .find('input[name="wristband"]')
      .val();

    let attendee: Attendee = this.props.attendee as Attendee;
    attendee.wristband = interimValue;
    attendee.removedWristbands = without(
      attendee.removedWristbands || [],
      interimValue || '');

    this.props.updateAttendee(attendee, true, true);
  }

  private onRemove(event: React.FormEvent<HTMLButtonElement>) {
    let attendee: Attendee = this.props.attendee as Attendee;
    if (attendee.wristband) {
      attendee.removedWristbands = [...(attendee.removedWristbands || []), attendee.wristband];
      attendee.wristband = '';
    }

    this.props.updateAttendee(attendee, true, true);
  }
}

export default connect(
  (state: ApplicationState, ownProps: StatefulComponentProps | undefined) => {
    if (ownProps) {
      let attendee = state.attendees.attendees[ownProps.dataid];
      if (attendee) {
        let { confirmed, row } = state.attendees.attendees[ownProps.dataid];
        let { valid } = row.wristband;

        if (valid && !confirmed) {
          row.buttons.mode = 'commit';
        }

        if (confirmed) {
          row.buttons.mode = 'delete';
        }

        if (!confirmed && !valid && row.buttons.mode === 'commit') {
          row.buttons.mode = 'none';
        }

        return { ...ownProps, ...row.buttons, attendee };
      }
    }
  },
  actionCreators
)(Buttons) as any as typeof Buttons;