import React from 'react';
import ReactDOM from 'react-dom/client';
import reportWebVitals from './reportWebVitals';
import App from './100-App/App';
import type { AppDispatch } from './100-App/redux-store';
import store, { initializeAccountState, initializeSettingsState } from './100-App/redux-store';

import './index.scss';

//Attempt auto login from local storage
store.dispatch((initializeAccountState) as AppDispatch);
store.dispatch((initializeSettingsState) as AppDispatch);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
