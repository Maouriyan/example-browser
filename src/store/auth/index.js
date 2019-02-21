import { hGet, hPost } from '../../lib/fetch';
import  get from 'lodash.get';

const initialState = {
    user: null
};

export const REQUEST_TOKEN = 'fanbase/auth/REQUEST_TOKEN';
export function requestToken(username, password) {
    return {
        type: REQUEST_TOKEN,
        payload: {
            username,
            password
        }
    };
};

const RECEIVE_TOKEN = 'fanbase/auth/RECEIVE_TOKEN';
function receiveToken(token) {
    return {
        type: RECEIVE_TOKEN,
        payload: token
    }
}

const RECEIVE_AUTH_ERROR = 'fanbase/auth/RECEIVE_AUTH_ERROR';
function receiveAuthError(error) {
    return {
        type: RECEIVE_AUTH_ERROR,
        payload: error
    };
}

export function fetchToken({ username, password }) {
    return (dispatch) => {
        dispatch(requestToken(username, password));

        return hPost('/login', { username, password }).then((response) => {
            dispatch(receiveToken(response.token));
            dispatch(receiveUser(response.user));
            return response.token;
        })
        .catch((error) => {
            dispatch(receiveAuthError(error.response.statusText));
            throw error;
        });
    }
}

const REQUEST_CREATE_USER = 'fanbase/auth/REQUEST_CREATE_USER';
function requestCreateUser() {
    return {
        type: REQUEST_CREATE_USER,
        payload: null
    };
}

const REQUEST_USER = 'fanbase/auth/REQUEST_USER';
function requestUser() {
    return {
        type: REQUEST_USER,
        payload: null
    };
}

const RECEIVE_USER = 'fanbase/auth/RECEIVE_USER';
function receiveUser(user) {
    return {
        type: RECEIVE_USER,
        payload: user
    };
}

const CLEAR_STORED_STATE = 'fanbase/auth/CLEAR_STORED_STATE';
export function clearStoredState() {
    return {
        type: CLEAR_STORED_STATE,
        payload: null
    }
}

export function fetchUserFromToken(token) {
    return (dispatch) => {
        dispatch(requestUser());

        return hGet('/profile', null, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then((user) => dispatch(receiveUser(user)))
        .catch((error) => {
            throw error;
        });
    };
}

export function createUser({ username, password }) {
    return (dispatch) => {
        dispatch(requestCreateUser());

        return hPost('/register', { username, password }).then((response) => {
            dispatch(receiveUser(response));
            return response;
        })
        .catch((error) => {
            dispatch(receiveAuthError(error.response.statusText));
            throw error;
        });
    }
}

export default function authReducer(state = initialState, action = {}) {
    switch (action.type) {
        case REQUEST_TOKEN:
            return {
                ...state,
                isFetching: true,
                error: null,
                lastRequestedAt: (new Date()).toISOString(),
            };
        case RECEIVE_TOKEN:
            return {
                ...state,
                isFetching: false,
                token: action.payload,
                error: null,
            };

        case RECEIVE_AUTH_ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.payload
            };
        case REQUEST_CREATE_USER:
            return {
                ...state,
                isFetching: true,
                error: null,
            };
        case REQUEST_USER:
            return {
                ...state,
                user: null
            };

        case RECEIVE_USER:
            return {
                ...state,
                user: action.payload
            };

        case CLEAR_STORED_STATE:
            return initialState;

        default:
            return state;
    }
};


export const getAuthenticatedUser = (state) => get(state, ['auth', 'user'], null)
export const isUserAuthenticated = (state) => getAuthenticatedUser(state) !== null;