import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import InputMask from 'react-input-mask';
import { ApplicationState } from 'store';
import { AttendeeMap } from 'store/attendees';
import { Volunteer, VolunteerTimeclockEntry, ScheduledVolunteerShift, actionCreators } from 'store/volunteers';
import { Table, Row, Col, Form, Input, Button, Icon, DatePicker } from 'antd';
import * as _ from 'lodash';
import moment, { Moment } from 'moment';

import { TimeSince } from './fields/timeSince';
import AttendeeName from './fields/attendeeName';
import './style';

const InputGroup = Input.Group;

interface Props {
  active: VolunteerTimeclockEntry[];
  displayed: ScheduledVolunteerShift[];
  isLoading: boolean;

  searchByWristband: (
    wristband: string,
    callback: (volunteer: Volunteer) => void
  ) => void;
  beginShift: (id: string) => void;
  endShift: (id: string) => void;
  loadScheduledShifts: (displayAfter: Moment) => undefined;
}

interface State {
  modal: JSX.Element | null;
  timeclockValue: string;
  found: Volunteer | null;
  scheduleDisplayedFor: Moment;
}

class VolunteersComponent extends Component<Props, State> {
  state = {
    scheduleDisplayedFor: moment()
  } as State;

  componentWillMount() {
    this.props.loadScheduledShifts(this.state.scheduleDisplayedFor);
  }

  render() {
    const columns = [
      {
        title: 'Name',
        key: 'name',
        render: (row: VolunteerTimeclockEntry) => <AttendeeName value={row.volunteerId} />
      },
      {
        title: 'Time On Shift',
        key: 'in',
        render: (row: VolunteerTimeclockEntry) => <TimeSince value={row.in} />
      }
    ];

    const scheduleColumns = [
      {
        title: 'Shift Type',
        key: 'task',
        dataIndex: 'task'
      },
      {
        title: 'Begins',
        key: 'begins',
        dataIndex: 'begins',
        render: (text: string, row: ScheduledVolunteerShift) =>
          (typeof row.begins === 'string'
            ? moment(row.begins)
            : row.begins
          ).format('ddd DD, HH:mm')
      },
      {
        title: 'Ends',
        key: 'ends',
        dataIndex: 'ends',
        render: (text: string, row: ScheduledVolunteerShift) =>
          (typeof row.ends === 'string'
            ? moment(row.ends)
            : row.ends
          ).format('ddd DD, HH:mm')
      },
      {
        title: 'Scheduled',
        key: 'volunteerId',
        render: (row: ScheduledVolunteerShift) => <AttendeeName value={row.volunteerId} />
      }
    ];

    return (
        <div style={{ width: '100%' }}>
          <Row style={{ marginTop: '10px', marginBottom: '10px' }}>
            <Col span={24}>
              <h1>
                <Icon type="clock-circle-o" />&nbsp;
                <TimeSince value={moment().local().startOf('day').utc()} />,&nbsp;
                {moment().local().format('ddd DD MMM').toUpperCase()}
              </h1>
            </Col>
          </Row>
          <Row>
            <Col span={8} style={{ paddingRight: '10px' }}>
              <h2>Active Volunteers</h2>
              <InputGroup compact={true}>
                <InputMask
                  maxLength={4}
                  className={`ant-input`}
                  style={{ width: '90px' }}
                  name="wristband"
                  mask="9999"
                  maskChar=""
                  formatChars={{ '9': '[0-9]' }}
                  onChange={this.onChanged}
                  onBlur={this.onBlur}
                  onFocus={this.onFocus}
                  value={this.state.timeclockValue}
                  autoComplete={'off'}
                />
                <span
                  className={'ant-input ant-input-no-hover'}
                  style={{
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    paddingTop: '6px',
                    width: '300px',
                    display: 'inline-block'
                  }}
                >
                  &nbsp;
                  {(this.state.found != null)
                    ? (<AttendeeName value={this.state.found ? this.state.found.id : null} />)
                    : ('')
                  }
                </span>
                <Button type="primary" onClick={this.submitShiftChange}>Begin / End Shift</Button>
              </InputGroup>
              <Table
                dataSource={this.props.active}
                columns={columns}
                style={{ backgroundColor: '#FFF', marginTop: '10px' }}
                pagination={false}
                size={'small'}
                rowKey={(record: {}) => (record as VolunteerTimeclockEntry).volunteerId}
                locale={{ emptyText: 'No Active Volunteers' }}
              />
            </Col>
            <Col span={16}>
              <h2>Scheduled for
                <DatePicker
                  value={this.state.scheduleDisplayedFor}
                  onChange={this.onScheduleDisplayChanged}
                  allowClear={false}
                  format={'ddd DD MMM'}
                  id={'displayedScheduleDatePicker'}
                />
              </h2>
              <Table
                dataSource={this.props.displayed}
                columns={scheduleColumns}
                style={{ backgroundColor: '#FFF', marginTop: '10px' }}
                size={'middle'}
                rowKey={(record: {}) => (record as ScheduledVolunteerShift).id}
                loading={this.props.isLoading}
                locale={{ emptyText: 'No Schedule Loaded' }}
                pagination={false}
              />
            </Col>
          </Row>
        </div>
    );
  }

  private onFocus: (event: React.FocusEvent<HTMLInputElement>) => void =
    (event: React.FocusEvent<HTMLInputElement>) => {
      this.setState({ found: null, timeclockValue: '' });
    }

  private onBlur: (event: React.FocusEvent<HTMLInputElement>) => void =
    (event: React.FocusEvent<HTMLInputElement>) => {
      // noop
    }

  private onScheduleDisplayChanged: (date: Moment, dateString: string) => void =
    (date: Moment, dateString: string) => {
      this.setState(
        { scheduleDisplayedFor: date },
        () => { this.props.loadScheduledShifts(this.state.scheduleDisplayedFor); }
      );
    }

  private onChanged: (event: React.FormEvent<HTMLInputElement>) => void =
    (event: React.FormEvent<HTMLInputElement>) => {
      event.preventDefault();
      let { value } = event.currentTarget;

      this.setState({ timeclockValue: value }, () => {
        if (value.length === 4) {
          this.props.searchByWristband(value, (volunteer) => {
            if (volunteer) {
              this.setState({ found: volunteer });
            }
          });
        } else {
          this.setState({ found: null });
        }
      });
    }

  private submitShiftChange: ((event: React.MouseEvent<HTMLButtonElement>) => void) =
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (this.state.found) {
        let { id } = this.state.found;
        var current = _.find(this.props.active, (vol) => vol.volunteerId === id);
        if (current == null) {
          this.props.beginShift(id);
          this.setState({ found: null, timeclockValue: '' });
          return;
        }
        this.props.endShift(id);
        this.setState({ found: null, timeclockValue: '' });
      }
    }
}

export default connect(
  (state: ApplicationState, ownProps: Props | undefined) => {
    const { volunteers } = state;
    return { ...volunteers, ...ownProps };
  },
  actionCreators
)(VolunteersComponent) as any as typeof VolunteersComponent;