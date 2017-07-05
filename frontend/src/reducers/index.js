import { combineReducers } from 'redux';
import AttendeeReducer from './reducer_attendees';
import SearchReducer from './reducer_search';

const rootReducer = combineReducers({
	attendees: AttendeeReducer,
	search: SearchReducer
});

export default rootReducer;