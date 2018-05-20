import * as React from 'react';
import { Component } from 'react';
import { Row, Col, Form } from 'antd';

interface State {
  modal: JSX.Element | null;
}

export default class extends Component<{}, State> {
  componentWillMount() {
    this.setState({ modal: null });
  }

  render() {
    return (
        <div style={{ width: '100%' }}>
          <Row>
            <Col span={8}>Active</Col>
            <Col span={16}>Scheduled</Col>
          </Row>
          <Row>
            <Col span={8}>Active</Col>
            <Col span={16}>&nbsp;</Col>
          </Row>
        </div>
    );
  }

  private onShowModal: ((event: React.MouseEvent<HTMLButtonElement>) => void) =
    (event: React.MouseEvent<HTMLButtonElement>) => {
      this.setState({
        modal: (
          <div>&nbsp;</div>
        )
      });
    }
}