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
  active: VolunteerTimeclockEntry[];
  scheduled: ScheduledVolunteerShift[];
  attendees: AttendeeMap;

  hasFirstDataLoaded: boolean;
  board: Attendee[];
  esd: Attendee[];
  activeLead?: OnShiftVolunteer;
  activeCoordinator?: OnShiftVolunteer;
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

  categoryValue: string[];
  selectedRowKeys: string[];

  selectedBoard?: Attendee;
  selectedESD?: Attendee;

  inputValAttendees?: Attendee[];
  inputValLead?: OnShiftVolunteer;
  inputValCoordinator?: OnShiftVolunteer;
  inputValVolunteers?: Attendee[];

  inputOptionsAttendees?: Attendee[];
  inputOptionsVolunteers?: Attendee[];
}

interface Row {
  key: string;
  category: string[];
  occured: Moment;
  severity: number;
  summary: string;
  bodoc: string;
  lead: string;
  coordinator: string;
  esdAuthBy?: string;
  attendees?: string[];
  volunteers?: string[];
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
        { value: 'Ambulance Called' }
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
        { value: 'Off-Site' },
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
    categoryValue: [],
    columns: [],
    selectedRowKeys: ['0001'],
    formItemSize: {
      width: -1,
      height: -1
    } as Dimension,
    occurred: moment(),
    severityMap: new Map<number, Severity>([
      [0, { tableString: 'Memo', radioString: 'Memo', className: 'severityNA' }],
      [1, { tableString: 'Low', radioString: 'Low', className: 'severityLow' }],
      [2, { tableString: 'Medium', radioString: 'Medium', className: 'severityMedium' }],
      [3, { tableString: 'High', radioString: 'High', className: 'severityHigh' }],
      [4, { tableString: 'Emergency', radioString: 'Emergency', className: 'severityCritical' }]
    ])
  };

  componentWillMount() {
    this.setState({
      selectedBoard: (this.props.board && this.props.board.length === 1)
        ? _.first(this.props.board) || undefined
        : _.first(this.props.board) || undefined,
      inputValLead: this.props.activeLead,
      inputValCoordinator: this.props.activeCoordinator,
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
          render: (row: Row) => _.join(row.category, ' / '),
          width: 310
        },
        { title: 'Summary',
          key: 'summary',
          render: (row: Row) => {
            return (
              <span>
                {_.map(row.attendees || [], a => <AttendeeName key={a} value={a} style={{ fontWeight: 'bold' }} />)}
                {row.attendees && row.attendees.length > 0 ? ' involved in ' : ''}
                {row.summary}
              </span>
            );
          }
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
      {
        key: '0001',
        severity: 4,
        occured: moment().subtract(0.3, 'hours'),
        category: ['Medical', 'Ambulance Called'],
        summary: 'generator refueling incident',
        bodoc: '10033-029f383d654c500922f9368167d505cd',
        lead: '10855-a25f573b1fd4c1eaa2229a98933ad47e',
        coordinator: '12031-1f74c51339e39cbc442dc44c4a227a73',
        attendees: ['10747-e36ec58c733e09c1d4d9aea36e4c4010']
      },
      { key: '0002', severity: 2, occured: moment().startOf('day').add(5.6, 'hours') },
      { key: '0006', severity: 0, occured: moment().startOf('day').add(8.9, 'hours'), category: ['Attendees', 'Off-Site'] }
    ];

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
                bounds={true}
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
                          onChange={this.onChangeCategory}
                        />
                      )}
                    </div>
                  </FormItem>
                )}
              </Measure>
              <FormItem
                {...formItemLayout}
                label="Severity"
                style={{
                  display: this.state.categoryValue &&
                    this.state.categoryValue.length > 0 &&
                    _.intersection(
                      this.state.categoryValue, ['Vendors', 'Off-Site']
                    ).length === 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('severity', {
                  initialValue: 0
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
                label="Authorising ESD Member"
                style={{
                  display: this.state.categoryValue && _.intersection(
                      this.state.categoryValue, ['ESD Transit']
                    ).length > 0 ? 'block' : 'none'
                }}
              >
                <InputGroup compact={true}>
                    <InputMask
                      className={`ant-input overlayed`}
                      style={{ width: '56px' }}
                      name="wristband"
                      mask="9999"
                      maskChar=""
                      formatChars={{ '9': '[0-9]' }}
                      autoComplete={'off'}
                      disabled={true}
                      value={this.state.selectedESD && this.state.selectedESD.wristband || ''}
                    />
                  {getFieldDecorator('esd', {
                    initialValue: this.state.selectedESD && this.state.selectedESD.id
                  })(
                    <Select
                      style={{ width: `${width - 56}px`}}
                      onChange={(e) => {
                        this.setState({ selectedESD: this.props.attendees[`${e}`] });
                      }}
                    >
                      {_.map(this.props.esd,
                        (a: Attendee) => <Option key={`esd-${a.id}`} value={a.id}><AttendeeName value={a.id} /></Option>
                      )}
                    </Select>
                  )}
                </InputGroup>
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Vendor Name"
                style={{
                  display: this.state.categoryValue && _.intersection(
                      this.state.categoryValue, ['Vendors']
                    ).length > 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('vendor', { })(
                  <Input autoComplete={'off'} />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="BODOC"
              >
                <InputGroup compact={true}>
                    <InputMask
                      className={`ant-input overlayed`}
                      style={{ width: '56px' }}
                      name="wristband"
                      mask="9999"
                      maskChar=""
                      formatChars={{ '9': '[0-9]' }}
                      autoComplete={'off'}
                      disabled={true}
                      value={this.state.selectedBoard && this.state.selectedBoard.wristband || ''}
                    />
                  {getFieldDecorator('bodoc', {
                    initialValue: this.state.selectedBoard && this.state.selectedBoard.id
                  })(
                    <Select
                      style={{ width: `${width - 56}px`}}
                      onChange={(e) => {
                        this.setState({ selectedBoard: this.props.attendees[`${e}`] });
                      }}
                    >
                      {_.map(this.props.board,
                        (a: Attendee) => <Option key={`boardOpt-${a.id}`} value={a.id}><AttendeeName value={a.id} /></Option>
                      )}
                    </Select>
                  )}
                </InputGroup>
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
                        let { value } = e.currentTarget;
                        if (value.length < 4 && this.state.inputValLead) {
                          this.setState({ inputValLead: null });
                        }
                        if (value.length === 4) {
                          this.setState({ inputValLead: _.find(this.props.attendees, a => a.wristband === value) });
                        }
                      }}
                    />
                  )}
                  <AttendeeName
                    className={'ant-input ant-input-no-hover'}
                    style={{ width: `${width - 56}px` }}
                    value={this.state.inputValLead && this.state.inputValLead.id || ''}
                  />
                </InputGroup>
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Shift Lead"
              >
                <InputGroup compact={true}>
                  {getFieldDecorator('shift_lead', {
                    initialValue: this.props.activeCoordinator && this.props.activeCoordinator.wristband || ''
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
                        let { value } = e.currentTarget;
                        if (value.length < 4 && this.state.inputValLead) {
                          this.setState({ inputValCoordinator: null });
                        }
                        if (value.length === 4) {
                          this.setState({ inputValCoordinator: _.find(this.props.attendees, a => a.wristband === value) });
                        }
                      }}
                    />
                  )}
                  <AttendeeName
                    className={'ant-input ant-input-no-hover'}
                    style={{ width: `${width - 56}px` }}
                    value={this.state.inputValCoordinator && this.state.inputValCoordinator.id || ''}
                  />
                </InputGroup>
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Gate Volunteer(s) Involved"
                style={{
                  display: this.state.categoryValue && _.intersection(
                      this.state.categoryValue, ['Volunteer Incident', 'Altercation']
                    ).length > 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('volunteers', {
                  initialValue: _.map(this.state.inputValVolunteers, (a: Attendee) => a.wristband)
                })(
                  <Select
                    placeholder={'enter wristband number(s)'}
                    mode={'tags'}
                    onChange={this.onAttendeeSelect.bind(this, 'inputValVolunteers', 'inputOptionsVolunteers')}
                  >
                    {_.map(this.state.inputOptionsVolunteers || [],
                      (a: Attendee) => <Option key={`esd-${a.id}`} value={a.wristband || ''}><AttendeeName value={a.id} /></Option>
                    )}
                  </Select>
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Attendee(s) Involved"
                style={{
                  display: this.state.categoryValue &&
                  this.state.categoryValue.length > 0 &&
                  _.intersection(
                      this.state.categoryValue, ['Vendors', 'Other', 'Removed from shift']
                    ).length === 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('attendees', { })(
                  <Select
                    placeholder={'enter wristband number(s)'}
                    mode={'tags'}
                    onChange={this.onAttendeeSelect.bind(this, 'inputValAttendees', 'inputOptionsAttendees')}
                  >
                    {_.map(this.state.inputOptionsAttendees || [],
                      (a: Attendee) => <Option key={`esd-${a.id}`} value={a.wristband || ''}><AttendeeName value={a.id} /></Option>
                    )}
                  </Select>
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Other(s) Involved"
                style={{
                  display: this.state.categoryValue &&
                  this.state.categoryValue.length > 0  &&
                  _.intersection(
                      this.state.categoryValue, ['Vendors', 'Other', 'Removed from shift', 'Off-Site']
                    ).length === 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('others', { })(
                  <Select
                    placeholder={'enter name(s)'}
                    mode={'tags'}
                  />
                )}
              </FormItem>
              <FormItem
                {...formItemLayout}
                label="Summary"
                style={{
                  display: this.state.categoryValue &&
                    this.state.categoryValue.length > 0 &&
                    _.intersection(
                        this.state.categoryValue, ['Vendors']
                      ).length === 0 ? 'block' : 'none'
                }}
              >
                {getFieldDecorator('summary', { })(
                  <Input
                    placeholder={'please give a brief description of the incident.'}
                    autoComplete={'off'}
                  />
                )}
              </FormItem>
              <FormItem
                wrapperCol={{
                  span: formItemLayout.wrapperCol.sm.span,
                  offset: formItemLayout.labelCol.sm.span
                }}
              >
                {getFieldDecorator('reentry', { })(
                  <Checkbox
                    style={{
                      paddingLeft: '9px',
                      display: this.state.categoryValue && _.intersection(
                          this.state.categoryValue, ['ESD Transit', 'Off-Site']
                        ).length > 0 ? 'block' : 'none'
                    }}
                  >
                    Re-Entry Permitted
                  </Checkbox>
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
              expandedRowKeys={this.state.selectedRowKeys}
              expandRowByClick={true}
              onExpandedRowsChange={(r) => this.setState({ selectedRowKeys: _.difference(r as string[], this.state.selectedRowKeys) })}
              expandedRowRender={this.incidentExpandedRender}
              expandIconAsCell={false}
              size={'small'}
            />
          </Col>
        </Row>
      </div>
    );
  }

  private incidentExpandedRender =
    (row: Row) => {
      var label = {
        span: 8,
        style: {
          textAlign: 'right',
          paddingRight: '8px'
        }
      };

      var wristband = {
        span: 3,
        className: 'monospace',
        style: {
          textAlign: 'center'
        }
      };

      return (
        <div style={{ paddingBottom: '2em' }}>
          <Row>
            <Col span={8}>
              <Row>
                <Col {...label}>BODOC</Col>
                <Col {...wristband}>0002</Col>
                <Col span={13}><AttendeeName value={this.props.getIdFromWristband('0002')} /></Col>
              </Row>
              <Row>
                <Col {...label}>Gate Lead On-Call</Col>
                <Col {...wristband}>0001</Col>
                <Col span={13}><AttendeeName value={this.props.getIdFromWristband('0001')} /></Col>
              </Row>
              <Row>
                <Col {...label}>Shift Lead</Col>
                <Col {...wristband}>0003</Col>
                <Col span={13}><AttendeeName value={this.props.getIdFromWristband('0003')} /></Col>
              </Row>
            </Col>
            <Col span={16}>heyo!</Col>
          </Row>
        </div>
      );
    }

  private onChangeCategory =
    (e: string[]) => {
      if (_.difference(e, ['Medical', 'Ambulance Called']).length === 0) {
        this.props.form.setFieldsValue({ 'severity': '4' });
      }

      this.setState({ categoryValue: e });
    }

  private onAttendeeSelect =
    (valueKey: string, optionKey: string, e: string[]) => {
      var tags = _.filter<string>(e,
        (v: any) => typeof v === 'string' && (v as string).length === 4
      );
      var vols: Attendee[] = _.filter(_.map(tags,
        (tag: string) => _.find(this.props.attendees, a => a.wristband === tag)
      ), a => a || null !== null) as Attendee[];

      var addVols = _.difference<Attendee>(vols, _.get(this.state, optionKey) || []);

      var state = _.set(
        _.set({}, valueKey, vols),
        optionKey,
        [...(_.get(this.state, optionKey) || []), ...addVols]
      );

      this.setState(state);

      if (tags.length !== e.length) {
        this.props.form.setFieldsValue({
          volunteers: _.map(_.get(this.state, valueKey), (a: Attendee) => a.wristband)
        });
      }
    }

  private onSubmit =
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

        let board: Attendee[];
        let esd: Attendee[];
        let activeLead: OnShiftVolunteer | null = null;
        let activeCoordinator: OnShiftVolunteer | null = null;

        if (ownProps && !ownProps.hasFirstDataLoaded && scheduled.length > 0) {
          esd = _.filter(attendees, a => a.department === 'ESD' && (a.wristband || '') !== '');
          board = _.filter(attendees, a => a.department === 'Board' && (a.wristband || '') !== '');

          activeLead = _.first(loadMatchingOnShiftVolunteers(
              scheduled,
              attendees,
              'Lead On Duty',
              moment()
            )) || null;

          activeCoordinator = _.first(loadMatchingOnShiftVolunteers(
              scheduled,
              attendees,
              'Volunteer Lead Shift',
              moment()
            )) || null;

          return { ...ownProps, active, scheduled, attendees, board, esd, activeLead, activeCoordinator };
        }

        return { ...ownProps, active, scheduled, attendees };
      }
      return { ...ownProps };
    },
    { ...attendeeActionCreators, ...volunteersActionCreators }
  )(IncidentLogComponent)
) as typeof IncidentLogComponent;