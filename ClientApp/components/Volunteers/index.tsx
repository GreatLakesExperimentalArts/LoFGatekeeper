import * as React from 'react';
import { Component } from 'react';

interface State {
  modal: JSX.Element | null;
}

export default class extends Component<{}, State> {
  componentWillMount() {
    this.setState({ modal: null });
  }

  render() {
    return (
        <div>&nbsp;</div>
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