import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import InputMask from 'react-input-mask';
import { ApplicationState } from 'store';
import { AttendeeMap } from 'store/attendees';
import { Volunteer, VolunteerTimeclockEntry, ScheduledVolunteerShift, actionCreators } from 'store/volunteers';
import { DateTime } from 'luxon';
import { Table, Row, Col, Form, Input, Button, Icon, DatePicker } from 'antd';
import * as _ from 'lodash';
import moment, { Moment } from 'moment';

import { TimeSince } from './fields/timeSince';
import AttendeeName from './fields/attendeeName';
import './style';

const InputGroup = Input.Group;

interface Props {
  active: VolunteerTimeclockEntry[];
  scheduled: ScheduledVolunteerShift[];
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
  componentWillMount() {
    this.setState({
      modal: null,
      timeclockValue: '',
      found: null,
      scheduleDisplayedFor: moment(DateTime.local().startOf('day'))
    }, () => { this.props.loadScheduledShifts(this.state.scheduleDisplayedFor); });
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
        render: (text: string, row: ScheduledVolunteerShift) => row.begins.toFormat('ccc dd @ HH:mm')
      },
      {
        title: 'Ends',
        key: 'ends',
        dataIndex: 'ends',
        render: (text: string, row: ScheduledVolunteerShift) => row.ends.toFormat('ccc dd @ HH:mm')
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
                {DateTime.local().toFormat('ccc dd MMM').toUpperCase()} @&nbsp;
                <TimeSince value={DateTime.local().startOf('day').toUTC()} />
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
                  value={this.state.timeclockValue}
                />
                <Button type="primary" onClick={this.submitShiftChange}>Begin / End Shift</Button>
                <span style={{ paddingLeft: '10px', paddingTop: '6px', display: (this.state.found !== null) ? 'inline-block' : 'none' }}>
                  <span style={{ color: '#00CC00', fontWeight: 'bold' }}>found</span>:&nbsp;
                  <AttendeeName value={this.state.found ? this.state.found.id : null} />
                </span>
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
                  value={moment(this.state.scheduleDisplayedFor)}
                  onChange={this.onScheduleDisplayChanged}
                  allowClear={false}
                  format={'ddd DD MMM'}
                />
              </h2>
              <Table
                dataSource={this.props.displayed}
                columns={scheduleColumns}
                style={{ backgroundColor: '#FFF', marginTop: '10px' }}
                size={'middle'}
                rowKey={(record: {}) => (record as ScheduledVolunteerShift).Id}
                loading={this.props.isLoading}
                locale={{ emptyText: 'No Schedule Loaded' }}
                pagination={false}
              />
            </Col>
          </Row>
        </div>
    );
  }

  private onBlur: (event: React.FocusEvent<HTMLInputElement>) => void =
    (event: React.FocusEvent<HTMLInputElement>) => {
      /* var currentRow = $(event.target).closest('tr').get(0);
      var relatedRow = $(event.relatedTarget).closest('tr').get(0);

      if (currentRow !== relatedRow || this.props.value === '') {
        this.setState({ timeclockValue: '' });
      } */
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
        var current = _.filter(this.props.active, (vol) => vol.volunteerId === id);
        if (current.length === 0) {
          this.props.beginShift(id);
          return;
        }
        this.props.endShift(id);
      }
    }
}

export default connect(
  (state: ApplicationState) => state.volunteers,
  actionCreators
)(VolunteersComponent) as any as typeof VolunteersComponent;