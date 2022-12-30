import React, { useState, useEffect, forwardRef, useRef } from "react";
import { BrowserRouter, Route, Routes, Navigate, NavLink, Link, useNavigate } from "react-router-dom";
import "./App.scss";
import { useAppSelector, useAppDispatch } from './hooks';

//Components
import Login from "./1-Login/Login";
import Signup from "./2-Signup/Signup";
import EditProfile from "./2-Signup/EditProfile";
import DirectChat from "./3-Chat-Direct-Demo/Chat";
import CircleChat from "./4-Chat-Circle-Demo/Chat";
import Log from "./10-Log/Log";



//Assets
import LOGO from './0-Assets/logo.png';

const App = () => {
  const displayName:string = useAppSelector((state) => state.account.userProfile.displayName);
  const userId:number = useAppSelector((state) => state.account.userId);


  return (
    <BrowserRouter>
    <div id="app">

      <div id="app-navigation">
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <div id="logo-box" >
            <img src={LOGO} alt='log-title'/>
            <h1>Encouraging Prayer</h1>
          </div>
        </Link>

        <div id="page-menu">
          <NavLink to="/login"  className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Login
          </NavLink>
          <NavLink to="/signup" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Sign Up
          </NavLink>
          <NavLink to="/edit-profile" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Edit Profile
          </NavLink>
          <NavLink to="/direct-chat" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Direct Chat
          </NavLink>
          <NavLink to="/circle-chat" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Circle Chat
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Logs
          </NavLink>

        </div>
      </div>

      <div id="app-content">
        <div id="app-header">
            <h2>Welcome to the Portal</h2>
            <NavLink to="/login" id='profile-box'>
              <label >{displayName} | {userId} </label>
            </NavLink>
        </div>

        <div id="app-body">
            <Routes>
              <Route path='/' element={ <Navigate to="/login" /> }/>
              <Route path="/dashboard" element={"Dashboard coming Eventually :)"}/>
              <Route path="/login" element={<Login/>}/>
              <Route path="/signup" element={<Signup/>}/>
              <Route path="/edit-profile" element={<EditProfile/>}/>
              <Route path="/direct-chat" element={<DirectChat/>}/>
              <Route path="/circle-chat" element={<CircleChat/>}/>
              <Route path="/logs" element={<Log/>}/>
              <Route path="*" element={<PageNotFound/>} />
            </Routes>

        </div>
      </div>
    </div>
    </BrowserRouter>
  );
}

export default App;

const PageNotFound = () => {

  return (
    <div id="page-not-found">
      <h3>Sorry page not Found</h3>
      <Link to='/'>
        <button >Return to Dashboard</button>
      </Link>
    </div>);
}
