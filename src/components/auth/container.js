import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { isAuthenticated, getAuthenticatedUser } from '../../store/auth';
import { signOut, getSubscriberId } from '../../store/firebase';

// see https://frontarm.com/james-k-nelson/passing-data-props-children/

const mapStateToProps = (state) => {
    return {
        isAuthenticated: isAuthenticated(state),
        user: getAuthenticatedUser(state),
        subscriberId: getSubscriberId(state)
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        clearStorage() {
            dispatch(signOut());
        }
    };
};

const AuthContainer = ({ children, ...props }) => (
    <Fragment>
        {children(props)}
    </Fragment>
);

AuthContainer.propTypes = {
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.node),
        PropTypes.node,
        PropTypes.func
    ]).isRequired
};

export default connect(mapStateToProps, mapDispatchToProps)(AuthContainer);
