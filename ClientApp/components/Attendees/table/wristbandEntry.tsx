import * as React from 'react';
import { Component } from 'react';
import { bindActionCreators } from 'redux';
import * as ReactDOM from 'react-dom';
import { connect, Dispatch } from 'react-redux';
import InputMask from 'react-input-mask';
import { ApplicationState, AppThunkAction } from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { StatefulComponentProps, StatefulRow } from 'store/attendees/table';

import $ from 'jquery';
import './style';

interface Props extends StatefulComponentProps {
  checkIfWristbandUsed: (wristband: string, index: number, callback: (used: boolean) => void) => void;
  getNextUnusedWristband: (index: number, callback: (next: string) => void) => void;
  setRowState: (index: number, state: Pick<StatefulRow, any>, callback?: () => void) => void;
}

interface State {
  cssClass: string;
  next: string;
  found: boolean;
}

class InputComponent extends Component<Props, State> {
  componentWillMount() {
    this.setState({
      cssClass: '',
      next: '',
      found: false
    });

    this.onFocus = this.onFocus.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onChanged = this.onChanged.bind(this);
    this.onBlur = this.onBlur.bind(this);
    this.placeholder = this.placeholder.bind(this);
  }

  componentWillReceiveProps(next: Props) {
    if (this.props.table && this.props.attendee && next.attendee) {
      if (next.value && next.value.length === 4 && next.value !== this.props.value) {
        this.props.checkIfWristbandUsed(next.value, this.props.index, (found) => {
          setTimeout(() => {
            this.props.table.setInputState(this.props.index, 'wristband', { valid: !found });

            this.setState({ cssClass:
              found
              ? 'failure'
              : this.state.next === this.props.value
                ? 'success'
                : 'warning'
            });
          }, 50);
        });
      }
    }
  }

  public render() {
    return (this.props.static) ? (
        <samp className="form-inline">{this.props.attendee.wristband}</samp>
      ) : (
        <div data-placeholder={this.placeholder()}>
          <InputMask
            className={`${this.state.cssClass} ant-input ant-input-sm overlayed`}
            name="wristband"
            mask="9999"
            maskChar=""
            formatChars={{ '9': '[0-9]' }}
            disabled={this.props.disabled}
            value={this.props.value}
            onKeyDown={this.onKeyDown}
            onChange={this.onChanged}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
          />
        </div>
      );
  }

  private placeholder() {
    const { next } = this.state;
    const { value } = this.props;
    return value.replace(/[0-9]/gi, '\u00A0') + next.substring(value.length);
  }

  private onFocus(event: React.FocusEvent<HTMLInputElement>) {
    this.props.getNextUnusedWristband(
      this.props.index,
      (next) => this.setState({ next })
    );
  }

  private onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && event.currentTarget.value.trim() === '') {
      var dobInput = $(event.currentTarget)
        .closest('tr')
        .find('input[name="dob"]');

      var dobValue = dobInput.val();

      dobInput.focus();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      $(event.currentTarget).closest('tr')
        .find('button.ant-btn-primary')
        .click();
    }
  }

  private onBlur(event: React.FocusEvent<HTMLInputElement>) {
    var currentRow = $(event.target).closest('tr').get(0);
    var relatedRow = $(event.relatedTarget).closest('tr').get(0);

    if (currentRow !== relatedRow || this.props.value === '') {
      this.setState({ next: '' });
    }
  }

  private onChanged(event: React.FormEvent<HTMLInputElement>) {
    event.preventDefault();
    let value = event.currentTarget.value.trim().toUpperCase();

    this.props.table.setInputState(this.props.index, 'wristband', { value, valid: false });

    if (value.length < 4) {
      this.setState({ 'cssClass': '' });
    }
  }
}

const WristbandEntryInput = connect(
  (state: ApplicationState, ownProps: Props | undefined) => {
    if (ownProps) {
      let attendee = state.attendees.attendees[ownProps.index];
      let row = attendee.row as StatefulRow;
      return { ...ownProps, attendee, ...row.wristband };
    }

    return { };
  },
  actionCreators
)(InputComponent);

export default WristbandEntryInput;