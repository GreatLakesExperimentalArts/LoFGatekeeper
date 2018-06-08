import * as React from 'react';
import * as antd from 'antd';
import * as _ from 'lodash';
import { Component } from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from 'store';
import { default as InputMask } from 'react-input-mask';
import Measure from 'react-measure';
import moment, { Moment } from 'moment';

import { FormComponentProps, FormCreateOption } from 'antd/lib/form/Form';
import { ColumnProps } from 'antd/lib/table/interface';

const { Table, Row, Col } = antd;
const { Form, Button, Tooltip, Tag } = antd;
const { Icon, DatePicker, Checkbox, Radio } = antd;
const { Input, Select, Cascader, Slider } = antd;

const InputGroup = Input.Group;
const FormItem = Form.Item;
const Option = Select.Option;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;

import { actionCreators as attendeeActionCreators } from 'store/attendees';
import { actionCreators as volunteersActionCreators } from 'store/volunteers';
import { Attendee, AttendeeMap } from 'store/attendees/dto';
import { VolunteerTimeclockEntry, ScheduledVolunteerShift } from 'store/volunteers';
import AttendeeName from '../Volunteers/fields/attendeeName';

interface CustomProps extends FormComponentProps {
  hasFirstDataLoaded: boolean;
  attendees: AttendeeMap;
  boardOnDuty: Attendee;
}

type Props = CustomProps &
  typeof attendeeActionCreators &
  typeof volunteersActionCreators;

interface Dimension {
  width: number;
  height: number;
}

interface State {
  formItemSize: Dimension;
  selectedBoard: Attendee | null;
  selectedESD: Attendee | null;
}

class ControlPanelComponent extends Component<Props, State> {
  state = {
  } as State;

  componentWillMount() {
    this.setState({
    });
  }

  render() {
    return (<div>&nbsp;</div>);
  }
}

export default Form.create()(
  connect(
    (state: ApplicationState, ownProps: CustomProps | undefined) => {
      if (state.attendees.attendees) {
        let { attendees } = state.attendees;
        let { active, scheduled } = state.volunteers;

        let board: Attendee[];

        if (ownProps && !ownProps.hasFirstDataLoaded && scheduled.length > 0) {
          board = _.filter(attendees, a => a.department === 'Board' && (a.wristband || '') !== '');

          return { ...ownProps, active, scheduled, attendees, board };
        }

        return { ...ownProps, active, scheduled, attendees };
      }
      return { ...ownProps };
    },
    { ...attendeeActionCreators, ...volunteersActionCreators }
  )(ControlPanelComponent)
) as typeof ControlPanelComponent;