import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef, ReactElement} from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountState, resetAccount, setAccount } from '../redux-store';
import { useAppSelector, useAppDispatch, notify, processAJAXError } from '../hooks';
import { ToastStyle } from '../app-types';
import { SIGNUP_PROFILE_FIELDS } from './Fields-Sync/profile-field-config';
import FormProfile from './FormProfile';
import './form.scss'; 
import { ProfileResponse } from './profile-types';


const Signup = () => {
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
        const requestBody = {};
        finalMap.forEach((value, field) => {
            if(field === 'userRoleTokenList') { //@ts-ignore
                requestBody[field] = Array.from((finalMap.get('userRoleTokenList') as Map<string,string>).entries())
                                        .map(([role, token]) => ({role: role, token: token || ''}));
            } else //@ts-ignore
                requestBody[field] = value;
        });

        axios.post(`${process.env.REACT_APP_DOMAIN}/signup`, requestBody)
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
                navigate('/portal/dashboard');

            }).catch((error) => { processAJAXError(error); });
    }

    const getInputField = (field:string):any|undefined => inputMap.get(field);
    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='signup' className='form-page'>
            <h2>Create Account</h2>

            <FormProfile
                key={'SIGN-UP'}
                validateUniqueFields={true}
                getInputField={getInputField}
                setInputField={setInputField}
                PROFILE_FIELDS={SIGNUP_PROFILE_FIELDS}
                onSubmitText='Create Account'              
                onSubmitCallback={makeNewProfileRequest}
                onAlternativeText='Already have an account?'
                onAlternativeCallback={()=>navigate('/login')}
            />
        </div>
    );
}

export default Signup;
