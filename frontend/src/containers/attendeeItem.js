import React, { Component } from 'react';
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import InputMask from 'react-input-mask';

import {
	commitAttendeeState,
	getNextWristband,
	setIfWristbandFound
} from "../actions/index";

import moment from 'moment';
import _ from 'lodash';

class AttendeeItem extends Component {
	constructor(props) {
		super(props);

		this.state = {
			dob_unconfirmed: true,
			dob_input_class: "dob",
			dob_placeholder: "",
			wristband_temp: "",
			wristband_next: "",
			wristband_found: false,
			wristband_focused: false,
			wristband_input_class: "wristband",
			wristband_placeholder: ""
		};
		this.onRefUpdate = this.onRefUpdate.bind(this);

		this.onWristbandKeyDown = this.onWristbandKeyDown.bind(this);
		this.onWristbandChanged = this.onWristbandChanged.bind(this);
		this.onWristbandFocus = this.onWristbandFocus.bind(this);
		this.onWristbandBlur = this.onWristbandBlur.bind(this);
		this.onWristbandCommit = this.onWristbandCommit.bind(this);
		this.onWristbandRemoved = this.onWristbandRemoved.bind(this);

		this.onBirthdateChanged = this.onBirthdateChanged.bind(this);
		this.onBirthdateFocus = this.onBirthdateFocus.bind(this);

		this.setBirthdateInputState = this.setBirthdateInputState.bind(this);
		this.setWristbandInputState = this.setWristbandInputState.bind(this);
		this.setInputStates = this.setInputStates.bind(this);
	}

	componentDidMount() {
		this.setBirthdateInputState();
	}

	onBirthdateFocus(event) {
		if (event.currentTarget.value === "  /  /    ") {
			event.preventDefault();
			event.target.setSelectionRange(0,0);
		}
		this.setWristbandInputState();
	}

	onWristbandKeyDown(event) {
		if (event.key === "Backspace" && this.state.wristband_temp === "") {
			this.dobInput.focus();
		}
	}

	onWristbandFocus(event) {
		this.props.getNextWristband(this, this.props.attendee.age, () => {
			this.setState({
				wristband_focused: true,
				wristband_placeholder: this.state.wristband_next
			});
		});
	}

	onWristbandBlur(event) {
		this.setState({ wristband_focused: false });
	}

	setBirthdateInputState(cbDefault, cbSuccess, cbFailure) {
		if (this.dobInput) {
			let dob = this.props.attendee.dob.format("MM/DD/Y");
			let inputValue = this.dobInput.value;
			let inputTruthy = inputValue.replace(/[ ]/gi, '')
				.replace(/[0-9]/gi, '\u00A0')
				.replace(/[/]{1,2}$/gi, '');
			
			let dob_placeholder = inputTruthy + dob.substring(inputTruthy.length);

			if (inputValue === dob) {
				this.setState({ dob_placeholder, dob_confirmed: true, dob_input_class: "dob-success" }, cbSuccess);
				return;
			}

			if (inputTruthy.length > 0 && inputTruthy.length === inputValue.length)
			{
				this.setState({ dob_placeholder, dob_confirmed: false, dob_input_class: "dob-failure" }, cbFailure);
				return;
			}

			if (this.state.dob_input_class !== "dob") {
				this.setState({ dob_input_class: "dob", dob_confirmed: false }, cbDefault);
			}

			this.setState({ dob_placeholder, dob_confirmed: false });
		}
	}

	setWristbandInputState(cbDefault, cbSuccess, cbFailure) {
		let wristband_temp = this.state.wristband_temp || "";

		let placeholder = this.state.wristband_focused
			? wristband_temp.replace(/[m0-9]/gi, '\u00A0') +
				this.state.wristband_next.substring(wristband_temp.length)
			: "";
		
		if (this.state.wristband_temp.length === 4) {
			this.props.setIfWristbandFound(this, this.state.wristband_temp, () => {
				this.setState(
					{
						wristband_placeholder: placeholder,
						wristband_input_class: this.state.wristband_found
							? 'wristband-failure'
							: this.state.wristband_next === this.state.wristband_temp
								? 'wristband-success'
								: 'wristband-warning'
					},
					this.state.wristband_found ? cbFailure : cbSuccess
				);
			});
			return;
		}
		this.setState({
			wristband_placeholder: placeholder,
			wristband_input_class: 'wristband'
		}, cbDefault);
	}

	setInputStates(cbDefault, cbSuccess, cbFailure) {
		this.setBirthdateInputState(cbDefault, cbSuccess, cbFailure);
		this.setWristbandInputState(cbDefault, cbSuccess, cbFailure);
	}

	onWristbandChanged(event) {
		event.preventDefault();
		let wristband_temp = event.target.value.toUpperCase();

		this.setState(
			{ wristband_temp },
			() => {
				if (wristband_temp.length === 4) {
					this.props.setIfWristbandFound(this, wristband_temp,
						() => this.setInputStates());
					return;
				}
				this.setInputStates();
			}
		);
	}

	onBirthdateChanged(event) {
		this.setState(
			{ dob_unconfirmed: event.target.value !== this.props.attendee.dob.format("MM/DD/Y") },
			() => {
				this.setBirthdateInputState(null, () => {
					this.setState(
						{ wristband_temp: this.props.attendee.age < 21 ? "M" : "" },
						() => { this.wristbandInput.focus(); }
					);
				});
			}
		);
	}

	onWristbandCommit(event) {
		event.preventDefault();

		let attendee = this.props.attendee;
		attendee.wristband = this.state.wristband_temp;
		attendee.removedWristbands = _.without(
			attendee.removedWristbands || [],
			this.state.wristband_temp);
		
		this.props.commitAttendeeState(this, attendee);
	}

	onWristbandRemoved(event) {
		event.preventDefault();

		let attendee = this.props.attendee;
		attendee.removedWristbands = [...(attendee.removedWristbands || []), attendee.wristband];
		attendee.wristband = null;

		this.props.commitAttendeeState(this, attendee, () => {
			this.dobInput.focus();
		});
	}

	onRefUpdate(event) {
		if (event) {
			this[event.input.name + 'Input'] = event.input;
		}
	}

	renderItemInput(inputName) {
		let attendee = this.props.attendee;

		switch (inputName) {
			case 'registration':
				return (
					<td><samp className="pull-right">{attendee.id}</samp></td>
				);
			case 'fullName':
				return (
					<td>{attendee.name.fullName}</td>
				);
			case 'entryDate':
				if ((attendee.permittedEntryDate || null) !== null) {
					return (
						<td>{moment(attendee.permittedEntryDate).format("ddd DD")}</td>
					);
				}
				return (<td>&nbsp;</td>);
			case 'arrivalDate':
				if ((attendee.arrivalDate || null) !== null) {
					return (
						<td>{moment(attendee.arrivalDate).format("ddd DD @ HH:mm")}</td>
					);
				}
				return (<td>&nbsp;</td>);
			case 'dob':
				return 	(attendee.wristband === null) ? (
					<td>
						<div className="placeholder" data-placeholder={this.state.dob_placeholder}>
							<InputMask className={this.state.dob_input_class}
								name="dob"
								mask="99/99/9999" maskChar=" "
								onFocus={this.onBirthdateFocus}
								onSelect={this.onBirthdateFocus}
								onChange={this.onBirthdateChanged}
								ref={this.onRefUpdate} />
						</div>
					</td>
				) : (
					<td><samp className="form-inline">{attendee.dob.format("MM/DD/Y")}</samp></td>
				);
			case 'wristband':
				return (attendee.wristband === null || this.state.wristband_temp.length === 4) ? (
					<td>
						<div className="placeholder" data-placeholder={this.state.wristband_placeholder}>
							<InputMask className={this.state.wristband_input_class}
								name="wristband"
								mask="X999" maskChar=""
								formatChars={{'9':'[0-9]','X':'[mM0-9]'}}
								disabled={this.state.dob_unconfirmed}
								value={this.state.wristband_temp || ""}
								onKeyDown={this.onWristbandKeyDown}
								onChange={this.onWristbandChanged}
								onFocus={this.onWristbandFocus}
								onBlur={this.onWristbandBlur}
								ref={this.onRefUpdate} />
						</div>
					</td>
				) : (
					<td>
						<samp className="form-inline">{attendee.wristband}</samp>
					</td>
				);
			case 'commands':
				if ((this.state.wristband_temp || "").replace(" ", "").length === 4 && !this.state.wristband_found) {
					return (
						<td className="buttons">
							<i className="material-icons" onClick={this.onWristbandCommit}>check</i>
						</td>
					);
				}
				if (attendee.wristband !== null) {
					return (
						<td className="buttons">
							<i className="material-icons" onClick={this.onWristbandRemoved}>delete</i>
						</td>
					);
				}
				return (
					<td className="buttons">
						<i className="material-icons disabled">error</i>
					</td>
				);
			case 'removedWristbands':
				return (
					<td>
						<samp className="form-inline">{(attendee.removedWristbands || []).join(', ')}</samp>
					</td>
				);
			default:
				return (<td>{attendee[inputName]}</td>);
		}
	}

	render() {
		return (
			<tr>
				{this.renderItemInput('entryDate')}
				{this.renderItemInput('department')}
				{this.renderItemInput('fullName')}
				{this.renderItemInput('dob')}
				{this.renderItemInput('wristband')}
				{this.renderItemInput('commands')}
				{this.renderItemInput('removedWristbands')}
				{this.renderItemInput('emailAddress')}
				{this.renderItemInput('registration')}
				{this.renderItemInput('arrivalDate')}
				<td>&nbsp;</td>
			</tr>
		);
	}
}

const mapStateToProps = (state, ownProps) => {
	let attendee = state.attendees.items[ownProps.index];
	return { attendee };
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ commitAttendeeState, getNextWristband, setIfWristbandFound }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AttendeeItem);