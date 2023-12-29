import axios from 'axios';
import React, { ReactElement, forwardRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileEditRequestBody, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { SIGNUP_PROFILE_FIELDS } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';

import '../2-Widgets/Form/form.scss';
import './user.scss';

//Assets
import LOGO from '../0-Assets/logo.png';


const SignUpPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.jwt);
    const profile:ProfileResponse = useAppSelector((state) => state.account.userProfile);

    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());

    //componentDidMount
    useEffect(() => {   
        //Auto logout current User
        if(JWT.length > 0){
            // notify(`${profile.firstName} Logged Out`, ToastStyle.WARN);
            // console.warn('REDUX Account & localStorage cleared: Signup -> resetAccount', profile);
            // dispatch(resetAccount());
            // window.localStorage.setItem('user', '');
        }
    },[]);

    /*******************************************
     *         SEND PROFILE TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeNewProfileRequest = async(result?:Map<string, string>) => {
        const finalMap = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:ProfileEditRequestBody = {} as ProfileEditRequestBody;
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        await axios.post(`${process.env.REACT_APP_DOMAIN}/signup`, requestBody)
            .then(response => { //AUTO LOGIN               
                const account:AccountState = {
                    jwt: response.data.jwt,
                    userID: response.data.userID,
                    userProfile: response.data.userProfile,
                };
                //Save to Redux for current session
                dispatch(setAccount(account));
                //Save to Cache for reauthenticate if JWT is still valid in redux-store.tsx
                window.localStorage.setItem('user', JSON.stringify(account));

                notify(`Welcome ${account.userProfile.firstName}`, ToastStyle.SUCCESS);
                navigate(`/portal/edit/profile/${response.data.userID}/image`);

            }).catch((error) => { processAJAXError(error); });
    }

    const getInputField = (field:string):any|undefined => inputMap.get(field);
    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='sign-up-page' className='center-absolute-wrapper' >

            <div id='popup-wrapper' className='form-page-block center-absolute-inside'>
                <div id='logo-box' >
                    <img src={LOGO} alt='log-title'/>
                    <h1>Encouraging Prayer</h1>
                </div>

                <FormInput
                    key={'SIGN-UP'}
                    validateUniqueFields={true}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={SIGNUP_PROFILE_FIELDS}
                    onSubmitText='Create Account'              
                    onSubmitCallback={makeNewProfileRequest}
                    onAlternativeText='Already have an account?'
                    onAlternativeCallback={()=>navigate('/login')}
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

export default SignUpPage;
