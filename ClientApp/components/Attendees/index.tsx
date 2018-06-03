import * as React from 'react';
import { Component } from 'react';
import * as ReactDOM from 'react-dom';
import { Link, RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';
import { ApplicationState }  from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { AttendeesState, AddTableProps } from 'store/attendees/dto';
import { StatefulTable, StatefulRow } from 'store/attendees/table';

import { Input, Select, Button, Switch, Table, Row, Col, Form } from 'antd';
import { SelectValue } from 'antd/lib/select';
import { ColumnProps } from 'antd/lib/table/Column';

const FormItem = Form.Item;
const Option = Select.Option;
const Search = Input.Search;

import DOBInput from './fields/dob';
import WristbandInput from './fields/wristband';
import Buttons from './fields/buttons';
import RemovedWristbands from './fields/removedWristbands';
import ArrivalDate from './fields/arrivalDate';
import AddModal from './addModal';
import './style';

import * as _ from 'lodash';
import $ from 'jquery';
import moment, { Moment } from 'moment';

interface TableState {
  columns: ColumnProps<Attendee>[];
  hasPerformedInitialUpdate: boolean;
  modal: JSX.Element | null;
  searchValue: string;
  categoryFilter: string;
  showPreEventInfo: boolean;
  showEmail: boolean;
  showRegistration: boolean;
}

class AttendeesTable extends StatefulTable<TableState> {
  private debouncedSearch = _.debounce(
      () => {
        this.props.updateSearch(this.state.searchValue, this.state.categoryFilter);
      },
      500
    );

  componentWillMount() {
    this.setState(
      {
        hasPerformedInitialUpdate: false,
        modal: null,
        searchValue: '',
        categoryFilter: 'Everyone',
        columns: [
          { /* Entry Date */
            title: 'Entry Date',
            dataIndex: 'permittedEntryDate',
            width: 100,
            render: (text: string, attendee: Attendee) => {
              if (attendee.permittedEntryDate) {
                return attendee.permittedEntryDate.format('ddd DD');
              }
              return '';
            },
            sorter: (a: Attendee, b: Attendee) => {
              if (a.permittedEntryDate !== null
                  && b.permittedEntryDate !== null
                  && a.permittedEntryDate.valueOf() !== b.permittedEntryDate.valueOf()
                ) {
                return a.permittedEntryDate.valueOf() < b.permittedEntryDate.valueOf() ? -1 : 1;
              }

              if ((a.permittedEntryDate || moment.min()).valueOf() === (b.permittedEntryDate || moment.min()).valueOf()) {
                let sortLast = Intl.Collator().compare(a.name.lastName, b.name.lastName);
                if (sortLast === 0) {
                  return Intl.Collator().compare(a.name.firstName, b.name.firstName);
                }
                return sortLast;
              }

              if (a.permittedEntryDate == null) {
                return 1;
              }

              return -1;
            }
          },
          { /* Camp / Department */
            title: 'Camp / Department',
            dataIndex: 'department',
            render: (text: string, attendee: Attendee) => {
              if (attendee.department) {
                return `${attendee.department}`;
              }
              if (attendee.themeCamp) {
                return `${attendee.themeCamp}`;
              }
              return '';
            }
          },
          { /* Full Name */
            title: 'Full Name',
            key: 'fullName',
            width: 280,
            render: (text: string, attendee: Attendee) =>
              (<span>{attendee.name.firstName} <b>{attendee.name.lastName}</b></span>),
            sorter: (a: Attendee, b: Attendee) => {
              let sortLast = Intl.Collator().compare(a.name.lastName, b.name.lastName);
              if (sortLast === 0) {
                return Intl.Collator().compare(a.name.firstName, b.name.firstName);
              }
              return sortLast;
            }
          },
          { /* Age */
            title: '',
            key: 'age',
            width: 42,
            render: (text: string, attendee: Attendee) => {
              var age = _.round(attendee.age, 0);
              if (age < 13) {
                return <span className="ageSpan" style={{'color': '#FF0000'}}>&lt;&nbsp;13</span>;
              }

              if (age >= 13 && age < 18) {
                return <span className="ageSpan" style={{'color': '#FF4000'}}>&lt;&nbsp;18</span>;
              }

              if (age >= 13 && age < 21) {
                return <span className="ageSpan" style={{'color': '#FF8000'}}>&lt;&nbsp;21</span>;
              }

              return <span className="ageSpan">&nbsp;</span>;
            }
          },
          { /* DOB */
            title: 'DOB',
            key: 'dob',
            width: 110,
            render: (text: string, attendee: Attendee) => (
              <DOBInput
                dataid={attendee.id}
                table={this}
                ref={input => {
                  this.setInputState(attendee.id, 'dob', { input });
                }}
              />
            )
          },
          { /* Wristband */
            title: 'Wristband',
            key: 'wristband',
            width: 104,
            render: (text: string, attendee: Attendee) =>
              <WristbandInput
                dataid={attendee.id}
                table={this}
                ref={input => {
                  this.setInputState(attendee.id, 'wristband', { input });
                }}
              />
          },
          { /* Buttons */
            title: '',
            dataIndex: 'row.buttons.mode',
            render: (text: string, attendee: Attendee) =>
              <Buttons dataid={attendee.id} />
          },
          { /* Removed Wristbands */
            title: '',
            dataIndex: 'removedWristbands',
            render: (text: string, attendee: Attendee) =>
              <RemovedWristbands dataid={attendee.id} />
          },
          { /* Arrived */
            title: 'Arrived',
            key: 'arrivalDate',
            render: (text: string, attendee: Attendee) =>
              <ArrivalDate dataid={attendee.id} />
          },
          { /* E-Mail */
            title: 'E-Mail',
            dataIndex: 'emailAddress',
            render: (text: string) => (<samp className="form-inline">{text}</samp>)
          },
          { /* Registration */
            title: 'Registration',
            dataIndex: 'id',
            render: (text: string) => (<samp className="form-inline">{text}</samp>)
          },
          { /* Delete Button */
            title: '',
            width: 22,
            render: (text: string, attendee: Attendee) =>
              <Button icon="edit" onClick={(e) => this.onShowModal(e, attendee)} />
          },
          { /* Delete Button */
            title: '',
            width: 22,
            render: (text: string, attendee: Attendee) =>
              <Button icon="delete" type="danger" onClick={(e) => this.props.deleteAttendee(attendee.id)} />
          }
        ]
      });

    this.onRecordBlur = this.onRecordBlur.bind(this);
  }

  componentDidMount() {
    this.props.setTableRef(this);

    this.setState({
      showPreEventInfo: localStorage.getItem('layout:attendee:table:showPreEventInfo') === 'true',
      showEmail: localStorage.getItem('layout:attendee:table:showEmail') === 'true',
      showRegistration: localStorage.getItem('layout:attendee:table:showRegistration') === 'true'
    });
  }

  componentWillReceiveProps(nextProps: AttendeesState) {
    if (nextProps.attendees && _.values(nextProps.attendees).length > 0 && !this.state.hasPerformedInitialUpdate) {
      this.props.setTableRef(this);

      this.setState(
        { hasPerformedInitialUpdate: true },
        () => this.props.updateSearch('', '')
      );
      return;
    }
  }

  public render() {
    let selectBefore = (
      <Select
        style={{ width: 150 }}
        value={this.state.categoryFilter || ''}
        onChange={this.onSearchCategoryChange}
      >
        <Option value="Everyone">Everyone</Option>
        <Option value="EarlyEntry">Early Entry Only</Option>
        <Option value="Confirmed">Confirmed</Option>
        <Option value="Unconfirmed">Unconfirmed</Option>
      </Select>
    );

    return (
      <div>
        <Search
          addonBefore={selectBefore}
          onChange={this.onSearchInputChange}
          value={this.state.searchValue}
          onFocus={() => { this.setState({ searchValue: '' }); }}
          onBlur={(e) => { this.props.updateSearch(this.state.searchValue, this.state.categoryFilter); }}
          style={{padding: '25px 0'}}
        />
        <Table
          className="attendee-table"
          dataSource={this.props.result}
          columns={_.filter(this.state.columns, (a) => {
            switch (a.title) {
              case 'Entry Date':
                return this.state.showPreEventInfo;
              case 'E-Mail':
                return this.state.showEmail;
              case 'Registration':
                return this.state.showRegistration;
              default:
                return true;
            }
          })}
          rowKey={this.rowKey}
          size="middle"
          onRow={(record) => { onBlur: this.onRecordBlur }}
          onChange={() => this.forceUpdate()}
          locale={{ emptyText: 'No Attendees Found' }}
        />
        <Row>
          <Col span={12} style={{ paddingTop: '10px' }}>
            <Form>
              <FormItem style={{ marginBottom: 0 }}>
                <Switch
                  size="small"
                  checked={this.state.showPreEventInfo}
                  onChange={(e) => {
                    localStorage.setItem('layout:attendee:table:showPreEventInfo', `${e}`);
                    this.setState({ showPreEventInfo: e });
                  }}
                /> Show Pre-Event Information
              </FormItem>
              <FormItem style={{ marginBottom: 0 }}>
                <Switch
                  size="small"
                  checked={this.state.showEmail}
                  onChange={(e) => {
                    localStorage.setItem('layout:attendee:table:showEmail', `${e}`);
                    this.setState({ showEmail: e });
                  }}
                /> Show E-Mail
              </FormItem>
              <FormItem style={{ marginBottom: 0 }}>
                <Switch
                  size="small"
                  checked={this.state.showRegistration}
                  onChange={(e) => {
                    localStorage.setItem('layout:attendee:table:showRegistration', `${e}`);
                    this.setState({ showRegistration: e });
                  }}
                /> Show Registration
              </FormItem>
            </Form>
          </Col>
          <Col span={12} style={{ textAlign: 'right', paddingTop: '10px' }}>
            <Button onClick={this.onShowModal}>Add Attendee</Button>
          </Col>
        </Row>
        {this.state.modal}
      </div>
    );
  }

  public setInputState(dataid: string, key: keyof StatefulRow, state: Pick<any, any> | any) {
    let row = this.props.attendees && this.props.attendees[dataid] && this.props.attendees[dataid].row;
    if (row) {
      row[key] = { ...row[key], ...state };
      return this.props.setRowState(dataid, row);
    }
  }

  private onSearchCategoryChange: (value: SelectValue) => void =
    (value: SelectValue) => {
      this.setState({ categoryFilter: value as string }, this.debouncedSearch);
    }

  private onSearchInputChange: (event: React.SyntheticEvent<HTMLInputElement>) => void =
    (event: React.SyntheticEvent<HTMLInputElement>) => {
      let searchValue = event.currentTarget.value;
      this.setState({ searchValue }, this.debouncedSearch);
    }

  private onShowModal: ((event: React.MouseEvent<HTMLButtonElement>, attendee: Attendee | null) => void) =
    (event: React.MouseEvent<HTMLButtonElement>, attendee: Attendee | null = null) => {
      this.setState({
        modal: (
          <AddModal
            onOk={(e) => this.setState({ modal: null })}
            onCancel={(e) => this.setState({ modal: null })}
            attendee={this.props.attendees[attendee.id]}
          />
        )
      });
    }

  private onRecordBlur: (event: React.MouseEvent<HTMLInputElement>) => void =
    (event: React.MouseEvent<HTMLInputElement>) => {
      let currentRow = $(event.target).closest('tr').get(0);
      let relatedRow = $(event.relatedTarget).closest('tr').get(0);

      if (relatedRow && currentRow !== relatedRow) {
        $(currentRow)
          .find('input')
          .each((index: number, element: HTMLElement) => {
            $(element).trigger('blur', { bubble: true });
          });
      }
    }

  private rowKey(record: {}, index: number) {
    return _.get(record, 'id');
  }
}

export default connect(
  (state: ApplicationState) => {
    _.each(state.attendees.attendees, _.partial(AddTableProps, state.attendees));

    return state.attendees;
  },
  actionCreators
)(AttendeesTable) as any as typeof AttendeesTable;