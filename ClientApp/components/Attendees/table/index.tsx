import * as React from 'react';
import { Component } from 'react';
import * as ReactDOM from 'react-dom';
import { Link, RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';
import { ApplicationState }  from 'store';
import { actionCreators, Attendee } from 'store/attendees';
import { StatefulTable, StatefulRow } from 'store/attendees/table';

import { Button, Table } from 'antd';
import { ColumnProps } from 'antd/lib/table/interface';

import DOBInput from './dobConfirmation';
import WristbandInput from './wristbandEntry';
import Buttons from './buttons';
import RemovedWristbands from './removedWristbands';
import ArrivalDate from './arrivalDate';

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
            render: (text: string, attendee: Attendee, index: number) => {
              if (attendee.permittedEntryDate) {
                return attendee.permittedEntryDate.format('ddd DD');
              }
              return '';
            }},
          { title: 'Department',
            dataIndex: 'department'},
          { title: 'Full Name',
            key: 'fullName',
            render: (text: string, attendee: Attendee, index: number) =>
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
            render: (text: string, attendee: Attendee, index: number) =>
              <DOBInput index={index} table={this} ref={input => {
                this.setInputState(index, 'dob', { input });
              }} />
          },
          { title: 'Wristband',
            key: 'wristband',
            width: 104,
            render: (text: string, attendee: Attendee, index: number) =>
              <WristbandInput index={index} table={this} ref={input => {
                this.setInputState(index, 'wristband', { input });
              }} />
          },
          { title: '',
            dataIndex: 'row.buttons.mode',
            render: (text: string, attendee: Attendee, index: number) =>
              <Buttons index={index} />
          },
          {
            title: '',
            dataIndex: 'removedWristbands',
            render: (text: string, attendee: Attendee, index: number) =>
              <RemovedWristbands index={index} />
          },
          {
            title: 'Arrived',
            key: 'arrivalDate',
            render: (text: string, attendee: Attendee, index: number) =>
              <ArrivalDate index={index} />
          },
          {
            title: 'Registration',
            dataIndex: 'id',
            render: (text: string) => (<samp className="form-inline">{text}</samp>)
          }
        ]
      },
      this.props.requestAttendees);

    this.onRecordBlur = this.onRecordBlur.bind(this);
  }

  componentDidMount() {
    this.props.setTableRef(this);
  }

  componentWillReceiveProps(nextProps: AttendeesState) {
    if (nextProps.attendees.length > 0 && !this.state.hasPerformedInitialUpdate) {
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
        rowKey={(attendee: Attendee) => attendee.id}
        size="middle"
        onRow={(record) => {
          return {
            onBlur: this.onRecordBlur
          };
        }}
        locale={{ emptyText: 'No Attendees Found' }}
      />
    );
  }

  public setInputState(index: number, key: keyof StatefulRow, state: Pick<any, any> | any) {
    let newRow = { ...(this.props.attendees[index].row || new StatefulRow()) };
    newRow[key] = { ...newRow[key], ...state };
    return this.props.setRowState(index, newRow);
  }

  private onRecordBlur(event: React.MouseEvent<HTMLInputElement>) {
    let currentRow = $(event.target).closest('tr').get(0);
    let relatedRow = $(event.relatedTarget).closest('tr').get(0);

    if (relatedRow && currentRow !== relatedRow) {
      $(currentRow)
        .find('input')
        .forEach((item: HTMLInputElement) => {
          $(item).trigger('blur', { bubble: true });
        });
    }
  }
}

export default connect(
  (state: ApplicationState) => state.attendees,
  actionCreators
)(AttendeesTable) as typeof AttendeesTable;