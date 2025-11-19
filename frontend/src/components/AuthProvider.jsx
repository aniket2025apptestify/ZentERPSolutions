import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser, selectIsAuthenticated, selectToken } from '../store/slices/authSlice';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector(selectToken);

  useEffect(() => {
    // Load user data if token exists but user data is not loaded
    if (token && !isAuthenticated) {
      dispatch(loadUser());
    }
  }, [token, isAuthenticated, dispatch]);

  return children;
};

export default AuthProvider;

