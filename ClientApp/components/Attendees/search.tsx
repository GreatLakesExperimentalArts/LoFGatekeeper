import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps } from 'react-router-dom';
import { ApplicationState }  from '../../store';
import * as AttendeesState from '../../store/Attendees';

import { Input, Select } from 'antd';

import { debounce, DebounceSettings, Cancelable, LoDashStatic } from 'lodash';

const Option = Select.Option;
const Search = Input.Search;

type AttendeesProps =
    AttendeesState.AttendeesState
    & typeof AttendeesState.actionCreators
    & RouteComponentProps<{}>;

interface SearchBarState {
  searchValue: string;
}

class AttendeeSearchBar extends Component<AttendeesProps, SearchBarState> {
  private selectBefore = (
      <Select defaultValue="Option1" style={{ width: 150 }}>
        <Option value="Option1">Everyone</Option>
        <Option value="Option2">Early Entry Only</Option>
        <Option value="Option3">Confirmed</Option>
        <Option value="Option4">Unconfirmed</Option>
      </Select>
    );

  private debouncedSearch = debounce(
      () => {
        this.props.updateSearch(this.state.searchValue);
      },
      500
    );

  componentWillMount() {
    this.onInputChange = this.onInputChange.bind(this);
    this.setState({ searchValue: '' });
  }

  componentWillReceiveProps(nextProps: AttendeesProps) {
    return;
  }

  public render() {
    return (
      <Search
        addonBefore={this.selectBefore}
        onKeyUp={this.onInputChange}
        style={{padding: '25px 0'}}
      />
    );
  }

  private onInputChange(event: React.SyntheticEvent<HTMLInputElement>) {
    let searchValue = event.currentTarget.value;
    this.setState({ searchValue }, this.debouncedSearch);
  }
}

export default connect(
  (state: ApplicationState) => state.attendees,
  AttendeesState.actionCreators
)(AttendeeSearchBar) as typeof AttendeeSearchBar;