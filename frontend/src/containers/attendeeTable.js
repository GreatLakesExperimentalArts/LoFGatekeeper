import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from "redux";
import { Table } from 'reactstrap';
// import VisibilitySensor from 'react-visibility-sensor';
import AttendeeItem from './attendeeItem';
import { fetchAttendees } from "../actions/index";

import _ from 'lodash';

class AttendeeTable extends Component {
	componentWillMount() {
		this.props.fetchAttendees();
	}

	render() {
		return (
			<Table size="sm" striped> 
				<thead>
					<tr>
						<th>Entry</th>
						<th>Department</th>
						<th>Name</th>
						<th>DOB</th>
						<th colSpan="2">Wristband</th>
						<th>Removed</th>
						<th>EMail</th>
						<th>Registration</th>
						<th>Arrival</th>
						<th width="99%">&nbsp;</th>
					</tr>
				</thead>
				<tbody>
					{this.renderItems()}
				</tbody>
			</Table>
		);
	}

	getReducer() {
		let attendees = this.props.attendees.items;

		if (this.props.search.length < 3) {
			if (this.props.search === "?") {
				return _.filter(attendees, (item) => item.wristband !== null);
			}
			if (this.props.search === "!") {
				return _.filter(attendees, (item) => item.wristband === null);
			}

			return () => [];
		}

		var exp = new RegExp(this.props.search, 'gi');

		return _.filter(attendees, function (o) {
			return _.some(['fullName','wristband','id'], function (s) {
				if (!o.name[s]) {
					return exp.test(o[s]);
				}
				return exp.test(o.name[s]);
			});
		});
	}

	renderItems() {
		return _.chain(this.getReducer())
			.takeWhile(() => true)
			.value()
			.map((individual, index) => {
				return (
					<AttendeeItem key={individual.id} index={individual.index} registration={individual.id} />
				);
			});
	}
}

function mapStateToProps({ attendees, search }) {
	return { attendees, search }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ fetchAttendees }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AttendeeTable);