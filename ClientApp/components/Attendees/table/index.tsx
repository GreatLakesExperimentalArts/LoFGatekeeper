import * as React from 'react';
import { Component } from 'react';
import * as ReactDOM from 'react-dom';
import { Link, RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';
import { ApplicationState }  from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { AttendeesState } from 'store/attendees/dto';
import { StatefulTable, StatefulRow } from 'store/attendees/table';

import { Button, Table } from 'antd';
import { ColumnProps } from 'antd/lib/table/interface';

import DOBInput from './fields/dobConfirmation';
import WristbandInput from './fields/wristbandEntry';
import Buttons from './fields/buttons';
import RemovedWristbands from './fields/removedWristbands';
import ArrivalDate from './fields/arrivalDate';

import * as _ from 'lodash';
import $ from 'jquery';

interface TableState {
  columns: ColumnProps<Attendee>[];
  hasPerformedInitialUpdate: boolean;
}

class AttendeesTable extends StatefulTable<TableState> {
  componentWillMount() {
    this.setState(
      {
        hasPerformedInitialUpdate: false,
        columns: [
          { title: 'Entry Date',
            dataIndex: 'permittedEntryDate',
            render: (text: string, attendee: Attendee) => {
              if (attendee.permittedEntryDate) {
                return attendee.permittedEntryDate.format('ddd DD');
              }
              return '';
            }},
          { title: 'Department',
            dataIndex: 'department' },
          { title: 'Full Name',
            key: 'fullName',
            render: (text: string, attendee: Attendee) =>
              `${attendee.name.firstName} ${attendee.name.lastName}`,
            sorter: (a: Attendee, b: Attendee) => {
              let sortLast = Intl.Collator().compare(a.name.lastName, b.name.lastName);
              if (sortLast === 0) {
                return Intl.Collator().compare(a.name.firstName, b.name.firstName);
              }
              return sortLast;
            }},
          { title: 'DOB',
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
            )},
          { title: 'Wristband',
            key: 'wristband',
            width: 104,
            render: (text: string, attendee: Attendee) =>
              <WristbandInput
                dataid={attendee.id}
                table={this}
                ref={input => {
                  this.setInputState(attendee.id, 'wristband', { input });
                }}
              />},
          { title: '',
            dataIndex: 'row.buttons.mode',
            render: (text: string, attendee: Attendee) =>
              <Buttons dataid={attendee.id} />
          },
          {
            title: '',
            dataIndex: 'removedWristbands',
            render: (text: string, attendee: Attendee) =>
              <RemovedWristbands dataid={attendee.id} />
          },
          {
            title: 'Arrived',
            key: 'arrivalDate',
            render: (text: string, attendee: Attendee) =>
              <ArrivalDate dataid={attendee.id} />
          },
          {
            title: 'Registration',
            dataIndex: 'id',
            render: (text: string) => (<samp className="form-inline">{text}</samp>)
          },
          {
            title: '',
            width: 26,
            render: (text: string, attendee: Attendee) =>
              <Button icon="close" type="danger" shape="circle" size="small" onClick={(e) => this.props.deleteAttendee(attendee.id)} ghost={true} />
          }
        ]
      }, this.props.requestAttendees);

    this.onRecordBlur = this.onRecordBlur.bind(this);
  }

  componentDidMount() {
    this.props.setTableRef(this);
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
    return (
      <Table
        className="attendee-table"
        dataSource={this.props.result}
        columns={this.state.columns}
        rowKey={this.rowKey}
        size="middle"
        onRow={(record) => {
          return {
            onBlur: this.onRecordBlur
          };
        }}
        onChange={() => this.forceUpdate()}
        locale={{ emptyText: 'No Attendees Found' }}
      />
    );
  }

  public setInputState(dataid: string, key: keyof StatefulRow, state: Pick<any, any> | any) {
    let row = this.props.attendees && this.props.attendees[dataid] && this.props.attendees[dataid].row;
    if (row) {
      row[key] = { ...row[key], ...state };
      return this.props.setRowState(dataid, row);
    }
  }

  private onRecordBlur(event: React.MouseEvent<HTMLInputElement>) {
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
  (state: ApplicationState) => state.attendees,
  actionCreators
)(AttendeesTable) as any as typeof AttendeesTable;