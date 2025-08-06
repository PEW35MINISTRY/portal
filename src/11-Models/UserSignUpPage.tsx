import axios from 'axios';
import React, { ReactElement, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleEnum, SIGNUP_PROFILE_FIELDS } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { assembleRequestBody, getEnvironment, getHighestRole } from '../1-Utilities/utilities';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { AccountState, logoutAccount, setAccount } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import { ImageDefaultEnum, ImageWidget } from '../2-Widgets/ImageWidgets';

import '../2-Widgets/Form/form.scss';
import './user.scss';
import { ENVIRONMENT_TYPE } from '../0-Assets/field-sync/input-config-sync/inputField';


const SignUpPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.jwt);

    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [populateDemoProfile, setPopulateDemoProfile] = useState<boolean>(false); //USER Role Only

    //componentDidMount
    useEffect(() => { //Auto logout current User
        if(JWT.length > 0){
            dispatch(() => logoutAccount(dispatch, '/signup'));
        }
    },[]);

    /*******************************************
     *         SEND PROFILE TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeNewProfileRequest = async(resultMap:Map<string, string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/signup${(isUserRole && populateDemoProfile) ? '?populate=true' : ''}`, assembleRequestBody(resultMap))
            .then((response:{data:AccountState}) => { //AUTO LOGIN               
                const account:AccountState = {
                    jwt: response.data.jwt,
                    userID: response.data.userID,
                    userRole: response.data.userRole,
                    userProfile: response.data.userProfile,
                };
                //Save to Redux for current session
                dispatch(setAccount(account));

                notify(`Welcome ${account.userProfile.firstName}`, ToastStyle.SUCCESS);
                navigate(`/signup/initial-account-flow`);

            }).catch((error) => { processAJAXError(error); });

    const getInputField = (field:string):any|undefined => 
        (field === 'userRole') ? getHighestRole(Array.from((getInputField('userRoleTokenList') as Map<RoleEnum, string>)?.keys() || []))
        : inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));


    /* Local Utilities */
    const isUserRole:boolean = useMemo(() => ((getInputField('userRoleTokenList') === undefined) || new Map(getInputField('userRoleTokenList')).has(RoleEnum.USER)), [getInputField('userRoleTokenList')]);


    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='sign-up-page' className='center-absolute-wrapper' >

            <div id='popup-wrapper' className='form-page-block center-absolute-inside'>
                <div id='logo-box' >
                    <ImageWidget defaultImage={ImageDefaultEnum.LOGO} />
                    <h1>Encouraging Prayer</h1>
                </div>

                <FormInput
                    key={'SIGN-UP'}
                    getIDField={()=>({modelIDField: 'userID', modelID: -1})}
                    validateUniqueFields={true}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={SIGNUP_PROFILE_FIELDS}
                    onSubmitText='Create Account'              
                    onSubmitCallback={makeNewProfileRequest}
                    onAlternativeText='Already have an account?'
                    onAlternativeCallback={()=>navigate('/login')}
                    footerChildren={
                        (isUserRole && ([ENVIRONMENT_TYPE.DEVELOPMENT, ENVIRONMENT_TYPE.LOCAL].includes(getEnvironment()))) ? [
                            <div id='populateDemoProfile' key='populateDemoProfile' className='inputWrapper'>
                                <label htmlFor='populateDemoProfile'>Populate Demo Profile</label>
                                <input name='populateDemoProfile' type='checkbox' className='inputCheckbox' onChange={(e)=>setPopulateDemoProfile(e.target.checked)} />
                            </div>
                        ] : []}
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
