import * as React from 'react';
import { Component } from 'react';
import { DateTime } from 'luxon';

export interface Props {
  value: DateTime | string;
}

interface State {
  timer: number | null;
  output: string;
}

export class TimeSince extends Component<Props, State> {
  state = {
    timer: null,
    output: ''
  };

  componentDidMount() {
    let timer = setInterval(this.tick, 1000);
    this.setState({timer});
  }

  componentWillUnmount() {
    clearInterval(this.state.timer || undefined);
  }

  public render() {
    return (<samp>{this.state.output}</samp>);
  }

  private tick: (() => void) =
    () => {
      let value: DateTime = typeof this.props.value === 'string' ?
        DateTime.fromISO(this.props.value) :
        this.props.value;

      this.setState({
        output: DateTime.local()
          .diff(value, ['hours', 'minutes', 'seconds'])
          .toFormat('hh:mm:ss')
      });
    }
}

export default TimeSince;