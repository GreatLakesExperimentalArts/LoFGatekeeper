import * as React from 'react';
import { Component } from 'react';
import moment, { Moment } from 'moment';
import 'moment-duration-format';

export interface Props {
  value: Moment | string;
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
      let value: Moment = typeof this.props.value === 'string' ?
        moment(this.props.value) :
        this.props.value;

      this.setState({
        output: moment.duration(moment().diff(value)).format('hh:mm:ss')
      });
    }
}

export default TimeSince;