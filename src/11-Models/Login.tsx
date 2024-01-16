import axios from 'axios';
import React, { ReactElement, forwardRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CredentialProfile } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { LOGIN_PROFILE_FIELDS } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';

import '../2-Widgets/Form/form.scss';
import './user.scss';

//Assets
import LOGO from '../0-Assets/logo.png';


const Login = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [inputMap, setInputMap] = useState<Map<string, string>>(new Map());


    /************************************************** //TODO Remove for Production
     *  [TEMPORARY] Credentials fetched for Debugging
     * ************************************************/
    const [credentialList, setCredentialList] = useState<CredentialProfile[]>([]);

    //componentDidMount
    useEffect(() => {
        axios.get(`${process.env.REACT_APP_DOMAIN}/login/credentials`)
            .then(response => setCredentialList(response.data))
            .catch((error) => processAJAXError(error));
    }, []);

    const onCredentialSelect = (e:any) => {
        if(e)
            e.preventDefault();
        const user:CredentialProfile = credentialList[e.target.value];

        console.info('Attempting to Login in:', user);
        makeLoginRequest(new Map([['email', user.email], ['password', user.passwordHash]]));        
    }

    /*******************************************
     *          SEND REQUEST TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeLoginRequest = async(result?:Map<string,string>) => {
        const finalMap = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody = {};
        //@ts-ignore
        finalMap.forEach((value, field) => {requestBody[field] = value});

        await axios.post(`${process.env.REACT_APP_DOMAIN}/login`, requestBody)
            .then(response => {
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
                navigate('/portal/dashboard');

            }).catch((error) => processAJAXError(error));
    }   

    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='login-page' className='center-absolute-wrapper'>
            <div id='popup-wrapper' className='form-page-block center-absolute-inside' >
                <div id='logo-box' >
                    <img src={LOGO} alt='log-title'/>
                    <h1>Encouraging Prayer</h1>
                </div>

                <form id='credentialSelectWrapper' >
                    <div className='inputWrapper'>
                        <label htmlFor='credentialSelect'>Debug User</label>
                        <select name='credentialSelect' onChange={onCredentialSelect} defaultValue='default'>
                        <option value='default' disabled hidden>Login as:</option>
                            {credentialList.length > 0 && credentialList.map((user,i)=>
                                <option key={`${i}-${user.userID}`} value={i}>{user.userID} | {user.displayName} | {user.userRole}</option>
                            )}
                        </select>
                    </div>
                </form>

                <hr/>

                <FormInput
                    key={'Login'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={false}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={LOGIN_PROFILE_FIELDS}
                    onSubmitText='Login'              
                    onSubmitCallback={makeLoginRequest}
                    onAlternativeText='Need an account?'
                    onAlternativeCallback={()=>navigate('/signup')}
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
