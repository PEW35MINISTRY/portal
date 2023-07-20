import React, { useState, useEffect, forwardRef, useRef, useLayoutEffect } from "react";
import{Provider} from 'react-redux';
import { BrowserRouter, Route, Routes, Navigate, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import "./App.scss";
import { useAppSelector, useAppDispatch } from './hooks';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import store, { AppDispatch, logoutAccount } from './redux-store';

//Components
import Login from "./1-Profile/Login";
import Signup from "./1-Profile/Signup";
import EditProfile from "./1-Profile/EditProfile";
import DirectChat from "./3-Chat-Direct-Demo/Chat";
import CircleChat from "./4-Chat-Circle-Demo/Chat";
import Log from "./10-Log/Log";



//Assets
import LOGO from './0-Assets/logo.png';

const App = () => {

  return (
    <BrowserRouter>
        <Provider store={store}>
        <AppContent/>
        <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={true}
            pauseOnHover={true}
            transition={Slide}
            limit={3}
            theme="light"
            />
      </Provider>
    </BrowserRouter>
  );
}

export default App;

const AppContent = () => {
  const dispatch = useAppDispatch();

  const displayName:string = useAppSelector((state) => state.account.userProfile.displayName);
  const userID:number = useAppSelector((state) => state.account.userID);
  const jwt:string = useAppSelector((state) => state.account.jwt);

  return (
      <div id="app">

        <div id="app-navigation">
          <Link to="/portal/dashboard" style={{ textDecoration: 'none' }}>
            <div id="logo-box" >
              <img src={LOGO} alt='log-title'/>
              <h1>Encouraging Prayer</h1>
            </div>
          </Link>

          <div id="page-menu">
            <NavLink to="/login"  className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              + Login
            </NavLink>
            <NavLink to="/signup" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Sign Up
            </NavLink>
            <NavLink to={`/portal/edit-profile/${userID}`} className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Edit Profile
            </NavLink>
            <NavLink to="/portal/direct-chat" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Direct Chat
            </NavLink>
            <NavLink to="/portal/circle-chat" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Circle Chat
            </NavLink>
            <NavLink to="/portal/logs" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
              &#9840; Logs
            </NavLink>

            <button className={'page'} onClick={()=>store.dispatch((logoutAccount) as AppDispatch)}>
              - Logout
            </button>
          </div>
          
        </div>

        <div id="app-content">
          <div id="app-header">
              <h2>Welcome to the Portal</h2>
              <NavLink to="/login" id='profile-box'>
                <label >{displayName} | {userID} </label>
              </NavLink>
          </div>

          <div id="app-body">
          {/* Priority Order */}
              <Routes>
                <Route path='/portal' element={ <Navigate to="/portal/dashboard" /> }/>
                <Route path="/portal/dashboard" element={"Dashboard coming Eventually :)"}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/signup" element={<Signup/>}/>
                <Route path="/portal/edit-profile/:id" element={<EditProfile/>}/>
                <Route path="/portal/direct-chat" element={<DirectChat/>}/>
                <Route path="/portal/circle-chat" element={<CircleChat/>}/>
                <Route path="/portal/logs" element={<Log/>}/>
                <Route path="*" element={<PageNotFound/>} />
              </Routes>

          </div>
        </div>
        
      </div>
  );
}

const PageNotFound = () => {

  return (
    <div id="page-not-found">
      <h3>Sorry page not Found</h3>
      <Link to='/portal'>
        <button >Return to Dashboard</button>
      </Link>
    </div>);
}
