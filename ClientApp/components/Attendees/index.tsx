import * as React from 'react';
import { Component } from 'react';

import { Button } from 'antd';

import Search from './search';
import Table from './table';
import AddModal from './addModal';

interface State {
  showModal: boolean;
}

export default class AttendeeSearch extends Component<{}, State> {
  componentWillMount() {
    this.setState({ showModal: false });
    this.onShowModal = this.onShowModal.bind(this);
  }

  render() {
    return (
        <div>
          <Search />
          <Table />
          <div style={{ width: '100%', textAlign: 'right', paddingTop: '10px' }}>
            <Button onClick={this.onShowModal}>Add Attendee</Button>
          </div>
          {this.state.showModal && <AddModal />}
        </div>
    );
  }

  private onShowModal(event: React.MouseEvent<HTMLButtonElement>) {
    this.setState({ showModal: true });
  }
}