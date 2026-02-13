import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { EMAIL_VERIFY_PROFILE_FIELDS, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { LoginResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types';

import '../2-Widgets/Form/form.scss';
import '../11-Models/user.scss';


const EmailVerify = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const [inputMap, setInputMap] = useState<Map<string, string>>(new Map());


    /* Optionally Initialize from URL Parameters */
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const email:string|null = query.get('email');

        if(email !== null && email !== 'undefined' && email !== 'null') setInputField('email', email);

        //Clean URL for security
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }, []);


    /* Make Request and Redirect */
    const makeEmailVerifyRequest = async(resultMap:Map<string,string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/email-verify`, assembleRequestBody(EMAIL_VERIFY_PROFILE_FIELDS, resultMap))
            .then((response:{ data:LoginResponseBody }) => {
                const account:AccountState = {
                    jwt: response.data.jwt,
                    userID: response.data.userID,
                    userRole: RoleEnum[response.data.userRole],
                    userProfile: response.data.userProfile,
                };
                //Save to Redux for current session
                dispatch(setAccount(account));

                notify(`Email Verified`, ToastStyle.SUCCESS);
                navigate('/signup/initial-account-flow');

            }).catch((error) => processAJAXError(error));


    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));


    /*************************************************
     *      RENDER DISPLAY                           *  
     * Public URL, redirected from email button link *
     * Token, Email, New Password, Verify Password   *
     * ***********************************************/
    return (
        <div id='email-verify-page' className='public-floating-popup-page center-absolute-wrapper'>
            <div id='popup-wrapper' className='form-page-block center-absolute-inside' >
                <div id='logo-box' >
                    <h1>Verify Email</h1>
                </div>

                <FormInput
                    key={'Email-Verify'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={false}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={EMAIL_VERIFY_PROFILE_FIELDS}
                    onSubmitText='Verify'              
                    onSubmitCallback={makeEmailVerifyRequest}
                    alternativeButtonList={[{ text:'Return to Login', onClick:() => navigate('/login') }]}
                    headerChildren={[
                        <p id='email-verify-message'>Please check your email for a token:</p>
                    ]}
                />
                
            </div>

            {/* Swoop Background */}
            <div id='shape-rectangle'></div>
            <div id='shape-curve'>
                <svg viewBox='0 0 500 150' preserveAspectRatio='none'>
                    <path d='M-2.49,14.31 C274.02,-18.24 292.64,224.51 507.09,115.96 L500.00,0.00 L0.00,0.00 Z'></path>
                </svg>
            </div>
        </div>
    );
}
export default EmailVerify;
