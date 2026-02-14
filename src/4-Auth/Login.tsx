import axios from 'axios';
import React, { ReactElement, forwardRef, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LOGIN_PROFILE_FIELDS, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { LoginResponseBody } from '../0-Assets/field-sync/api-type-sync/auth-types';
import { ImageDefaultEnum, ImageWidget } from '../2-Widgets/ImageWidgets';

import '../2-Widgets/Form/form.scss';
import '../11-Models/user.scss';


const Login = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const [inputMap, setInputMap] = useState<Map<string, string>>(new Map());


    /*******************************************
     *          SEND REQUEST TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeLoginRequest = async(resultMap:Map<string,string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/login`, assembleRequestBody(LOGIN_PROFILE_FIELDS, resultMap))
            .then((response:{ data:LoginResponseBody }) => {
                const account:AccountState = {
                    jwt: response.data.jwt,
                    userID: response.data.userID,
                    userRole: RoleEnum[response.data.userRole],
                    userProfile: response.data.userProfile,
                };
                //Save to Redux for current session
                dispatch(setAccount(account));

                notify(`Welcome ${account.userProfile.firstName}`, ToastStyle.SUCCESS);
                const redirect = new URLSearchParams(location.search).get('redirect');
                navigate((redirect && redirect.startsWith('/portal')) ? redirect : '/portal/dashboard/animation');

            }).catch((error) => {
                if(error.response?.status === 403) navigate(`/email-verify?email=${encodeURIComponent(getInputField('email') ?? '')}`);
                processAJAXError(error);}
            );

    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='login-page' className='public-floating-popup-page center-absolute-wrapper'>
            <div id='popup-wrapper' className='form-page-block center-absolute-inside' >
                <div id='logo-box' >
                    <ImageWidget defaultImage={ImageDefaultEnum.LOGO} />
                    <h1>Encouraging Prayer</h1>
                </div>

                <FormInput
                    key={'Login'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={false}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={LOGIN_PROFILE_FIELDS}
                    onSubmitText='Login'              
                    onSubmitCallback={makeLoginRequest}
                    alternativeButtonList={[
                        {text:'Forgot password?',onClick:() => navigate(getInputField('email') ? `/password-forgot?email=${encodeURIComponent(getInputField('email') ?? '')}` : '/password-forgot')},
                        { text:'Need an account?', onClick:() => navigate('/signup') },
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
export default Login;
