import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import './App.scss';
import store, { AppDispatch, logoutAccount } from './redux-store';


//Components
import Login from '../11-Models/Login';
import UserEditPage from '../11-Models/UserEditPage';
import UserSignUpPage from '../11-Models/UserSignUpPage';
import CircleChat from '../12-Features/Chat-Circle-Demo/Chat';
import DirectChat from '../12-Features/Chat-Direct-Demo/Chat';
import Log from '../12-Features/Log';

//Assets
import LOGO from '../0-Assets/logo.png';


const App = () => {

  return (
    <BrowserRouter>
        <Provider store={store}>
        <AppContent/>
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

const AppContent = () => {
  const dispatch = useAppDispatch();

  const displayName:string = useAppSelector((state: { account: { userProfile: { displayName: any; }; }; }) => state.account.userProfile.displayName);
  const userID:number = useAppSelector((state: { account: { userID: any; }; }) => state.account.userID);
  const jwt:string = useAppSelector((state: { account: { jwt: any; }; }) => state.account.jwt);

  return (
      <div id='app'>

        <div id='app-navigation'>
          <Link to='/portal/dashboard' style={{ textDecoration: 'none' }}>
            <div id='logo-box' >
              <img src={LOGO} alt='log-title'/>
              <h1>Encouraging Prayer</h1>
            </div>
          </Link>

          <div id='page-menu'>
            <NavLink to='/login'  className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              + Login
            </NavLink>
            <NavLink to='/signup' className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Sign Up
            </NavLink>
            <NavLink to={`/portal/edit/profile/${userID}`} className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Edit Profile
            </NavLink>
            <NavLink to='/portal/chat/direct' className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Direct Chat
            </NavLink>
            <NavLink to='/portal/chat/circle' className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Circle Chat
            </NavLink>
            <NavLink to='/portal/logs' className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Logs
            </NavLink>

            <button className={'page'} onClick={()=>store.dispatch((logoutAccount) as AppDispatch)}>
              - Logout
            </button>
          </div>
          
        </div>

        <div id='app-content'>
          <div id='app-header'>
              <h2>Welcome to the Portal</h2>
              <NavLink to='/login' id='profile-box'>
                <label >{displayName} | {userID} </label>
              </NavLink>
          </div>

          <div id='app-body'>
          {/* Priority Order */}
              <Routes>
                <Route path='/portal' element={ <Navigate to='/portal/dashboard' /> }/>
                <Route path='/portal/dashboard' element={'Dashboard coming Eventually :)'}/>
                <Route path='/login' element={<Login/>}/>
                <Route path='/signup' element={<UserSignUpPage/>}/>
                <Route path='/portal/edit/profile/:id' element={<UserEditPage/>}/>
                <Route path='/portal/chat/direct' element={<DirectChat/>}/>
                <Route path='/portal/chat/circle' element={<CircleChat/>}/>
                <Route path='/portal/logs' element={<Log/>}/>
                <Route path='*' element={<PageNotFound/>} />
              </Routes>

          </div>
        </div>
        
      </div>
  );
}

const PageNotFound = () => {

  return (
    <div id='page-not-found'>
      <h3>Sorry page not Found</h3>
      <Link to='/portal'>
        <button >Return to Dashboard</button>
      </Link>
    </div>);
}
