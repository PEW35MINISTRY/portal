import React from 'react';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios';
import { ToastStyle, AXIOSError } from './app-types';
import { JWTResponseBody, ProfileResponse } from './1-Profile/profile-types';
import { notify } from './hooks';


/**************************************
   Account | Credentials Redux Reducer
   Tracks 'logged-in' user's status
***************************************/

export type AccountState = {
  userId: number,
  JWT: string, 
  userProfile: ProfileResponse,
}

const initialAccountState:AccountState = {
  userId: -1,
  JWT: '',
  userProfile: {} as ProfileResponse
}; 

//Must keep state reducers pure (No side effects: Ajax => Use Middelware)
// createSlice creates a reducer and actions automatically: https://dev.to/raaynaldo/redux-toolkit-setup-tutorial-5fjf
const accountSlice = createSlice({
  name: 'account',
  initialState: initialAccountState,
  reducers: {
    setAccount: (state, action:PayloadAction<AccountState>) => state = action.payload,
    resetAccount: () => initialAccountState,
    updateJWT: (state, action:PayloadAction<string>) => state = {...state, JWT: action.payload},
    updateProfile: (state, action:PayloadAction<ProfileResponse>) => state = {...state, userProfile: action.payload},
  },
});

//Export Dispatch Actions
export const { setAccount, resetAccount, updateJWT, updateProfile } = accountSlice.actions;

/**********************************************************
 * REDUX MIDDLEWARE: for non-static/async state operations
 **********************************************************/

//Custom Redux (Static) Middleware: https://redux.js.org/tutorials/fundamentals/part-6-async-logic
//Called directly in index.tsx: store.dispatch(loadCacheLogin); 
export const loadCacheLogin = async(dispatch: (arg0: { payload: AccountState; type: "account/setAccount"; }|{type: "account/resetAccount"; }|{ payload: string; type: "account/updateJWT"; }) => void, getState: AccountState) => {
  if(!window.location.pathname.includes('login')) {
    try {
      if(window.localStorage.getItem('user') === null || !window.localStorage.getItem('user')?.length) //Set in Login.tsx
        throw "No Cached Credentials";

      const user = JSON.parse(window.localStorage.getItem('user') || '');
      const userId = user.userId;
      const JWT = user.JWT;
      const userProfile = user.userProfile;

      if(!userId || !JWT || !userProfile) 
        throw "Invalid Cached Credentials";

      //Re-authenticate JWT
      await axios.get(`${process.env.REACT_APP_DOMAIN}/api/authenticate`, {
        headers: {
          ['user-id']: userId,
          jwt: JWT
        }
      }).then(response => { 
        const body:JWTResponseBody = response.data;
        dispatch(setAccount({userId: userId, JWT: body.JWT, userProfile: userProfile}));
        notify(`Welcome ${userProfile?.firstName}`, ToastStyle.INFO);
        
      }).catch((response:AXIOSError) => {
        throw response.response?.data.action || "Invalid JWT Token";
      });

    } catch(error) {
      console.error('Auto attempt failed to Re-login with cached credentials', error);

      logoutAccount(dispatch, getState);

      notify('Please Login', ToastStyle.WARN, ()=>window.location.assign('/login'));
    }
  }
}

export const logoutAccount = async(dispatch: (arg0: {type: "account/resetAccount"; }) => void, getState: AccountState) => {
  console.warn('REDUX Account & localStorage cleared: logoutAccount');
  dispatch(resetAccount());
  window.localStorage.setItem('user', '');
  window.location.assign('/login');
}

//Redux Middleware Listeners: https://redux-toolkit.js.org/api/createListenerMiddleware

const store = configureStore({
  reducer: {
    account: accountSlice.reducer,
  },
  //Note: May Define Middleware; however w/o defining types: return and types are automatic: https://v1-2-5--redux-starter-kit-docs.netlify.app/api/getDefaultMiddleware
});

export default store;

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch