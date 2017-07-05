import {
	FETCH_ATTENDEES,
	COMMIT_ATTENDEE,
	GET_NEXT_WRISTBAND,
	SET_IF_WRISTBAND_FOUND
} from "../actions/index";

import moment from 'moment';
import each from 'lodash/each';
import filter from 'lodash/filter';
import findIndex from 'lodash/findIndex';
import map from 'lodash/map';
import max from 'lodash/max';
import flow from 'lodash/flow';
import padStart from 'lodash/padStart';
import property from 'lodash/property';

export default function(state = { items: [] }, action) {
	switch (action.type) {
		case FETCH_ATTENDEES:
			{
				let attendees = action.payload.data;

				each(attendees, (attendee, index) => {
					attendee.dob = moment(attendee.dob).startOf('day');
					if (attendee.dob.year() === 1) {
						attendee.dob = moment()
							.startOf('day')
							.subtract(13, 'years')
							.subtract(1, 'seconds');
					}

					attendee.arrivalDate = moment(attendee.arrivalDate);
					if (attendee.arrivalDate.year() === 1) {
						attendee.arrivalDate = null;
					}

					attendee.age = moment()
						.startOf('day')
						.diff(attendee.dob, 'years', true);

					attendee.index = index;
				});

				return { ...state, items: attendees };
			}

		case COMMIT_ATTENDEE:
			{
				let attendee = action.payload.attendee;
				let self = action.payload.self;

				state.items[attendee.index] = {
					...state.items[attendee.index],
					...attendee
				};

				self.setState({ wristband_temp: "" }, action.payload.stateful_callback);

				return { ...state };
			}

		case GET_NEXT_WRISTBAND:
			{
				const isAdult = (a) => a >= 21;
				let self = action.payload.self;
				let age = action.payload.age;

				let candidates = filter(state.items,
					(attendee) => isAdult(attendee.age) === isAdult(age)
				);

				let next = max(map(candidates, flow(
					property('wristband'),
					(wristband) => isAdult(age) ? wristband : (wristband || 'M000').substring(1, 3),
					parseInt
				))) + 1;

				let wristband_next = padStart(next.toString(), 4, isAdult(age) ? '0000' : 'M000');

				self.setState({ wristband_next }, action.payload.stateful_callback);

				return state;
			}
		
		case SET_IF_WRISTBAND_FOUND:
			{
				let self = action.payload.self;

				let wristband_found = findIndex(state.items, (attendee) =>
					attendee.wristband === action.payload.wristband &&
					attendee.id !== self.props.attendee.id
				) > -1;

				self.setState({ wristband_found }, action.payload.stateful_callback);

				return state;
			}

		default:
			return state;
	}
}