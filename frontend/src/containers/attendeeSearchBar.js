import React, { Component } from 'react';
import { bindActionCreators } from "redux";
import { connect } from 'react-redux';
import { Container, InputGroup, InputGroupAddon, Input } from 'reactstrap';
import { searchFilter } from "../actions/index";
import debounce from 'lodash/debounce';

class AttendeeSearchBar extends Component {
	constructor(props) {
		super(props);

		this.state = {
			search_value: ""
		};

		this.debouncedSearch = debounce(this.props.searchFilter, 500).bind(this);
	}

	onInputChange(event) {
		let search_value = event.target.value;
		this.debouncedSearch(search_value);
		this.setState({ search_value });
	}

	render() {
		return (
			<Container className="attendeeSearch" fluid={true}>
				<InputGroup>
					<InputGroupAddon><i className="material-icons">search</i></InputGroupAddon>
					<Input placeholder="Search by Name, Wristband, or Registration"
						value={this.state.search_value}
						onChange={this.onInputChange.bind(this)} />
				</InputGroup>
			</Container>
		);
	}
}

function mapStateToProps({ search }) {
	return { search }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ searchFilter }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AttendeeSearchBar);