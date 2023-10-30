import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { JwtResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types.js';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types.js';
import { AXIOSError, ToastStyle } from './app-types';
import { notify } from '../1-Utilities/hooks';


/**************************************
   Account | Credentials Redux Reducer
   Tracks 'logged-in' user's status
***************************************/

export type AccountState = {
  userID: number,
  jwt: string, 
  userProfile: ProfileResponse,
}

const initialAccountState:AccountState = {
  userID: -1,
  jwt: '',
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
    updateJWT: (state, action:PayloadAction<string>) => state = {...state, jwt: action.payload},
    updateProfile: (state, action:PayloadAction<ProfileResponse>) => state = {...state, userProfile: action.payload},
    addCircle: (state, action:PayloadAction<CircleListItem>) => state = {...state, userProfile: {...state.userProfile, circleList: [action.payload, ...(state.userProfile.circleList || []) as CircleListItem[]]}},
    removeCircle: (state, action:PayloadAction<number>) => state = {...state, userProfile: {...state.userProfile, circleList: [...(state.userProfile.circleList || []) as CircleListItem[]].filter(circle => circle.circleID !== action.payload)}},
    addPartner: (state, action:PayloadAction<ProfileResponse>) => state = {...state, userProfile: {...state.userProfile, partnerList: [action.payload, ...(state.userProfile.partnerList || []) as ProfileListItem[]]}},
    removePartner: (state, action:PayloadAction<number>) => state = {...state, userProfile: {...state.userProfile, partnerList: [...(state.userProfile.partnerList || []) as ProfileListItem[]].filter(partner => partner.userID !== action.payload)}},
    addPrayerRequest: (state, action:PayloadAction<PrayerRequestListItem>) => state = {...state, userProfile: {...state.userProfile, prayerRequestList: [action.payload, ...(state.userProfile.prayerRequestList || []) as PrayerRequestListItem[]]}},
    removePrayerRequest: (state, action:PayloadAction<number>) => state = {...state, userProfile: {...state.userProfile, prayerRequestList: [...(state.userProfile.prayerRequestList || []) as PrayerRequestListItem[]].filter(prayerRequest => prayerRequest.prayerRequestID !== action.payload)}},
    addContact: (state, action:PayloadAction<ProfileResponse>) => state = {...state, userProfile: {...state.userProfile, contactList: [action.payload, ...(state.userProfile.contactList || []) as ProfileListItem[]]}},
  },
});

//Export Dispatch Actions
export const { setAccount, resetAccount, updateJWT, updateProfile, addCircle, removeCircle, addPartner, removePartner, addPrayerRequest, removePrayerRequest, addContact } = accountSlice.actions;

/**********************************************************
 * REDUX MIDDLEWARE: for non-static/async state operations
 **********************************************************/

//Custom Redux (Static) Middleware: https://redux.js.org/tutorials/fundamentals/part-6-async-logic
//Called directly in index.tsx: store.dispatch(loadCacheLogin); 
export const loadCacheLogin = async(dispatch: (arg0: { payload: AccountState; type: 'account/setAccount'; }|{type: 'account/resetAccount'; }|{ payload: string; type: 'account/updateJWT'; }) => void, getState: AccountState) => {
  if(!window.location.pathname.includes('login')) {
    try {
      if(window.localStorage.getItem('user') === null || !window.localStorage.getItem('user')?.length) //Set in Login.tsx
        throw 'No Cached Credentials';

      const user = JSON.parse(window.localStorage.getItem('user') || '');
      const userID = user.userID;
      const jwt = user.jwt;
      const userProfile = user.userProfile;

      if(!userID || !jwt || !userProfile) 
        throw 'Invalid Cached Credentials';

      //Re-authenticate JWT
      await axios.get(`${process.env.REACT_APP_DOMAIN}/api/authenticate`, {
        headers: {
          ['user-id']: userID,
          jwt: jwt
        }
      }).then(response => { 
        const body:JwtResponseBody = response.data;
        dispatch(setAccount({userID: userID, jwt: body.jwt, userProfile: userProfile}));
        notify(`Welcome ${userProfile?.firstName}`, ToastStyle.INFO);
        
      }).catch((response:AXIOSError) => {
        throw response.response?.data.action || 'Invalid JWT Token';
      });

    } catch(error) {
      console.error('Auto attempt failed to Re-login with cached credentials', error);

      logoutAccount(dispatch, getState);

      notify('Please Login', ToastStyle.WARN, ()=>window.location.assign('/login'));
    }
  }
}

export const logoutAccount = async(dispatch: (arg0: {type: 'account/resetAccount'; }) => void, getState: AccountState) => {
  console.warn('REDUX Account & localStorage cleared: logoutAccount');
  window.localStorage.setItem('user', '');
  window.location.assign('/login');
  dispatch(resetAccount());
  notify('Logging Out', ToastStyle.INFO);
}

//Redux Middleware Listeners: https://redux-toolkit.js.org/api/createListenerMiddleware


/*****************************************
   SETTINGS | Redux Reducer
   Temporary - for current session only
******************************************/

export type SettingsState = {
  ignoreCache: boolean,
}

const initialSettingsState:SettingsState = {
  ignoreCache: false,
}; 
 
const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    setIgnoreCache: (state, action:PayloadAction<boolean>) => state = {...state, ignoreCache: action.payload},
    resetSettings: () => initialSettingsState,
  },
});

//Export Dispatch Actions
export const { setIgnoreCache, resetSettings } = settingsSlice.actions;
const store = configureStore({
  reducer: {
    account: accountSlice.reducer,
    settings: settingsSlice.reducer,
  },
  //Note: May Define Middleware; however w/o defining types: return and types are automatic: https://v1-2-5--redux-starter-kit-docs.netlify.app/api/getDefaultMiddleware
});

export default store;

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch