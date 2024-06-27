import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import store, { AppDispatch, logoutAccount } from './redux-store';

import './App.scss';

//Components
import Login from '../11-Models/Login';
import SignUpPage from '../11-Models/UserSignUpPage';
import InitialAccountFlow from '../12-Features/InitialAccountFlow';
import AppContent from './AppContent';


const App = () => {

  return (
    <BrowserRouter>
        <Provider store={store}>
        <Routes>
            <Route path='/login/*' element={<Login/>}/>
            <Route path='/signup/initial-account-flow/*' element={<InitialAccountFlow/>}/>
            <Route path='/signup/*' element={<SignUpPage/>}/>
            <Route path='/portal/' element={ <Navigate to='/portal/dashboard' /> }/>
            <Route path='/portal/*' element={<AppContent/>}/>
            <Route path='*' element={ <Navigate to='/login' /> }/>
        </Routes>
        <ToastContainer
            position='top-right'
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={true}
            pauseOnHover={true}
            transition={Slide}
            limit={3}
            theme='light'
            />
      </Provider>
    </BrowserRouter>
  );
}

export default App;
