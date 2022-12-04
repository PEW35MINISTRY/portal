import React, { useState, useEffect, forwardRef, useRef } from "react";
import { BrowserRouter, Route, Routes, Navigate, NavLink, Link } from "react-router-dom";
import "./App.scss";

//Components
import Chat from "./1-Chat-Demo/Chat";


//Assets
import LOGO from './0-Assets/logo.png';

const App = () => {

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
          <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Chat
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => (isActive ? 'active' : '')+' page'}>
            &#9840; Logs
          </NavLink>

        </div>
      </div>

      <div id="app-content">
        <div id="app-header">
            <h2>Welcome to the Portal</h2>
        </div>

        <div id="app-body">
            <Routes>
              <Route path='/' element={ <Navigate to="/login" /> }/>
              <Route path="/dashboard" element={"Dashboard coming Eventually :)"}/>
              <Route path="/login" element={"Login Page"}/>
              <Route path="/signup" element={"Sign Up Page"}/>
              <Route path="/chat" element={<Chat/>}/>
              <Route path="/logs" element={"Log Page Coming Soon!"}/>
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
