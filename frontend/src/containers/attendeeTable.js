import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from "redux";
import { Table } from 'reactstrap';
import AttendeeItem from './attendeeItem';
import { fetchAttendees } from "../actions/index";

import _ from 'lodash';

class AttendeeTable extends Component {
	componentWillMount() {
		this.props.fetchAttendees();
	}

	getAdultCount()
	{
		let attendees = this.props.attendees.items;
		const isAdult = (a) => a >= 21;

		let adults = _.filter(attendees, (attendee) => isAdult(attendee.age));

		let last_adult = _.max(_.map(adults, _.flow(
			_.property('wristband'),
			(wristband) => wristband || '0000',
			parseInt
		)));

		return last_adult - _.size(_.without(_.flatMap(adults, (attendee) => attendee.removedWristbands), null));
	}

	getChildCount()
	{
		let attendees = this.props.attendees.items;
		let children = _.filter(attendees, (attendee) => attendee.age < 21);

		console.log(_.map(children, _.flow(
			_.property('wristband'),
			(wristband) => ((wristband || '0000').startsWith('M') === false ? '0000' : (wristband || '0000')).substring(1, 4)
		)));

		let last_child = _.max(_.map(children, _.flow(
			_.property('wristband'),
			(wristband) => ((wristband || '0000').startsWith('M') === false ? '0000' : (wristband || '0000')).substring(1, 4),
			parseInt
		)));

		return last_child - _.size(_.without(_.flatMap(children, (attendee) => attendee.removedWristbands), null));
	}
	
	// <div>Counts: Adults {this.getAdultCount()}, Children {this.getChildCount()}</div>

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
			return _.some(['fullName','wristband','removedWristbands','id'], function (s) {
				switch (s) {
					case 'fullName':
						return exp.test(o.name[s]);
					case 'removedWristbands':
						return _.findIndex(o.removedWristbands, (i) => exp.test(i || null)) > -1;
					default:
						return exp.test(o[s] || (s === 'wristband' ? '' : null));
				}
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