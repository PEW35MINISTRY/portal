import React from 'react';
import {createStore, combineReducers} from 'redux';
import { configureStore } from '@reduxjs/toolkit'


const initialAccountState = {
  userId: 0,
  JWT: '100',
  userProfile: {}
}; 

const accountReducer = (state = initialAccountState, action: { type: string; payload: any; }) => { 
  switch(action.type) {
   
    case 'login':
      console.log('Redux Setting LOGIN', action.payload);
      return {...action.payload};

    default: return state; 
  }
}

//Redux Store
const allStateDomains = combineReducers({
  account: accountReducer,
});

const store = createStore(allStateDomains,{});;

export default  store;

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch