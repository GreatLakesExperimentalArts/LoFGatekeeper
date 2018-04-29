import * as React from 'react';
import { Component } from 'react';
import { connect } from 'react-redux';
import { Link, RouteComponentProps } from 'react-router-dom';
import { ApplicationState }  from 'store';

import { actionCreators } from 'store/attendees';
import { AttendeesState } from 'store/attendees/dto';

import { Input, Select } from 'antd';
import { SelectValue } from 'antd/lib/select';
import { debounce, DebounceSettings, Cancelable, LoDashStatic } from 'lodash';

const Option = Select.Option;
const Search = Input.Search;

type AttendeesProps =
    AttendeesState
    & typeof actionCreators
    & RouteComponentProps<{}>;

interface SearchBarState {
  searchValue: string;
  categoryFilter: string;
}

class AttendeeSearchBar extends Component<AttendeesProps, SearchBarState> {
  private debouncedSearch = debounce(
      () => {
        this.props.updateSearch(this.state.searchValue, this.state.categoryFilter);
      },
      500
    );

  componentWillMount() {
    this.onInputChange = this.onInputChange.bind(this);
    this.onSelectChange = this.onSelectChange.bind(this);
    this.setState({ searchValue: '', categoryFilter: 'Everyone' });
  }

  public render() {
    let selectBefore = (
      <Select
        style={{ width: 150 }}
        value={this.state.categoryFilter || ''}
        onChange={this.onSelectChange}
      >
        <Option value="Everyone">Everyone</Option>
        <Option value="EarlyEntry">Early Entry Only</Option>
        <Option value="Confirmed">Confirmed</Option>
        <Option value="Unconfirmed">Unconfirmed</Option>
      </Select>
    );

    return (
      <Search
        addonBefore={selectBefore}
        onKeyUp={this.onInputChange}
        style={{padding: '25px 0'}}
      />
    );
  }

  private onSelectChange(value: SelectValue) {
    this.setState({ categoryFilter: value as string }, this.debouncedSearch);
  }

  private onInputChange(event: React.SyntheticEvent<HTMLInputElement>) {
    let searchValue = event.currentTarget.value;
    this.setState({ searchValue }, this.debouncedSearch);
  }
}

export default connect(
  (state: ApplicationState) => state.attendees,
  actionCreators
)(AttendeeSearchBar) as typeof AttendeeSearchBar;