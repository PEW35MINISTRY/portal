import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef, FormEventHandler, ReactElement} from 'react';
import { useNavigate  } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 
import {ProfileType, getAvailableUserRoles } from './validateProfile';
import { serverErrorResponse } from '../app-types';


const FormProfile = ({...props}:{onInput:FormEventHandler, getInput:Function, validation:ProfileType, headerChildren?:ReactElement, footerChildren:ReactElement}) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);

    const [availableUserRoles, setAvailableUserRoles] = useState<string[]>([]); 
    const [accessFields, setAccessFields] = useState<string[]>([]);

//onRender
    useEffect(() => {      
        getAvailableUserRoles()
            .then(result => setAvailableUserRoles(result));
    
        axios.get(`${process.env.REACT_APP_DOMAIN}/resources/profile-edit-list`,{
            headers: {
                ['user-id']: userId,
                jwt: JWT,
                userRole: userRole
            }})
            .then(response => setAccessFields(response.data || []))
            .catch((res) => { 
                dispatch({type: "notify", payload: {response: res}});
            });
            },[]);           

    const access = (field:string):boolean => accessFields.includes(field);

    return (
        <form>
            {props.headerChildren}

            {access('userRole') && <label htmlFor='userRole'>Account Type</label>}
            {access('userRole') && <select name="userRole" onChange={props.onInput}  value={props.getInput('userRole')}>
                    {availableUserRoles?.map((role,i)=>
                        <option key={`${i}-${role}`} value={role}>{role}</option>
                    )}
                </select>}
            {props.validation?.userRole && <p className='error' >{props.validation.userRole}</p>}

            {props.getInput('userRole') != 'STUDENT' && <label htmlFor='token'>New Account Token</label>}
            {props.getInput('userRole') != 'STUDENT' && <input name='token' type='text' onChange={props.onInput}  value={props.getInput('token')}/>}
            {props.validation?.token && <p className='error' >{props.validation.token}</p>}
            
            {/* {access('verified') && <label htmlFor='verified'>Account Verified</label>}
            {access('verified') && <input name='verified' type='checkbox' onChange={onBooleanInput}  checked={props.getInput('verified}/>}
            {props.validation?.verified && <p className='error' >{props.validation.verified}</p>} */}

            {access('displayName') && <label htmlFor='displayName'>Public Name</label>}
            {access('displayName') && <input name='displayName' type='text' onChange={props.onInput}  value={props.getInput('displayName')}/>}
            {props.validation?.displayName && <p className='error' >{props.validation.displayName}</p>}

            {access('email') && <label htmlFor='email'>Email Address</label>}
            {access('email') && <input name='email' type='email' onChange={props.onInput}  value={props.getInput('email')}/>}

            {access('email') && <label htmlFor='emailVerify'>Confirm Email Address</label>}
            {access('email') && <input name='emailVerify' type='email' onChange={props.onInput}  value={props.getInput('emailVerify')}/>}
            {props.validation?.email && <p className='error' >{props.validation.email}</p>}

            {access('password') && <label htmlFor='password'>Password</label>}
            {access('password') && <input name='password' type='password' onChange={props.onInput}  value={props.getInput('password')}/>}

            {access('password') && <label htmlFor='passwordVerify'>Confirm Password</label>}
            {access('password') && <input name='passwordVerify' type='password' onChange={props.onInput}  value={props.getInput('passwordVerify')}/>}
            {props.validation?.password && <p className='error' >{props.validation.password}</p>}

            {access('firstName') && <label htmlFor='firstName'>First Name</label>}
            {access('firstName') && <input name='firstName' type='text' onChange={props.onInput}  value={props.getInput('firstName')}/>}
            {props.validation?.firstName && <p className='error' >{props.validation.firstName}</p>}
            
            {access('lastName') && <label htmlFor='lastName'>Last Name</label>}
            {access('lastName') && <input name='lastName' type='text' onChange={props.onInput}  value={props.getInput('lastName')}/>}
            {props.validation?.lastName && <p className='error' >{props.validation.lastName}</p>}
            
            {access('phone') && <label htmlFor='phone'>Phone Number</label>}
            {access('phone') && <input name="phone" type="tel" onChange={props.onInput}  value={props.getInput('phone')} pattern="[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}" placeholder='1-555-555-5555'/>}
            {props.validation?.phone && <p className='error' >{props.validation.phone}</p>}
            
            {access('dob') && <label htmlFor='dob'>Date of Birth</label>}
            {access('dob') && <input name='dob' type='date' onChange={props.onInput}  value={props.getInput('dob')}/>}
            {props.validation?.dob && <p className='error' >{props.validation.dob}</p>}

            {access('gender') && <label htmlFor='gender'>Gender</label>}
            {access('gender') && <select name="gender" onChange={props.onInput}  value={props.getInput('gender').length ? props.getInput('gender') : undefined } defaultValue='default'>
                    <option key={`default`} value="default" disabled hidden>Select</option>
                    <option key={`1-male`} value='MALE'>Male</option>
                    <option key={`2-female`} value='FEMALE'>Female</option>
                </select>}
            {props.validation?.gender && <p className='error' >{props.validation.gender}</p>}

            {access('zipcode') && <label htmlFor='zipcode'>Zipcode</label>}
            {access('zipcode') && <input name='zipcode' type='text' onChange={props.onInput}  value={props.getInput('zipcode')}/>}
            {props.validation?.zipcode && <p className='error' >{props.validation.zipcode}</p>}
            {/* TODO: Zipcode Auto Search City  */}

            {access('dailyNotificationHour') && <label htmlFor='dailyNotificationHour'>Daily Reminder</label>}
            {access('dailyNotificationHour') && <input name='dailyNotificationHour' type='time' step='3600' onChange={props.onInput} value={props.getInput('dailyNotificationHour')}/>}
            {props.validation?.dailyNotificationHour && <p className='error' >{props.validation.dailyNotificationHour}</p>}

            {/* TODO: Image Upload and POST */}
            {/* <label htmlFor='profileImage'>Profile Image</label>
            <input name='profileImage' type='image' onChange={props.onInput}  value={props.getInput('image')}/> */}

            {access('notes') && <label htmlFor='notes'>Profile Notes</label>}
            {access('notes') && <textarea name='notes' onChange={props.onInput} value={props.getInput('notes')}/>}
            {props.validation?.notes && <p className='error' >{props.validation.notes}</p>}

            {props.footerChildren}
        </form>
    );
}

export default FormProfile;
function dispatch(arg0: { type: string; payload: { message: string; status: number; log: serverErrorResponse; }; }) {
    throw new Error('Function not implemented.');
}

