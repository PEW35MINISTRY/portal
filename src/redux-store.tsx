import React from 'react';
import {createStore, combineReducers} from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import axios from 'axios';
import { Id, toast } from 'react-toastify';
import { ToastStyle, serverErrorResponse, ProfileResponse } from './app-types';


/******************************
   Account | Credentials Redux Reducer
*******************************/

const initialAccountState = {
  userId: 0,
  JWT: '',
  userProfile: {} as ProfileResponse
}; 

const accountReducer = (state = initialAccountState, action: { type: string; payload: any; }) => { 
  switch(action.type) {
   
/* Verify cached JWT | auto login   */
    case 'authenticate':
      axios.get(`${process.env.REACT_APP_DOMAIN}/api/authenticate`, {
        headers: {
          'jwt': '100.100.100'
        }
      }).then(response => { 
        store.dispatch({type: "notify", payload: {
          response: response,
          message: `Logging in ${state.userProfile.firstName}`,
        }});
        
      }).catch((response) => {
        if(window.location.pathname !== '/login')
            store.dispatch({type: "notify", payload: {
              response: response,
              message: 'Please Login',
              callback: () => {
                if(state.JWT !== initialAccountState.JWT) 
                  store.dispatch({type: 'logout', payload: undefined});
              }
            }});
      });

      return state;

/* Logging Out User   */
      case 'load-login':
        try{
          if(window.localStorage.getItem('user') === null || !window.localStorage.getItem('user')?.length)
            throw new Error("No Cache");
  
          const user = JSON.parse(window.localStorage.getItem('user') || '');
          console.log('Redux Cache User: ', user);
          const userId = user.userId;
          const JWT = user.JWT;
          const profile = user.userProfile;
  
          if(!userId || !JWT || !profile) 
            throw new Error("Invalid Cache");
  
          setTimeout(()=>store.dispatch({type: "authenticate", payload: {}}), 1);

          return {userId: userId, JWT: JWT, userProfile: profile};

        } catch(error) {
          console.error('Redux Re-login Failed', error);
          setTimeout(()=>store.dispatch({type: "logout", payload: {}}), 1)
        }
      
        return {...initialAccountState};

/* Save Payload to Account State | complete replace   */
    case 'save-login': 
      return {...action.payload};

/* Logging In User   */
    case 'login':
      axios.post(`${process.env.REACT_APP_DOMAIN}/login`, {
        email: action.payload.email,
        displayName: action.payload.displayName,
        password: action.payload.password,

        }).then(response => {
          const userPayload =  {
                JWT: response.data.JWT,
                userId: response.data.userId,
                userProfile: response.data.userProfile,
              };

          store.dispatch({type: "notify", payload: {
              response: response,
              message: `Welcome`,
              callback: () => {
                store.dispatch({type: "reset-login", payload: {}});
              }
            }});

          window.localStorage.setItem('user', JSON.stringify(userPayload));
          window.location.assign('/portal/dashboard');

          store.dispatch({type: "save-login", payload: userPayload});

        }).catch((response) => { 

          store.dispatch({type: "notify", payload: {
            response: response,
            toastType: ToastStyle.ERROR, 
            message: 'Please login',
          }});

        });

        return state;

  /* Logging Out User   */
      case 'logout':
        console.log(state);
        const userId = state.userId;
        const jwt = state.JWT;
        axios.post(`${process.env.REACT_APP_DOMAIN}/api/logout/${userId}`,{},{
          headers: {
            'user-id': userId,
            'jwt': '100.100.100'
        }}
        ).then(response => { 
          store.dispatch({type: "notify", payload: {
            response: response,
            toastType: ToastStyle.WARN, 
            message: `${state.userProfile.firstName} Logged Out`,
            callback: () => {
              store.dispatch({type: "reset-login", payload: {}});
              window.location.assign('/login');
            }
          }});

        }).catch((response) => { 

          store.dispatch({type: "notify", payload: {
            response: response,
            toastType: ToastStyle.WARN, 
            message: 'Please login',
            callback: () => {
              window.localStorage.removeItem('user');

              if(window.location.pathname.includes('portal')) //clears state on 'load-login'
                  window.location.assign('/login');
            }
          }});
        });

        

        // return {...initialAccountState};
        return state;

/* Resetting Account State to defaults */
      case 'reset-login':
        return {...initialAccountState};

    default: return state; 
  }
}

/******************************
   notify Redux Reducer
*******************************/

//ToastID List | keeping track to prevent duplicates
const initialNotificationState: Array<string> = []; 
const toastDuration = 5000;
//Note: ToastStyle defined: app-types.tsx
const notificationReducer = (state = initialNotificationState, action: { type: string, payload: {style: ToastStyle; message: string; status:number; log:any, callback: () => void; response: any}}) => { 

  if(action.type === 'notify') {

    let toastStyle:ToastStyle = action.payload.style || ToastStyle.ERROR;
    let status:number = action.payload.status || 500;
    let message:string = action.payload.message || '';

    if(action.payload.response?.response?.data) {
      const serverError:serverErrorResponse = action.payload.response.response.data;
      status = action.payload.status || serverError.status;
      message = action.payload.message || serverError.message;
      action.payload.log = action.payload.log || serverError;
    } else if(action.payload.response) {
      status = action.payload.status || action.payload.response.status;
    }

    console.log(toastStyle, status, message, action.payload.log);

    if(state.includes(message))
      return state;

    if(status == 400) {
      toast.error('Missing details');
    } else if(status == 401) {
      toast.error('Sorry not permitted');
    } else if(status == 404) {
      toast.error('Not found');

    //Requiring Message length to display
    } else if(!message?.length) {
      toast.error('Unknown error has occurred');   

    } else if(status == 202 || toastStyle == ToastStyle.SUCCESS) {
      toast.success(message);
      //@ts-ignore
    } else if(status < 300 || toastStyle == ToastStyle.INFO) {
      toast.info(message);
    } else if(status < 500 || toastStyle == ToastStyle.WARN) {
      toast.warn(message);
    } else {
      toast.error(message);
    }   

    //Auto Removal
    setTimeout(()=>{
      store.dispatch({type: "remove-notification", payload: {message: message}});
      if(action.payload.callback) action.payload.callback();
    }, toastDuration);

    return [...state, message];

  } else if(action.type === 'remove-notification') {
    return [...state.filter(text => text !== action.payload.message)];

  } else
    return state;
}

//Redux Store
const allStateDomains = combineReducers({
  account: accountReducer,
  notify: notificationReducer,
});

const store = createStore(allStateDomains,{});

export default  store;

//Auto Authenticate JWT
store.dispatch({type: "load-login", payload: {}});

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch