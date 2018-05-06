import * as React from 'react';
import { Component } from 'react';

import { Button } from 'antd';

import Search from './search';
import Table from './table';
import AddModal from './addModal';

interface State {
  modal: JSX.Element | null;
}

export default class extends Component<{}, State> {
  componentWillMount() {
    this.setState({ modal: null });
  }

  render() {
    return (
        <div>
          <Search />
          <Table />
          <div style={{ width: '100%', textAlign: 'right', paddingTop: '10px' }}>
            <Button onClick={this.onShowModal}>Add Attendee</Button>
          </div>
          {this.state.modal}
        </div>
    );
  }

  private onShowModal: ((event: React.MouseEvent<HTMLButtonElement>) => void) =
    (event: React.MouseEvent<HTMLButtonElement>) => {
      this.setState({
        modal: (
          <AddModal
            onOk={(e) => this.setState({ modal: null })}
            onCancel={(e) => this.setState({ modal: null })}
          />
        )
      });
    }
}