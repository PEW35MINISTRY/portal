import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef, ReactElement} from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccount, AccountState } from '../redux-store';
import { useAppDispatch, processAJAXError, notify } from '../hooks';
import { ToastStyle } from '../app-types';
import { CredentialProfile } from './profile-types';
import { LOGIN_PROFILE_FIELDS } from './Fields-Sync/profile-field-config';
import FormProfile from './FormProfile';
import './form.scss'; 


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

        console.info("Attempting to Login in:", user);
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
        <div id='login-profile'  className='form-page'>
            <h2>Login</h2>

            <form id='credentialSelectWrapper' >
                <div className='inputWrapper'>
                    <label htmlFor='credentialSelect'>Debug User</label>
                    <select name="credentialSelect" onChange={onCredentialSelect} defaultValue='default'>
                    <option value="default" disabled hidden>Login as:</option>
                        {credentialList.length > 0 && credentialList.map((user,i)=>
                            <option key={`${i}-${user.userID}`} value={i}>{user.userID} | {user.displayName} | {user.userRole}</option>
                        )}
                    </select>
                </div>
            </form>

            <hr/>

            <FormProfile
                key={'Login'}
                validateUniqueFields={false}
                getInputField={getInputField}
                setInputField={setInputField}
                PROFILE_FIELDS={LOGIN_PROFILE_FIELDS}
                onSubmitText='Login'              
                onSubmitCallback={makeLoginRequest}
                onAlternativeText='Create Account'
                onAlternativeCallback={()=>navigate('/signup')}
            />
            
        </div>
    );
}
export default Login;
