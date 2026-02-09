import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { PASSWORD_RESET_PROFILE_FIELDS, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { LoginResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types';

import '../2-Widgets/Form/form.scss';
import '../11-Models/user.scss';


/* Email Linked Button & Execute Password Reset | First Step -> PasswordForgotPage.tsx */
const PasswordReset = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const [inputMap, setInputMap] = useState<Map<string, string>>(new Map());

    /* Optionally Initialize from URL Parameters */
    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const email:string|null = query.get('email');
        const token:string|null = query.get('token');

        if(email !== null && email !== 'undefined' && email !== 'null') setInputField('email', email);
        if(token !== null && token !== 'undefined' && token !== 'null') setInputField('token', token);

        //Clean URL for security
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }, []);


    /* Make Request and Redirect */
    const makeResetPasswordRequest = async(resultMap:Map<string,string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/password-reset`, assembleRequestBody(PASSWORD_RESET_PROFILE_FIELDS, resultMap))
            .then((response:{ data:LoginResponseBody }) => {
                const account:AccountState = {
                    jwt: response.data.jwt,
                    userID: response.data.userID,
                    userRole: RoleEnum[response.data.userRole],
                    userProfile: response.data.userProfile,
                };
                //Save to Redux for current session
                dispatch(setAccount(account));

                notify(`Password Reset Successful`, ToastStyle.SUCCESS);
                navigate('/portal/dashboard/animation');

            }).catch((error) => processAJAXError(error));

    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));

    /*************************************************
     *      RENDER DISPLAY                           *  
     * Public URL, redirected from email button link *
     * Token, Email, New Password, Verify Password   *
     * ***********************************************/
    return (
        <div id='password-reset-page' className='public-floating-popup-page center-absolute-wrapper'>
            <div id='popup-wrapper' className='form-page-block center-absolute-inside' >
                <div id='logo-box' >
                    <h1>Reset Password</h1>
                </div>

                <FormInput
                    key={'Password-Reset'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={false}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={PASSWORD_RESET_PROFILE_FIELDS}
                    onSubmitText='Reset'              
                    onSubmitCallback={makeResetPasswordRequest}
                    alternativeButtonList={[{ text:'Return to Login', onClick:() => navigate('/login') }]}
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
export default PasswordReset;
