import * as React from 'react';
import { Component } from 'react';
import * as ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import ReactInputMask from 'react-input-mask';
import { ApplicationState } from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { StatefulComponentProps, StatefulRow } from 'store/attendees/table';

import $ from 'jquery';
import './style';

export interface Props extends StatefulComponentProps {
  attendee: Attendee;
}

interface State {
  placeholder: string;
  cssClass: string;
}

interface NamedEventTarget extends EventTarget {
  name: string;
}

class DobInput extends Component<Props, State> {
  componentWillMount() {
    this.setState({
      placeholder: this.props.attendee.dob.format('MM/DD/Y'),
      cssClass: ''
    });

    this.onFocus = this.onFocus.bind(this);
    this.onChanged = this.onChanged.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  componentWillReceiveProps(next: Props) {
    if (this.props.attendee && next.attendee) {
      let lws = this.props.attendee.row.wristband;
      let nws = next.attendee.row.wristband;

      if (next.value !== this.props.value || nws.value !== lws.value) {
        let inputTruthy = next.value
          .replace(/[ ]/gi, '')
          .replace(/[0-9]/gi, '\u00A0')
          .replace(/[/]{1,2}$/gi, '');

        let value = next.value.replace(/[ /]/gi, '');
        let expected = this.props.attendee.dob.format('MMDDY');

        let mask = this.props.attendee.dob.format('MM/DD/Y');
        let placeholder = inputTruthy + mask.substring(inputTruthy.length);

        let state = { ...this.state, placeholder };

        if (value === expected) {
          state = { ...state, cssClass: 'success' };

          if (next.value !== this.props.value) {
            setTimeout(() => {
              $(ReactDOM.findDOMNode(this))
                .closest('tr')
                .find('input[name="wristband"]')
                .focus();
            }, 50);
          }

        } else if (value.length > 0 && value !== expected.substring(0, value.length)) {
          state = { ...state, cssClass: 'failure' };
        } else {
          state = { ...state, cssClass: '' };
        }

        this.setState(state);
      }
    }
  }

  public render() {
    return (!this.props.static) ? (
      <div data-placeholder={this.state.placeholder}>
        <ReactInputMask
          className={this.state.cssClass + ' ant-input ant-input-sm overlayed'}
          width="10"
          name="dob"
          mask="99/99/9999"
          maskChar=" "
          disabled={this.props.disabled}
          onBlur={this.onBlur}
          onFocus={this.onFocus}
          onSelect={this.onFocus}
          onChange={this.onChanged}
          value={this.props.value}
        />
      </div>
    ) : (
      <samp className="form-inline">{this.state.placeholder}</samp>
    );
  }

  private onFocus(event: React.FocusEvent<HTMLInputElement>) {
    if (event.currentTarget.value === '  /  /    ') {
      event.preventDefault();
      event.target.setSelectionRange(0, 0);
    }
  }

  private onChanged(event: React.FormEvent<HTMLInputElement>) {
    event.preventDefault();

    const previousInputValue = this.props.value;
    const { value } = event.currentTarget;

    if (this.props.table && this.props.attendee) {
      this.props.table.setInputState(this.props.dataid, 'dob', { value });
    }
  }

  private onBlur(event: React.FocusEvent<HTMLInputElement>) {
    let target = event.relatedTarget as NamedEventTarget;
    if (!this.props.attendee.confirmed && (!target || target.name !== 'wristband')) {
      this.props.table.setInputState(this.props.dataid, 'dob', { value: '' });
    }
  }
}

export default connect(
  (state: ApplicationState, ownProps: Props | undefined) => {
    if (ownProps) {
      let attendee = state.attendees.attendees[ownProps.dataid];
      if (attendee) {
        let row = attendee.row as StatefulRow;
        return { ...ownProps, attendee, ...row.dob };
      }
    }
  },
  actionCreators
)(DobInput) as typeof DobInput;