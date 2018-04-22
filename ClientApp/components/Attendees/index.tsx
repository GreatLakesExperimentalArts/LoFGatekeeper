import * as React from 'react';
import { Component } from 'react';
import Search from './search';
import Table from './table';

export default class AttendeeSearch extends Component {
  render() {
    return (
        <div>
          <Search />
          <Table />
        </div>
    );
  }
}