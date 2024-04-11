import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { JwtResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types.js';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { PartnerListItem, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { AXIOSError, ToastStyle } from './app-types';
import { notify } from '../1-Utilities/hooks';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';


/**************************************
   Account | Credentials Redux Reducer
   Tracks 'logged-in' user's status
***************************************/

export type AccountState = {
  userID: number,
  userRole:RoleEnum,
  jwt: string, 
  userProfile: ProfileResponse,
}

const initialAccountState:AccountState = {
  userID: -1,
  userRole: RoleEnum.STUDENT,
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
    updateProfileImage: (state, action:PayloadAction<string|undefined>) => state = {...state, userProfile: {...state.userProfile, image: action.payload}},

    addCircle: (state, action: PayloadAction<CircleListItem>) => state = addListItem(state, action, 'circleList'),
    removeCircle: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'circleList', 'circleID'),
    addCircleInvite: (state, action: PayloadAction<CircleListItem>) => state = addListItem(state, action, 'circleInviteList'),
    removeCircleInvite: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'circleInviteList', 'circleID'),
    addCircleRequest: (state, action: PayloadAction<CircleListItem>) => state = addListItem(state, action, 'circleRequestList'),
    removeCircleRequest: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'circleRequestList', 'circleID'),
    addPartner: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(state, action, 'partnerList'),
    removePartner: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'partnerList', 'userID'),
    addPartnerPendingUser: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(state, action, 'partnerPendingUserList'),
    removePartnerPendingUser: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'partnerPendingUserList', 'userID'),
    addPartnerPendingPartner: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(state, action, 'partnerPendingPartnerList'),
    removePartnerPendingPartner: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'partnerPendingPartnerList', 'userID'),
    addPrayerRequest: (state, action: PayloadAction<PrayerRequestListItem>) => state = addListItem(state, action, 'prayerRequestList'),
    removePrayerRequest: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'prayerRequestList', 'requestID'),
    addContact: (state, action: PayloadAction<ProfileListItem>) => state = addListItem(state, action, 'contactList'),
    removeContact: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'contactList', 'userID'),
  },
});

//Export Dispatch Actions
export const { setAccount, resetAccount, updateJWT, updateProfile, updateProfileImage, 
        addCircle, removeCircle, addCircleInvite, removeCircleInvite, addCircleRequest, removeCircleRequest,
        addPartner, removePartner, addPartnerPendingUser, removePartnerPendingUser, addPartnerPendingPartner, removePartnerPendingPartner, 
        addPrayerRequest, removePrayerRequest, addContact, removeContact
    } = accountSlice.actions;

//List Utilities
const addListItem = <T, K extends keyof ProfileResponse>(state:AccountState, action:PayloadAction<T>, listKey:K):AccountState => ({
  ...state, userProfile: { ...state.userProfile,
    [listKey]: [action.payload, ...(state.userProfile[listKey] || []) as T[]]
  }});

const removeListItem = <T, K extends keyof ProfileResponse>(state:AccountState, action:PayloadAction<number>, listKey:K, idKey:keyof T):AccountState => ({
  ...state, userProfile: { ...state.userProfile,
    [listKey]: (state.userProfile[listKey] as T[] || []).filter((item:T) => item[idKey] !== action.payload)
  }});
  

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
      const jwt = user.jwt;
      const userProfile = user.userProfile;

      if(!jwt || !userProfile) 
        throw 'Invalid Cached Credentials';

      //Re-authenticate JWT
      await axios.get(`${process.env.REACT_APP_DOMAIN}/api/authenticate`, {
        headers: {
          jwt: jwt
        }
      }).then((response:{ data: JwtResponseBody }) => { 
        dispatch(setAccount({userID: response.data.userID, userRole: response.data.userRole, jwt: response.data.jwt, userProfile: userProfile}));
        notify(`Welcome ${userProfile?.firstName}`, ToastStyle.INFO);
        
      }).catch((response:AXIOSError) => {
        throw response.response?.data.action || 'Invalid JWT Token';
      });

    } catch(error) {
      console.error('Auto attempt failed to Re-login with cached credentials', error);

      logoutAccount(dispatch, getState, `/login?redirect=${encodeURIComponent(window.location.pathname)}`);

      notify('Please Login', ToastStyle.WARN);
    }
  }
}

export const logoutAccount = async(dispatch: (arg0: {type: 'account/resetAccount'; }) => void, getState: AccountState, redirect:string = '/login') => {
  console.warn('REDUX Account & localStorage cleared: logoutAccount | redirect: ', redirect);
  window.localStorage.setItem('user', '');
  window.location.assign(redirect);
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