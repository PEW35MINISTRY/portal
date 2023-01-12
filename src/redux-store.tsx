import React from 'react';
import {createStore, combineReducers} from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import axios from 'axios';


const initialAccountState = {
  userId: 0,
  JWT: '',
  userProfile: {}
}; 

const accountReducer = (state = initialAccountState, action: { type: string; payload: any; }) => { 
  switch(action.type) {
   
    case 'save-login': 
      return {...action.payload};

    case 're-login':
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

        return {userId: userId, JWT: JWT, userProfile: profile};

      } catch(error) {
        console.error('Redux Re-login Failed', error);
        setTimeout(()=>store.dispatch({type: "logout", payload: {}}), 1); //TODO Fix Reducers may not dispatch actions'
      }
    
      return {...initialAccountState};

    case 'login':
      axios.post(`${process.env.REACT_APP_DOMAIN}/login`, {
        email: action.payload.email,
        password: action.payload.password,

        }).then(response => {
          const userPayload =  {
                JWT: response.data.JWT,
                userId: response.data.userId,
                userProfile: response.data.userProfile,
              };
          console.log('REDUX Login Successfully', response.data.userId, response.data.service);
          window.localStorage.setItem('user', JSON.stringify(userPayload));
          window.location.assign('/dashboard');
          store.dispatch({type: "save-login", payload: userPayload});

        }).catch(error => console.log('REDUX AXIOS Login Error:', error));

        return state;

      case 'logout':
        window.localStorage.removeItem('user');
        if(window.location.pathname != '/login')
            window.location.assign('/login');

        return {...initialAccountState};

    default: return state; 
  }
}

//Redux Store
const allStateDomains = combineReducers({
  account: accountReducer,
});

const store = createStore(allStateDomains,{});

export default  store;

//Auto Login
store.dispatch({type: "re-login", payload: {}});

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch