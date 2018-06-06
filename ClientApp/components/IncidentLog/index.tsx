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
import './style';

interface CustomProps extends FormComponentProps {
  active: VolunteerTimeclockEntry[];
  scheduled: ScheduledVolunteerShift[];
  attendees: AttendeeMap;

  hasFirstDataLoaded: boolean;
  activeLead: OnShiftVolunteer | null;
  activeShiftLead: OnShiftVolunteer | null;
  volunteersInvolved: OnShiftVolunteer[];
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
  columns: ColumnProps<Row>[];
  severityMap: Map<number, Severity>;
  occurred: Moment;
}

interface Row {
  key: string;
  category: string;
  occured: Moment;
  severity: number;
}

interface Category {
  value: string;
  label?: string;
  children?: Array<Category>;
}

interface Severity {
  tableString: string;
  radioString: string;
  className: string;
}

interface OnShiftVolunteer extends Attendee {
  shift: ScheduledVolunteerShift | null;
}

const categories = _.cloneDeepWith([
    { value: 'Medical',
      children: [
        { value: 'ESD Transit' },
        { value: 'Ambulance On-Site' }
      ],
    },
    { value: 'Fire',
      children: [
        { value: 'FD On-Site (Non-Emergency)' },
        { value: 'FD On-Site (Emergency Response)' },
        { value: 'Fire Chief On-Site' }
      ]
    },
    { value: 'Security',
      children: [
        { value: 'Perimiter Violation' },
        { value: 'Officers On-Site' },
        { value: 'Attendee Missing' },
        { value: 'Attendee Removal' }
      ]
    },
    { value: 'Attendees',
      children: [
        { value: 'Wristband Issue' },
        { value: 'ID Verification Issue' },
        { value: 'Altercation' },
        { value: 'Consent Violation Report' }
      ]
    },
    { value: 'Volunteer Incident',
      children: [
        { value: 'Removed from shift' },
        { value: 'Professionalism Issue' }
      ]
    },
    { value: 'Vendors',
      children: [
        { value: 'Propane Delivery' },
        { value: 'Firewood Delivery' },
        { value: 'Ice Delivery' },
        { value: 'Pyrotechnal Assistance' }
      ]
    },
    { value: 'Other',
      children: [
        { value: 'Unexpected Gate Closure' },
        { value: 'Technical Issue' },
        { value: 'Not Listed' }
      ]
    }
  ] as Category[],
  (obj) => { if (_.isObject(obj)) { obj.label = obj.value; }
});

class IncidentLogComponent extends Component<Props, State> {
  state = {
    formItemSize: {
      width: -1,
      height: -1
    },
    occurred: moment(),
    severityMap: new Map<number, Severity>([
      [0, { tableString: 'Memo', radioString: 'Memo', className: 'severityNA' }],
      [1, { tableString: 'Low', radioString: 'Low', className: 'severityLow' }],
      [2, { tableString: 'Medium', radioString: 'Medium', className: 'severityMedium' }],
      [3, { tableString: 'High', radioString: 'High', className: 'severityHigh' }],
      [4, { tableString: 'Emergency', radioString: 'Emergency', className: 'severityCritical' }]
    ])
  } as State;

  componentWillMount() {
    this.setState({
      columns: [
        { title: '',
          key: 'severity',
          render: (row: Row) => {
            var severity = this.state.severityMap.get(row.severity);
            return severity && (
              <Tag className={severity.className}>{severity.tableString}</Tag>
            );
          },
          width: 98
        },
        { title: 'Occurred',
          key: 'occurred',
          render: (row: Row) => row.occured.format('ddd MM-DD HH:mm'),
          width: 130
        },
        { title: 'Category',
          key: 'category',
          render: (row: Row) => row.category,
          width: 310
        },
        { title: 'Summary',
          key: 'summary',
          render: (row: Row) => ''
        }
      ]
    });
  }

  render() {
    const { getFieldDecorator, setFieldsValue } = this.props.form;
    const { width, height } = this.state.formItemSize;

    const formItemLayout = {
      labelCol:   { sm: { span:  7 }, },
      wrapperCol: { sm: { span: 17 }, },
    };

    const mockup: Row[] = [
      { key: '0001', severity: 4, occured: moment().subtract(0.3, 'hours'), category: 'Medical / Ambulance On-Site' },
      { key: '0002', severity: 2, occured: moment().startOf('day').add(5.6, 'hours') },
      { key: '0003', severity: 2, occured: moment().startOf('day').add(1.2, 'hours') },
      { key: '0004', severity: 2, occured: moment().startOf('day').add(6.3, 'hours') },
      { key: '0005', severity: 1, occured: moment().startOf('day').add(1.4, 'hours') },
      { key: '0006', severity: 0, occured: moment().startOf('day').add(8.9, 'hours'), category: 'Volunteer Incident / Professionalism Issue' },
      { key: '0007', severity: 0, occured: moment().startOf('day').add(11, 'hours') },
      { key: '0008', severity: 0, occured: moment().startOf('day').add(1, 'hours') },
      { key: '0009', severity: 0, occured: moment().startOf('day').add(2, 'hours') },
      { key: '0010', severity: 0, occured: moment().startOf('day').add(3, 'hours') },
      { key: '0011', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0012', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0013', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0014', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0015', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0016', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0017', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0018', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0019', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0020', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0021', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0022', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0023', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0024', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0025', severity: 0, occured: moment().startOf('day').add(4, 'hours') },
      { key: '0026', severity: 0, occured: moment().startOf('day').add(4, 'hours') }
    ];

    if (!this.props.scheduled) {
      return (<div>&nbsp;</div>);
    }

    return (
      <div>
        <Row style={{ paddingTop: '20px' }}>
          <Col span={7}>
            <Form onSubmit={this.onSubmit} layout={'horizontal'}>
              <FormItem
                {...formItemLayout}
                label="Date / Time of Incident"
              >
                {getFieldDecorator('dateOfOccurance', {
                  initialValue: this.state.occurred
                })(
                  <DatePicker showTime={true} format={'YYYY-MM-DD HH:mm'} />
                )}
              </FormItem>
              <Measure
                bounds
                onResize={(contentRect) => {
                  this.setState({ formItemSize: contentRect.bounds })
                }}
              >
                {({ measureRef }) => (
                  <FormItem
                    {...formItemLayout}
                    label="Category"
                  >
                    <div ref={measureRef} style={{ width: '100%' }}>
                      {getFieldDecorator('category', { })(
                        <Cascader
                          options={categories}
                          showSearch={{ matchInputWidth: true }}
                          popupClassName={'categoryPopup'}
                        />
                      )}
                    </div>
                  </FormItem>
                )}
              </Measure>
              <FormItem
                {...formItemLayout}
                label="Severity"
              >
                {getFieldDecorator('severity', {
                  initialValue: '0'
                })(
                  <RadioGroup>
                    <RadioButton value="0" className={'severityNA'}>Memo</RadioButton>
                    <RadioButton value="1" className={'severityLow'}>Low</RadioButton>
                    <RadioButton value="2" className={'severityMedium'}>Medium</RadioButton>
                    <RadioButton value="3" className={'severityHigh'}>High</RadioButton>
                    <RadioButton value="4" className={'severityCritical'}>Emergency</RadioButton>
                  </RadioGroup>
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Vendor Name"
              >
                {getFieldDecorator('vendor', { })(
                  <Input autoComplete={'off'} />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Summary"
              >
                {getFieldDecorator('summary', { })(
                  <Input
                    placeholder={'please give a brief description of the incident.'}
                    autoComplete={'off'}
                  />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Gate Lead On-Call"
              >
                <InputGroup compact={true}>
                  {getFieldDecorator('gate_lead', {
                    initialValue: this.props.activeLead && this.props.activeLead.wristband || ''
                  })(
                    <InputMask
                      className={`ant-input overlayed`}
                      style={{ width: '56px' }}
                      name="wristband"
                      mask="9999"
                      maskChar=""
                      formatChars={{ '9': '[0-9]' }}
                      autoComplete={'off'}
                      onChange={(e) => {

                      }}
                    />
                  )}
                  <AttendeeName
                    className={'ant-input ant-input-no-hover'}
                    style={{ width: `${width - 56}px` }}
                    value={this.props.activeLead && this.props.activeLead.id || ''}
                  />
                </InputGroup>
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Shift Lead"
              >
                <InputGroup compact={true}>
                  {getFieldDecorator('shift_lead', {
                    initialValue: this.props.activeShiftLead && this.props.activeShiftLead.wristband || ''
                  })(
                    <InputMask
                      className={`ant-input overlayed`}
                      style={{ width: '56px' }}
                      name="wristband"
                      mask="9999"
                      maskChar=""
                      formatChars={{ '9': '[0-9]' }}
                      autoComplete={'off'}
                    />
                  )}
                  <AttendeeName
                    className={'ant-input ant-input-no-hover'}
                    style={{ width: `${width - 56}px` }}
                    value={this.props.activeShiftLead && this.props.activeShiftLead.id || ''}
                  />
                </InputGroup>
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Volunteer(s) Involved"
              >
                {getFieldDecorator('volunteers', { })(
                  <Select
                    placeholder={''}
                    mode={'tags'}
                  />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Attendee(s) Involved"
              >
                {getFieldDecorator('attendees', { })(
                  <Select
                    placeholder={''}
                    mode={'tags'}
                  />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Other(s) Involved"
              >
                {getFieldDecorator('others', { })(
                  <Select
                    placeholder={''}
                    mode={'tags'}
                  />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Vehicle(s) Involved"
              >
                {getFieldDecorator('vehicles', { enabled: false })(
                  <InputGroup compact={true}>
                    <Checkbox
                      className={'ant-input'}
                      style={{ float: 'left' }}
                    />
                    <Select
                      placeholder={''}
                      mode={'tags'}
                      style={{ width: `${width - 40}px`, float: 'left' }}
                      disabled={true}
                    />
                  </InputGroup>
                )}
              </FormItem>
              <FormItem
                wrapperCol={{
                  span: formItemLayout.wrapperCol.sm.span,
                  offset: formItemLayout.labelCol.sm.span
                }}
              >
                {getFieldDecorator('reentry', { })(
                  <Checkbox style={{ paddingLeft: '9px', display: 'block' }}>Re-Entry Permitted</Checkbox>
                )}
                {getFieldDecorator('followup', { })(
                  <Checkbox style={{ paddingTop: '10px', display: 'block' }}>Follow-Up Required</Checkbox>
                )}
                {getFieldDecorator('keepOpen', { })(
                  <Checkbox style={{ paddingTop: '10px', display: 'block'  }}>Keep Incident Open</Checkbox>
                )}
                <Button type="primary" htmlType="submit" style={{ float: 'right', marginTop: '-30px' }}>Add Incident</Button>
              </FormItem>
            </Form>
          </Col>
          <Col span={17} style={{ paddingLeft: '30px' }}>
            <Table
              columns={this.state.columns}
              dataSource={mockup}
              pagination={{ pageSize: 20 }}
              expandedRowRender={this.incidentExpandedRender}
              size={'small'}
            />
          </Col>
        </Row>
      </div>
    );
  }

  private incidentExpandedRender =
    (row: Row) => {
      return (
        <div>{row.key}</div>
      );
    }

  private onSubmit: ((event: React.FormEvent<HTMLFormElement>) => void) =
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    }
}

const loadMatchingOnShiftVolunteers =
  (schedule: ScheduledVolunteerShift[], attendees: AttendeeMap, task: string, time: Moment) => {
    return _.map(
      _.filter(schedule,
        (shift) =>
          shift.task === task &&
          shift.begins.isBefore(time) &&
          shift.ends.isAfter(time)
      ),
      (shift) => {
        return { shift,
          ...attendees[shift.volunteerId]
        } as OnShiftVolunteer;
      }
    );
  };

export default Form.create()(
  connect(
    (state: ApplicationState, ownProps: CustomProps | undefined) => {
      if (state.attendees.attendees) {
        let { attendees } = state.attendees;
        let { active, scheduled } = state.volunteers;

        let activeLead: OnShiftVolunteer | null = null;
        let activeShiftLead: OnShiftVolunteer | null = null;

        if (ownProps && !ownProps.hasFirstDataLoaded && scheduled.length > 0) {
          activeLead = _.first(loadMatchingOnShiftVolunteers(
              scheduled,
              attendees,
              'Lead On Duty',
              moment()
            )) || null;

          activeShiftLead = _.first(loadMatchingOnShiftVolunteers(
              scheduled,
              attendees,
              'Volunteer Lead Shift',
              moment()
            )) || null;

          return { ...ownProps, active, scheduled, attendees, activeLead, activeShiftLead };
        }

        return { ...ownProps, active, scheduled, attendees };
      }
      return { ...ownProps };
    },
    { ...attendeeActionCreators, ...volunteersActionCreators }
  )(IncidentLogComponent)
) as typeof IncidentLogComponent;