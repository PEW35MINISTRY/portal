

import axios from 'axios';
import React, { ReactElement, forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { useAppSelector, processAJAXError } from '../1-Utilities/hooks';

import './support.scss';

//Assets
import LOGO from '../0-Assets/logo.png';
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';


//TODO Make dynamic once email system is implemented & custom route
const SUPPORT_USER_ID:number = 1;
const SUPPORT_EMAIL:string = 'ethanjohnsrud@gmail.com';
const SUPPORT_MESSAGE:string = `Hello, I'm Ethan Johnsrud; Lead Developer on the Encouraging Prayer project.  We're so excited the system is ready for you to start interacting.  However, there are sure to bugs along the way.  I'm asking for your help in squashing out the bugs to achieve the best result for our final end users!`;

const SupportPage = () => {
    const navigate = useNavigate();
    const jwt:string = useAppSelector((state) => state.account.jwt) || '';
    const [supportProfile, setSupportProfile] = useState<ProfileListItem>();

    /******************************************
    * Fetch public profile of support contact *
    *******************************************/
    useLayoutEffect(() => {
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${SUPPORT_USER_ID}/public`, {headers: { jwt: jwt }})
            .then(response => { 
                setSupportProfile({userID: response.data.userID, displayName: response.data.displayName, firstName: response.data.firstName, image: response.data.image});
            })
            .catch((error) => processAJAXError(error))
    }, [jwt]);

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='contact-page' >
            <h1 >ENCOURAGING PRAYER</h1>
            <img className='logo-image' src={LOGO} alt='Logo-Image' />

            <div className='profile-box'>
                <img className='profile-image' src={supportProfile?.image || PROFILE_DEFAULT} alt='Profile-Image' onError={(e)=>e.currentTarget.src = PROFILE_DEFAULT} />
                <h2 >{supportProfile?.firstName || 'SUPPORT'}</h2>
                <label className='title id-left'>{supportProfile?.displayName}</label>
            </div>

            <p>{SUPPORT_MESSAGE}</p>

            <h4>Here's a few things to watch out:</h4>
            <ul>
                <li>Button doesn't appear to work</li>
                <li>Text displays weird or uneven</li>
                <li>Incorrect validation or warning errors</li>
                <li>Suggestions in spacing and layout</li>
            </ul>

            <hr/>

            <h3>Please reach out with even the smallest issue:</h3>
            <a href="mailto:recipient@example.com">{SUPPORT_EMAIL}</a>

        </div>
    );
}

export default SupportPage;
