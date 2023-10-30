import { useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { makeDisplayText } from '../1-Utilities/utilities';
import store, { AppDispatch, logoutAccount } from './redux-store';

import './App.scss';

//Components
import Dashboard from '../10-Dashboard/Dashboard';
import CircleEditPage from '../11-Models/CircleEditPage';
import PrayerRequestEditPage from '../11-Models/PrayerRequestEditPage';
import UserEditPage from '../11-Models/UserEditPage';
import CircleChat from '../12-Features/Chat-Circle-Demo/Chat';
import DirectChat from '../12-Features/Chat-Direct-Demo/Chat';
import Log from '../12-Features/Log';

//Assets
import LOGO from '../0-Assets/logo.png';
import PROFILE_ICON from '../0-Assets/profile-icon-blue.png';
import PROFILE_ICON_ACTIVE from '../0-Assets/profile-icon-white.png';
import CIRCLE_ICON from '../0-Assets/circle-icon-blue.png';
import CIRCLE_ICON_ACTIVE from '../0-Assets/circle-icon-white.png';
import PRAYER_REQUEST_ICON from '../0-Assets/prayer-request-icon-blue.png';
import PRAYER_REQUEST_ICON_ACTIVE from '../0-Assets/prayer-request-icon-white.png';
import DIRECT_CHAT_ICON from '../0-Assets/messaging-icon-blue.png';
import DIRECT_CHAT_ICON_ACTIVE from '../0-Assets/messaging-icon-white.png';
import CIRCLE_CHAT_ICON from '../0-Assets/chat-icon-blue.png';
import CIRCLE_CHAT_ICON_ACTIVE from '../0-Assets/chat-icon-white.png';
import LOG_ICON from '../0-Assets/log-icon-blue.png';
import LOG_ICON_ACTIVE from '../0-Assets/log-icon-white.png';
import PREFERENCES_ICON from '../0-Assets/settings-icon-blue.png';
import PREFERENCES_ICON_ACTIVE from '../0-Assets/settings-icon-white.png';
import LOGOUT_ICON from '../0-Assets/logout-icon-blue.png';
import LOGOUT_ICON_ACTIVE from '../0-Assets/logout-icon-white.png';


type MenuPageListing = {
  label:string,
  route?:string,
  onClick?:Function,
  activeIcon:string,
  inactiveIcon:string,
  addRoute?:string,
  exclusiveRoleList?:RoleEnum[] //Roles to show only; undefined allows all
}


const AppContent = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const displayName:string = useAppSelector((state) => state.account.userProfile.displayName);
    const profileImage:string|undefined = useAppSelector((state) => state.account.userProfile.image);

    const menuRef = useRef<null | HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState<boolean>(true);
    const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

    const MENU_CONFIG_LIST:MenuPageListing[] = [
      {label: 'Profile', route: `/portal/edit/profile/${userID}`, activeIcon: PROFILE_ICON_ACTIVE, inactiveIcon: PROFILE_ICON},
      {label: 'Circle', route: '/portal/edit/circle/-1', activeIcon: CIRCLE_ICON_ACTIVE, inactiveIcon: CIRCLE_ICON, addRoute: '/portal/edit/circle/new', exclusiveRoleList: [RoleEnum.CIRCLE_LEADER, RoleEnum.ADMIN]},
      {label: 'Prayer Request', route: '/portal/edit/prayer-request/-1', activeIcon: PRAYER_REQUEST_ICON_ACTIVE, inactiveIcon: PRAYER_REQUEST_ICON, addRoute: '/portal/edit/prayer-request/new'},
      {label: 'Messages', route: '/portal/chat/direct', activeIcon: DIRECT_CHAT_ICON_ACTIVE, inactiveIcon: DIRECT_CHAT_ICON},
      {label: 'Circle Chat', route: '/portal/chat/circle', activeIcon: CIRCLE_CHAT_ICON_ACTIVE, inactiveIcon: CIRCLE_CHAT_ICON},
      {label: 'Logs', route: '/portal/logs', activeIcon: LOG_ICON_ACTIVE, inactiveIcon: LOG_ICON, exclusiveRoleList: [RoleEnum.ADMIN]},
    ];

    const PROFILE_MENU_CONFIG_LIST:MenuPageListing[] = [
      {label: 'Preferences', activeIcon: PREFERENCES_ICON_ACTIVE, inactiveIcon: PREFERENCES_ICON},
      {label: 'Logout', route: '/login', onClick: ()=>store.dispatch((logoutAccount) as AppDispatch), activeIcon: LOGOUT_ICON_ACTIVE, inactiveIcon: LOGOUT_ICON},
    ];

    return (
        <div id='app'>
  
          <div id='app-navigation' className={showMenu ? '' : 'collapse'} ref={menuRef} onClick={(event)=>{if(event.currentTarget === event.target) setShowMenu(current => !current)}}>
            <Link to='/portal/dashboard' style={{ textDecoration: 'none' }}>
              <div id='logo-box' className='page' >
                <img src={LOGO} alt='log-title'/>
                <h1 className={showMenu ? '' : 'hide'} >Encouraging Prayer</h1>
              </div>
            </Link>

            <button id='menu-close-button' className='hide' onClick={()=>setShowMenu(current => !current)} ><p className={showMenu ? 'less-than' : 'greater-than'}>{showMenu ? '<' : '>'}</p></button>

            <div id='app-menu'>

              {MENU_CONFIG_LIST.map((page, index) => 
                    <NavLink key={'menu-'+index} to={page.route || ''} onClick={()=> page.onClick && page.onClick()}
                        className={({ isActive }) => (isActive ? 'active' : '') + ' page' + ((page.exclusiveRoleList === undefined || page.exclusiveRoleList.includes(userRole as RoleEnum)) ? '' : ' hide')}>
                      {({ isActive }) => (
                        <>
                          <img className={isActive ? 'active-icon' : 'active-icon hide'} src={page.activeIcon} />
                          <img className={isActive ? 'inactive-icon hide' : 'inactive-icon'} src={page.inactiveIcon} />
                          <label className={showMenu ? '' : 'hide'} >{page.label}</label>
                          {page.addRoute && showMenu &&
                            <section className='add-button-wrapper' onClick={(event)=> {event.preventDefault(); event.stopPropagation(); navigate(page.addRoute || 'menu/add/'+index);}} >
                              <span className='add-button' ><p>+</p></span>
                            </section>}
                        </>
                      )}
                    </NavLink>
                )}

            </div>

            {showProfileMenu && <div id='absolute-wrapper' onClick={()=>setShowProfileMenu(false)}></div> }

            {showProfileMenu &&
              <div id='profile-menu' style={{minWidth:menuRef.current?.offsetWidth || 'auto'}} >

                {PROFILE_MENU_CONFIG_LIST.map((page, index) => 
                  <NavLink key={'profile-menu-'+index} to={page.route || 'menu/profile/'+index}  onClick={() => {setShowProfileMenu(false); if(page.onClick) page.onClick();}}
                      className={'page' + ((page.exclusiveRoleList === undefined || page.exclusiveRoleList.includes(userRole as RoleEnum)) ? '' : ' hide')}>
                        <img className={'active-icon'} src={page.activeIcon} />
                        <img className={'inactive-icon'} src={page.inactiveIcon} />
                        <label className={showMenu ? '' : 'hide'} >{page.label}</label>
                        {page.addRoute && showMenu &&
                            <section className='add-button-wrapper' onClick={(event)=> {event.preventDefault(); event.stopPropagation(); navigate(page.addRoute || 'menu/profile/add'+index);}} >
                              <span className='add-button' ><p>+</p></span>
                            </section>}
                  </NavLink>
                )}
                
              </div> }

            <section id='profile-box' className={'page'} onClick={()=>setShowProfileMenu(true)}>             
              <img className={'active-icon'} src={profileImage || PROFILE_ICON_ACTIVE} alt='User-Profile-Image' />
              <img className={'inactive-icon'} src={profileImage || PROFILE_ICON} alt='User-Profile-Image' />
              <section id='profile-box-vertical' className={showMenu ? '' : 'hide'} >
                <h2 className={showMenu ? '' : 'hide'} >{displayName}</h2>
                <h5 className={showMenu ? '' : 'hide'} >{makeDisplayText(userRole)}</h5>
              </section>
            </section>            
          </div>
  
          <div id='app-content'>
               {/* Priority Order */}
                <Routes>
                  <Route path='/portal' element={ <Navigate to='/portal/dashboard' /> }/>
                  <Route path='/portal/dashboard/*' element={<Dashboard/>}/>
                  <Route path='/portal/edit/profile/:id/*' element={<UserEditPage/>}/>
                  <Route path='/portal/edit/circle/:id/*' element={<CircleEditPage/>}/>
                  <Route path='/portal/edit/prayer-request/:id/*' element={<PrayerRequestEditPage/>}/>
                  <Route path='/portal/chat/direct/*' element={<DirectChat/>}/>
                  <Route path='/portal/chat/circle/*' element={<CircleChat/>}/>
                  <Route path='/portal/logs/*' element={<Log/>}/>
                  <Route path='*' element={<PageNotFound/>} />
                </Routes>
            </div>
        </div>
    );
  }

  export default AppContent;
  
  const PageNotFound = () => {
  
    return (
      <div id='page-not-found'>
        <div>
          <h1>Sorry Page Not Found</h1>
          <Link to='/portal'>
            <button >Return to Dashboard</button>
          </Link>
        </div>
      </div>);
  }