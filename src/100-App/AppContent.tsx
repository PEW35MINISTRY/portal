import React, { useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { makeDisplayText } from '../1-Utilities/utilities';
import { logoutAccount } from './redux-store';
import { ImageDefaultEnum, ImageWidget, ProfileImage } from '../2-Widgets/ImageWidgets';

import './App.scss';

//Components
import Dashboard from '../10-Dashboard/Dashboard';
import AnimationPage from '../12-Features/AnimationPage';
import SupportPage from '../10-Dashboard/SupportPage';
import CircleEditPage from '../11-Models/CircleEditPage';
import PrayerRequestEditPage from '../11-Models/PrayerRequestEditPage';
import UserEditPage from '../11-Models/UserEditPage';
import PartnershipPage, { PARTNERSHIP_VIEW } from '../12-Features/PartnershipPage';
import ContentArchivePage from '../11-Models/ContentArchivePage';
import CircleChat from '../12-Features/Chat-Circle-Demo/Chat';
import DirectChat from '../12-Features/Chat-Direct-Demo/Chat';
import Log from '../12-Features/Log';
import PageNotFound from '../2-Widgets/NotFoundPage';


//Assets
import SUPPORT_ICON from '../0-Assets/icons/support-icon-blue.png';
import SUPPORT_ICON_ACTIVE from '../0-Assets/icons/support-icon-white.png';
import CONTENT_ICON from '../0-Assets/icons/media-icon-blue.png';
import CONTENT_ICON_ACTIVE from '../0-Assets/icons/media-icon-white.png';
import PROFILE_ICON from '../0-Assets/icons/profile-icon-blue.png';
import PROFILE_ICON_ACTIVE from '../0-Assets/icons/profile-icon-white.png';
import PARTNER_ICON from '../0-Assets/icons/partner-icon-blue.png';
import PARTNER_ICON_ACTIVE from '../0-Assets/icons/partner-icon-white.png';
import CIRCLE_ICON from '../0-Assets/icons/circle-icon-blue.png';
import CIRCLE_ICON_ACTIVE from '../0-Assets/icons/circle-icon-white.png';
import PRAYER_REQUEST_ICON from '../0-Assets/icons/prayer-request-icon-blue.png';
import PRAYER_REQUEST_ICON_ACTIVE from '../0-Assets/icons/prayer-request-icon-white.png';
import DIRECT_CHAT_ICON from '../0-Assets/icons/messaging-icon-blue.png';
import DIRECT_CHAT_ICON_ACTIVE from '../0-Assets/icons/messaging-icon-white.png';
import CIRCLE_CHAT_ICON from '../0-Assets/icons/chat-icon-blue.png';
import CIRCLE_CHAT_ICON_ACTIVE from '../0-Assets/icons/chat-icon-white.png';
import LOG_ICON from '../0-Assets/icons/log-icon-blue.png';
import LOG_ICON_ACTIVE from '../0-Assets/icons/log-icon-white.png';
import PREFERENCES_ICON from '../0-Assets/icons/settings-icon-blue.png';
import PREFERENCES_ICON_ACTIVE from '../0-Assets/icons/settings-icon-white.png';
import LOGOUT_ICON from '../0-Assets/icons/logout-icon-blue.png';
import LOGOUT_ICON_ACTIVE from '../0-Assets/icons/logout-icon-white.png';


type MenuPageListing = {
  label:string,
  route:string,
  onClick?:Function,
  activeIcon:string,
  inactiveIcon:string,
  addRoute?:string,
  subMenu?:SubMenuListing[],
  exclusiveRoleList?:RoleEnum[] //Roles to show only; undefined allows all
}

type SubMenuListing = {
  label:string,
  route:string,
  onClick?:Function,
  addRoute?:string,
  exclusiveRoleList?:RoleEnum[] //Inherits from MenuPageListing
}

const AppContent = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:RoleEnum = useAppSelector((state) => state.account.userProfile.userRole);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const displayName:string = useAppSelector((state) => state.account.userProfile.displayName);
    const profileImage:string|undefined = useAppSelector((state) => state.account.userProfile.image);

    //Initial default pages:
    const defaultCircleID: number = useAppSelector((state) => state.account.userProfile.circleList?.[0]?.circleID ?? -1);
    const defaultPrayerRequestID: number = useAppSelector((state) => state.account.userProfile.prayerRequestList?.[0]?.prayerRequestID ?? -1);

    const menuRef = useRef<null | HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState<boolean>(true);
    const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
    const [visitedRouteSet, setVisitedRouteSet] = useState<Set<string>>(new Set()); // Tracking subMenu

    const addVisitedPage = (page: MenuPageListing) => setVisitedRouteSet(currentSet => new Set([...currentSet, page.route]));
    
    const isPageAccessible = (path: string):boolean => {
      const menuPage: MenuPageListing | undefined = MENU_CONFIG_LIST.find((page: MenuPageListing) => 
        matchMenuRouteToPath(page.route, path) 
        || matchMenuRouteToPath(page.addRoute, path)
        || (page.subMenu?.some(subPage => matchMenuRouteToPath(subPage.route, path) 
          || matchMenuRouteToPath(subPage.addRoute, path)))
      );

      if(!menuPage || !userRoleList) {
        if(!menuPage) console.error('Unmatched React Router Path:', path, MENU_CONFIG_LIST.map(page => page.route));
        return false;
      }

      const menuExclusiveRoleList: RoleEnum[] = menuPage.exclusiveRoleList ?? [];
      const subMenuExclusiveRoleList: RoleEnum[] = menuPage.subMenu?.flatMap(subPage => subPage.exclusiveRoleList ?? []) ?? [];
      
      return (
        // Default Permit All Access
        ((menuExclusiveRoleList.length === 0) && (subMenuExclusiveRoleList.length === 0))
    
        // Check Page Permissions
        || (userRoleList?.some(role => menuExclusiveRoleList.includes(role))  
            && (subMenuExclusiveRoleList.length === 0))
    
        // Check SubMenu Permissions
        || ((menuExclusiveRoleList.length === 0)
            && userRoleList?.some(role => subMenuExclusiveRoleList.includes(role)))
    
        // Check Combined Permissions
        || (menuExclusiveRoleList?.some(role => userRoleList.includes(role))
              && subMenuExclusiveRoleList?.some(role => userRoleList.includes(role)))
      );
    }    


    const MENU_CONFIG_LIST:MenuPageListing[] = [
      {label: '* HELP * SUPPORT *', route: `/portal/support`, activeIcon: SUPPORT_ICON_ACTIVE, inactiveIcon: SUPPORT_ICON},
      {label: 'Content Archive', route: '/portal/edit/content-archive/-1', activeIcon: CONTENT_ICON_ACTIVE, inactiveIcon: CONTENT_ICON, addRoute: '/portal/edit/content-archive/new', exclusiveRoleList: [RoleEnum.CONTENT_APPROVER, RoleEnum.ADMIN]},
      {label: 'Profile', route: `/portal/edit/profile/${userID}`, activeIcon: PROFILE_ICON_ACTIVE, inactiveIcon: PROFILE_ICON},
      {label: 'Partnerships', route: `/portal/partnership/recent`, activeIcon: PARTNER_ICON_ACTIVE, inactiveIcon: PARTNER_ICON, exclusiveRoleList: [RoleEnum.ADMIN],
        subMenu: [{label: 'Fewer', route: `/portal/partnership/fewer`},
                  {label: 'Pending', route: `/portal/partnership/pending`}]
      },
      {label: 'Circle', route: `/portal/edit/circle/${defaultCircleID}`, activeIcon: CIRCLE_ICON_ACTIVE, inactiveIcon: CIRCLE_ICON, addRoute: '/portal/edit/circle/new', exclusiveRoleList: [RoleEnum.CIRCLE_LEADER, RoleEnum.ADMIN]},
      {label: 'Prayer Request', route: `/portal/edit/prayer-request/${defaultPrayerRequestID}`, activeIcon: PRAYER_REQUEST_ICON_ACTIVE, inactiveIcon: PRAYER_REQUEST_ICON, addRoute: '/portal/edit/prayer-request/new', exclusiveRoleList: [RoleEnum.USER, RoleEnum.ADMIN]},
      {label: 'Messages', route: '/portal/chat/direct', activeIcon: DIRECT_CHAT_ICON_ACTIVE, inactiveIcon: DIRECT_CHAT_ICON, exclusiveRoleList: [RoleEnum.ADMIN]},
      {label: 'Circle Chat', route: '/portal/chat/circle', activeIcon: CIRCLE_CHAT_ICON_ACTIVE, inactiveIcon: CIRCLE_CHAT_ICON, exclusiveRoleList: [RoleEnum.ADMIN]},
      {label: 'Logs', route: '/portal/logs', activeIcon: LOG_ICON_ACTIVE, inactiveIcon: LOG_ICON, exclusiveRoleList: [RoleEnum.DEVELOPER, RoleEnum.ADMIN]},
    ];

    const PROFILE_MENU_CONFIG_LIST:MenuPageListing[] = [
      {label: 'Preferences', route: '/portal/preferences', activeIcon: PREFERENCES_ICON_ACTIVE, inactiveIcon: PREFERENCES_ICON},
      {label: 'Logout', route: '/login', onClick: ()=>dispatch(() => logoutAccount(dispatch)), activeIcon: LOGOUT_ICON_ACTIVE, inactiveIcon: LOGOUT_ICON},
    ];

    return (
        <div id='app'>

          {location.pathname === '/portal/dashboard/animation' && <AnimationPage/>}
  
          <div id='app-navigation' className={showMenu ? '' : 'collapse'} ref={menuRef} onClick={(event)=>{if(event.currentTarget === event.target) setShowMenu(current => !current)}}>
            <Link to='/portal/dashboard' style={{ textDecoration: 'none' }}>
              <div id='logo-box' className='page' >
                <ImageWidget defaultImage={ImageDefaultEnum.LOGO} />
                <h1 className={showMenu ? '' : 'hide'} >Encouraging Prayer</h1>
              </div>
            </Link>

            <button id='menu-close-button' className='hide' onClick={()=>setShowMenu(current => !current)} ><p className={showMenu ? 'less-than' : 'greater-than'}>{showMenu ? '<' : '>'}</p></button>

            <div id='app-menu'>

              {MENU_CONFIG_LIST.map((page, index) =>
                <React.Fragment key={'menu-'+index} >
                  <NavLink key={'main-menu-'+index} to={page.route || ''} onClick={()=> { addVisitedPage(page); if(page.onClick) page.onClick(); }}
                    className={({ isActive }) => (isActive ? 'active' : '') + ' page' + (isPageAccessible(page.route) ? '' : ' hide')}>
                    {({ isActive }) => (
                      <>
                        <img className={`page-icon active-icon ${isActive ? '' : 'hide'}`} src={page.activeIcon} />
                        <img className={`page-icon inactive-icon ${isActive ? 'hide' : ''}`} src={page.inactiveIcon} />
                        <label className={`page-label ${showMenu ? '' : 'hide'}`} style={(!page.addRoute) ? { gridColumn: '2 / span 3'} : undefined}>{page.label}</label>
                        {page.addRoute && showMenu &&
                          <section className='add-button-wrapper' onClick={(event)=> {event.preventDefault(); event.stopPropagation(); navigate(page.addRoute || 'menu/add/' + index);}} >
                            <span className='add-button' ><p>+</p></span>
                          </section>}
                      </>
                    )}
                  </NavLink>

                  {page.subMenu && visitedRouteSet.has(page.route) && showMenu && (
                    <div key={'sub-menu-wrapper' + index}>
                      {page.subMenu.map((subPage, subIndex) => (
                        <NavLink 
                          key={'sub-menu-' + index + '-' + subIndex} 
                          to={subPage.route} 
                          onClick={() => { addVisitedPage(page); if(subPage.onClick) subPage.onClick(); }}
                          className={({ isActive }) => 
                            (isActive ? 'active' : '') + ' sub-page' + 
                            (isPageAccessible(subPage.route) ? '' : ' hide')}
                        >
                          <label className={`page-label ${showMenu ? '' : 'hide'}`} >{subPage.label}</label>
                          {subPage.addRoute && showMenu &&
                          <section className='add-button-wrapper' onClick={(event)=> {event.preventDefault(); event.stopPropagation(); navigate(subPage.addRoute || 'menu/add/' + index);}} >
                            <span className='add-button' ><p>+</p></span>
                          </section>}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              )}

            </div>


            {showProfileMenu && <div id='absolute-wrapper' onClick={()=>setShowProfileMenu(false)}></div> }

            {showProfileMenu &&
              <div id='profile-menu' style={{minWidth:menuRef.current?.offsetWidth || 'auto'}} >

                {PROFILE_MENU_CONFIG_LIST.map((page, index) => 
                  <NavLink key={'profile-menu-'+index} to={page.route || 'menu/profile/'+index}  onClick={() => {setShowProfileMenu(false); if(page.onClick) page.onClick();}}
                      className={'page' + ((page.exclusiveRoleList === undefined || page.exclusiveRoleList.includes(userRole as RoleEnum)) ? '' : ' hide')}>
                        <img className={'page-icon active-icon'} src={page.activeIcon} />
                        <img className={'page-icon inactive-icon'} src={page.inactiveIcon} />
                        <label className={`page-label ${showMenu ? '' : ' hide'}`} >{page.label}</label>
                        {page.addRoute && showMenu &&
                            <section className='add-button-wrapper' onClick={(event)=> {event.preventDefault(); event.stopPropagation(); navigate(page.addRoute || 'menu/profile/add'+index);}} >
                              <span className='add-button' ><p>+</p></span>
                            </section>}
                  </NavLink>
                )}
                
              </div> }

            <section id='profile-box' className={'page'} onClick={()=>setShowProfileMenu(true)}>    
              <ProfileImage className={'page-icon active-icon'} src={profileImage} defaultSrc={PROFILE_ICON_ACTIVE} defaultUser={true} />
              <ProfileImage className={'page-icon inactive-icon'} src={profileImage} defaultSrc={PROFILE_ICON} defaultUser={true} />
              <section id='profile-box-vertical' className={showMenu ? '' : 'hide'} >
                <h2 className={showMenu ? '' : 'hide'} >{displayName}</h2>
                <h5 className={showMenu ? '' : 'hide'} >{makeDisplayText(userRole)}</h5>
              </section>
            </section>            
          </div>
  
          <div id='app-content'>
               {/* Priority Order */}
                <Routes>
                  <Route path='/' element={ <Navigate to='/dashboard' /> }/>
                  <Route path='/dashboard/*' element={<Dashboard/>}/>
                  <Route path='/support/*' element={<SupportPage/>}/>
                  {isPageAccessible('/edit/content-archive') && <Route path='/edit/content-archive/:id/:action' element={<ContentArchivePage/>}/>}
                  {isPageAccessible('/edit/content-archive') && <Route path='/edit/content-archive/:id/*' element={<ContentArchivePage/>}/>}
                  <Route path='/edit/profile/new/*' element={<Navigate to='/signup' />}/>
                  {isPageAccessible('/edit/profile') && <Route path='/edit/profile/:id/:action' element={<UserEditPage/>}/>}
                  {isPageAccessible('/edit/profile') && <Route path='/edit/profile/:id/*' element={<UserEditPage/>}/>}
                  {isPageAccessible('/partnership/recent') && <Route path='/partnership/recent' element={<PartnershipPage view={PARTNERSHIP_VIEW.NEW_USERS} />}/>}
                  {isPageAccessible('/partnership/fewer') && <Route path='/partnership/fewer' element={<PartnershipPage view={PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS} />}/>}
                  {isPageAccessible('/partnership/pending') && <Route path='/partnership/pending' element={<PartnershipPage view={PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS} />}/>}
                  {isPageAccessible('/edit/circle') && <Route path='/edit/circle/:id/:action' element={<CircleEditPage/>}/>}
                  {isPageAccessible('/edit/circle') && <Route path='/edit/circle/:id/*' element={<CircleEditPage/>}/>}
                  {isPageAccessible('/edit/prayer-request') && <Route path='/edit/prayer-request/:id/:action' element={<PrayerRequestEditPage/>}/>}
                  {isPageAccessible('/edit/prayer-request') && <Route path='/edit/prayer-request/:id/*' element={<PrayerRequestEditPage/>}/>}
                  {isPageAccessible('/chat/direct') && <Route path='/chat/direct/*' element={<DirectChat/>}/>}
                  {isPageAccessible('/chat/circle') && <Route path='/chat/circle/*' element={<CircleChat/>}/>}
                  {isPageAccessible('/logs') && <Route path='/logs/*' element={<Log/>}/>}
                  <Route path='*' element={<PageNotFound primaryButtonText={'Return to Dashboard'} onPrimaryButtonClick={()=>navigate('/portal/dashboard')} />} />
                </Routes>
            </div>
        </div>
    );
  }

  export default AppContent;
  

  const matchMenuRouteToPath = (menuRoute:string|undefined, path:string|undefined):boolean => {
    if(menuRoute === undefined || path === undefined) return false;
    
    if(menuRoute === path) return true;

    const cleanRoute:string = menuRoute.replace(/^\/*(portal\/)?/, '').replace(/\/\-?\d+.*$/, ''); //leading slash and following numbers
    const cleanPath:string = path.replace(/^\/*(portal\/)?/, '').replace(/\/\:+.*$/, '');
    
    return (cleanPath.length > 3) && cleanRoute.includes(cleanPath);
  }
  