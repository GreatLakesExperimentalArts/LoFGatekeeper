import { SEARCH_FILTER } from "../actions/index";

export default function(state = "", action) {
	switch (action.type) {
		case SEARCH_FILTER:
			return action.payload;
		default:
			return state;
	}
}