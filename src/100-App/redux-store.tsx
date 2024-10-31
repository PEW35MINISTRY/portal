import { configureStore, createSlice, Middleware, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { LoginResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types.js';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
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
  userRole: RoleEnum.USER,
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
    addPartner: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(
                                                                              addListItem(state, action as PayloadAction<ProfileListItem>, 'contactList'),
                                                                              action, 'partnerList'),
    removePartner: (state, action: PayloadAction<number>) => state = removeListItem(
                                                                        removeListItem(state, action, 'contactList', 'userID'),
                                                                        action, 'partnerList', 'userID'),
    addPartnerPendingUser: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(state, action, 'partnerPendingUserList'),
    removePartnerPendingUser: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'partnerPendingUserList', 'userID'),
    addPartnerPendingPartner: (state, action: PayloadAction<PartnerListItem>) => state = addListItem(state, action, 'partnerPendingPartnerList'),
    removePartnerPendingPartner: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'partnerPendingPartnerList', 'userID'),
    addContact: (state, action: PayloadAction<ProfileListItem>) => state = addListItem(state, action, 'contactList'),
    removeContact: (state, action: PayloadAction<number>) => state = removeListItem(state, action, 'contactList', 'userID'),
  },
});

//Export Dispatch Actions
export const { setAccount, resetAccount, updateJWT, updateProfile, updateProfileImage, 
        addCircle, removeCircle, addCircleInvite, removeCircleInvite, addCircleRequest, removeCircleRequest,
        addPartner, removePartner, addPartnerPendingUser, removePartnerPendingUser, addPartnerPendingPartner, removePartnerPendingPartner, 
        addContact, removeContact
    } = accountSlice.actions;

export const saveJWTMiddleware:Middleware = store => next => action => {
    const result = next(action);

    if(action.type === setAccount.type || action.type === updateJWT.type) {
      localStorage.setItem('jwt', store.getState().account.jwt);
    }

    return result;
};

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
//Called directly in index.tsx: store.dispatch(initializeAccountState); 
export const initializeAccountState = async(dispatch: (arg0: { payload: AccountState; type: 'account/setAccount'; }|{type: 'account/resetAccount'; }) => void, getState: AccountState) => { 
  if(window.location.pathname.includes('portal')) {
    try {
      const jwt:string = window.localStorage.getItem('jwt') || '';

      if(!jwt || !jwt.length)
        throw 'Invalid Cached Authentication';

      //Login via JWT
      await axios.post(`${process.env.REACT_APP_DOMAIN}/api/authenticate`, { }, { headers: { jwt }
      }).then((response:{ data:LoginResponseBody }) => {
        const account:AccountState = {
            jwt: response.data.jwt,
            userID: response.data.userID,
            userRole: RoleEnum[response.data.userRole],
            userProfile: response.data.userProfile,
        };
        //Save to Redux for current session
        dispatch(setAccount(account));

        notify(`Welcome ${account.userProfile?.firstName}`, ToastStyle.INFO);
        
      }).catch((response:AXIOSError) => {
        throw response.response?.data.action || 'Invalid JWT Token';
      });

    } catch(error) {
      console.error('Auto attempt failed to Re-login with cached authentication', error);

      logoutAccount(dispatch, `/login?redirect=${encodeURIComponent(window.location.pathname)}`);

      notify('Please Login', ToastStyle.WARN);
    }
  }
}

export const logoutAccount = async(dispatch: (arg0: {type: 'account/resetAccount'; }) => void, redirect?:string) => {
  console.warn('REDUX Account & localStorage cleared: logoutAccount | redirect: ', redirect);
  window.localStorage.clear();

  if(redirect)
      window.location.assign(redirect);

  dispatch(resetAccount());
  store.dispatch(resetLastNewPartnerRequest());

  notify('Logging Out', ToastStyle.INFO);
}

//Redux Middleware Listeners: https://redux-toolkit.js.org/api/createListenerMiddleware


/*****************************************
   SETTINGS | Redux Reducer
   Temporary - for current session only
******************************************/

export type SettingsState = {
  version:number, //Settings version to indicate local storage reset
  ignoreCache:boolean,
  skipAnimation:boolean,
  lastNewPartnerRequest:number|undefined, //timestamp
}

const initialSettingsState:SettingsState = {
  version: parseInt(process.env.REACT_APP_SETTINGS_VERSION ?? '1', 10),
  ignoreCache: false,
  skipAnimation: false,
  lastNewPartnerRequest: undefined,
};

//Use as default; but don't save to local storage
export const DEFAULT_LAST_NEW_PARTNER_REQUEST:number = Date.now() - parseInt(process.env.REACT_APP_NEW_PARTNER_TIMEOUT ?? '3600000', 10);  //1 hour ago
 
const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    setSettings: (state, action:PayloadAction<SettingsState>) => state = {...action.payload},
    resetSettings: () => initialSettingsState,
    setIgnoreCache: (state, action:PayloadAction<boolean>) => state = {...state, ignoreCache: action.payload},
    setSkipAnimation: (state, action:PayloadAction<boolean>) => state = {...state, skipAnimation: action.payload},
    setLastNewPartnerRequest: (state) => state = {...state, lastNewPartnerRequest: Date.now()},
    resetLastNewPartnerRequest: (state) => state = {...state, lastNewPartnerRequest: undefined},    
  },
});

//Export Dispatch Actions
export const { setSettings, resetSettings,
    setIgnoreCache, setSkipAnimation, 
    setLastNewPartnerRequest, resetLastNewPartnerRequest,
} = settingsSlice.actions;


export const initializeSettingsState = async(dispatch: (arg0: { payload: SettingsState; type: 'settings/setSettings'; }|{type: 'settings/resetSettings'; }) => void, getState: AccountState) => {
    try {
        const localStorageSettings:string|null = localStorage.getItem('settings');
        const savedSettings:SettingsState = localStorageSettings ? JSON.parse(localStorageSettings) : initialSettingsState;
        if(!isNaN(savedSettings.version) && (savedSettings.version == parseInt(process.env.REACT_APP_SETTINGS_VERSION ?? '1', 10)))
          dispatch(setSettings({ ...savedSettings }));

        else {
          console.warn("Invalid settings configuration, or settings version changed.");
          dispatch(setSettings({...initialSettingsState, ...savedSettings}));
        }
    } catch (error) {
        console.error('REDUX Settings | localStorage initialization failed: ', error);
        dispatch(resetSettings());
    }
};


export const saveSettingsMiddleware:Middleware = store => next => action => {
  const result = next(action);

  if(Object.values(settingsSlice.actions).map(action => action.type).includes(action.type) && action.type !== resetSettings.type) {
    const settingsState: RootState['settings'] = store.getState().settings;
    localStorage.setItem('settings', JSON.stringify(settingsState));

  } else if(action.type === resetSettings.type) {
    localStorage.removeItem('settings');
  }
  return result;
};
  

/************************************
*          REDUX STORE              *     
*************************************/
const store = configureStore({
  reducer: {
    account: accountSlice.reducer,
    settings: settingsSlice.reducer,
  },
  
  //Note: May Define Middleware; however w/o defining types: return and types are automatic: https://v1-2-5--redux-starter-kit-docs.netlify.app/api/getDefaultMiddleware
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(saveJWTMiddleware, saveSettingsMiddleware),
});

export default store;

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
