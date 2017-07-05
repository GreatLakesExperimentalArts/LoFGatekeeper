import axios from 'axios';
import moment from 'moment';

export const FETCH_ATTENDEES = "FETCH_ATTENDEES";
export function fetchAttendees() {
	const request = axios.get('http://127.0.0.1:54000/api/attendees');

	return {
		type: FETCH_ATTENDEES,
		payload: request
	}
}

export const COMMIT_ATTENDEE = "COMMIT_ATTENDEE";
export const COMMIT_FAILED = "COMMIT_FAILED";
export function commitAttendeeState(self, attendee, stateful_callback =  () => {}) {
	const request = axios.post(
		`http://127.0.0.1:54000/api/attendees/${attendee.id}/setWristband`,
		{
			wristband: attendee.wristband,
			RemovedWristbands: attendee.removedWristbands,
			Date: moment().toString()
		}
	);

	return function (dispatch) {
		return request.then(
			response => dispatch({
				type: COMMIT_ATTENDEE,
				payload: { self, attendee, response, stateful_callback }
			}),
			error => dispatch({
				type: COMMIT_FAILED,
				payload: { self, error }
			})
		);
	}
}

export const SEARCH_FILTER = "SEARCH_FILTER";
export function searchFilter(search) {
	return {
		type: SEARCH_FILTER,
		payload: search
	}
}

export const GET_NEXT_WRISTBAND = "GET_NEXT_WRISTBAND";
export function getNextWristband(self, age, stateful_callback =  () => {}) {
	return {
		type: GET_NEXT_WRISTBAND,
		payload: { self, age, stateful_callback }
	}
}

export const SET_IF_WRISTBAND_FOUND = "SET_IF_WRISTBAND_FOUND";
export function setIfWristbandFound(self, wristband, stateful_callback =  () => {}) {
	return {
		type: SET_IF_WRISTBAND_FOUND,
		payload: { self, wristband, stateful_callback }
	}
}