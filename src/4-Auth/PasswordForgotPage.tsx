import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { PASSWORD_RESET_PROFILE_FIELDS } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import FormInput from '../2-Widgets/Form/FormInput';
import { assembleRequestBody } from '../1-Utilities/utilities';

import '../2-Widgets/Form/form.scss';
import '../11-Models/user.scss';


/* Initialize Forgot Password Flow, buy triggering email with token | Next -> PasswordResetPage.tsx */
const PasswordForgot = () => {
    const navigate = useNavigate();
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
    const makeForgotPasswordRequest = async(resultMap:Map<string,string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/password-forgot`, assembleRequestBody(PASSWORD_RESET_PROFILE_FIELDS, resultMap))
            .then((response) => {
                notify(`Email Sent`, ToastStyle.SUCCESS); //Always returns success
                navigate(getInputField('email') ? `/password-reset?email=${encodeURIComponent(getInputField('email') ?? '')}` : '/password-reset');

            }).catch((error) => processAJAXError(error));

    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));

    /*************************************
     * RENDER DISPLAY | Email Only Field *  
     * ***********************************/
    return (
        <div id='password-reset-page' className='public-floating-popup-page center-absolute-wrapper'>
            <div id='popup-wrapper' className='form-page-block center-absolute-inside' >
                <div id='logo-box' >
                    <h1>Forgot Password</h1>
                </div>

                <FormInput
                    key={'Password-Forgot'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={false}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={PASSWORD_RESET_PROFILE_FIELDS.filter(field => field.field == 'email')}
                    onSubmitText='Send Email'              
                    onSubmitCallback={makeForgotPasswordRequest}
                    alternativeButtonList={[
                        {text:'Enter Token', onClick:() => navigate(getInputField('email') ? `/password-reset?email=${encodeURIComponent(getInputField('email') ?? '')}` : '/password-reset')},
                        { text:'Return to Login', onClick:() => navigate('/portal/dashboard')}
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
export default PasswordForgot;
