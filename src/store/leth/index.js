import get from 'lodash.get';
import { createAction, createReducer } from 'redux-act';
import lsClient from 'lightstreams-js-sdk';
import useRoom from 'ipfs-pubsub-room';
import { broadcast } from '../ipfs';
import { hGet, hPost } from '../../lib/fetch';
import { SERVER_URL, IPFS_ROOM_NAME } from '../../constants';

const gateway = lsClient(SERVER_URL);

const initialState = {
    files: [],
    balance: null,
    error: null
};

const REQ_LETH_WALLET_BALANCE = 'lsn/leth/REQ_LETH_WALLET_BALANCE';
const requestLethWalletBalance = createAction(REQ_LETH_WALLET_BALANCE);

const RES_LETH_WALLET_BALANCE = 'lsn/leth/RES_LETH_WALLET_BALANCE';
const responseLethWalletBalance = createAction(RES_LETH_WALLET_BALANCE);

const REQ_LETH_STORAGE_ADD = 'lsn/leth/REQ_LETH_STORAGE_ADD';
const requestLethStorageAdd = createAction(REQ_LETH_STORAGE_ADD);

const RES_LETH_STORAGE_ADD = 'lsn/leth/RES_LETH_STORAGE_ADD';
const responseLethStorageAdd = createAction(RES_LETH_STORAGE_ADD);

const REQ_LETH_STORAGE_FETCH = 'lsn/leth/REQ_LETH_STORAGE_FETCH';
const requestLethStorageFetch = createAction(REQ_LETH_STORAGE_FETCH);

const RES_LETH_STORAGE_FETCH = 'lsn/leth/RES_LETH_STORAGE_FETCH';
const responseLethStorageFetch = createAction(RES_LETH_STORAGE_FETCH);

const REQ_LETH_ACL_GRANT = 'lsn/leth/REQ_LETH_ACL_GRANT';
const requestLethAclGrant = createAction(REQ_LETH_ACL_GRANT);

const RES_LETH_ACL_GRANT = 'lsn/leth/RES_LETH_ACL_GRANT';
const responseLethAclGrant = createAction(RES_LETH_ACL_GRANT);

const RECEIVE_LETH_ERROR = 'lsn/leth/RECEIVE_LETH_ERROR';
const receiveLethError = createAction(RECEIVE_LETH_ERROR);

export function lethWalletBalance(account) {
    return (dispatch) => {
        dispatch(requestLethWalletBalance());

        return hGet('/wallet/balance', { account })
            .then(response => dispatch(responseLethWalletBalance(response)))
            .catch(error => dispatch(receiveLethError(error)));
    };
}

export function lethStorageAdd({ account, password, files }) {
    return (dispatch) => {
        dispatch(requestLethStorageAdd());

        const formData = new FormData();
        formData.append('owner', account);
        formData.append('password', password);

        const filename = files[0].name;

        files.forEach(file => {
            formData.append('file', file);
        });

        return hPost('/storage/add', formData, { 'Content-Type': 'multipart/form-data' })
            .then((response) => {
                dispatch(responseLethStorageAdd({ filename, ...response}));
                dispatch(lethWalletBalance(account));
                return response;
            })
            .catch((error) => {
                dispatch(receiveLethError(error));
                throw error;
            });
    };
};

export function lethStorageFetch({ meta, token }) {
    return async (dispatch) => {
        dispatch(requestLethStorageFetch());

        const response = await fetch(`${SERVER_URL}/storage/fetch?meta=${meta}&token=${token}`);
        response.blob().then((content) => {
            const reader = new FileReader();
            reader.onabort = () => console.log('file reading was aborted');
            reader.onerror = () => console.log('file reading has failed');
            reader.addEventListener('loadend', () => {
                reader.removeEventListener('loadend', this);
                const fileDataUrl = reader.result;
                dispatch(responseLethStorageFetch(fileDataUrl));
            });
            reader.readAsDataURL(content);
        });
    };
}

export function lethAclGrant({ acl, ownerAccount, password, toAccount, permissionType }) {
    return async (dispatch) => {
        dispatch(requestLethAclGrant());
        const { ipfs } = require('../../lib/ipfs-node');
        return gateway.acl.grant(acl, ownerAccount, password, toAccount, permissionType)
            .then(response => {
                const room = useRoom(ipfs, IPFS_ROOM_NAME);
                dispatch(responseLethAclGrant(response));
                dispatch(broadcast(room, `${ownerAccount} granted ${permissionType} permission for ${acl} to ${toAccount}`));
                return response;
            })
            .catch((error) => {
                dispatch(receiveLethError(error));
            });

    };
}

const CLEAR_STORED_STATE = 'lsn/auth/CLEAR_STORED_STATE';
const clearStoredState = createAction(CLEAR_STORED_STATE);

export default createReducer({
    [requestLethStorageAdd]: (state) => ({
        ...state,
        isFetching: true,
        error: null,
        lastRequestedAt: (new Date()).toISOString(),
    }),
    [responseLethStorageAdd]: (state, payload) => {
        const obj = {
            ...state,
            isFetching: false,
            error: null
        };

        if (!state.files) {
            return {
                ...obj,
                files: [{ ...payload }]
            };
        }

        return {
            ...obj,
            files: [ ...state.files, { ...payload } ]
        };
    },
    [requestLethStorageFetch]: (state) => ({
        ...state,
        isFetching: true,
    }),
    [responseLethStorageFetch]: (state, payload) => ({
        ...state,
        fileDataUrl: payload,
        isFetching: false
    }),
    [receiveLethError]: (state, payload) => ({
        ...state,
        isFetching: false,
        error: payload
    }),
    [requestLethWalletBalance]: (state) => ({
        ...state,
        isFetching: true,
        error: null,
        lastRequestedAt: (new Date()).toISOString(),
    }),
    [responseLethWalletBalance]: (state, payload) => ({
        ...state,
        isFetching: false,
        balance: payload.balance,
        error: null,
    }),
    [clearStoredState]: (state) => initialState
}, initialState);

export const getLethFiles = (state) => get(state, ['leth', 'files'], null);
export const getLethErrors = (state) => get(state, ['leth', 'error'], null);
export const getWalletBalance = (state) => get(state, ['leth', 'balance'], null);
export const getFileDataUrl = (state) => get(state, ['leth', 'fileDataUrl'], null);