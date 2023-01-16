import axios from 'axios';
import { stringify } from 'querystring';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 
import validateInput, {ProfileType, convertDate, convertHour, getAvailableUserRoles, testEmailExists, REQUIRED_FIELDS } from './validateProfile';



const Signup = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [availableUserRoles, setAvailableUserRoles] = useState<string[]>(['STUDENT']); 

    const [input, setInput] = useState<ProfileType>({
        ['userRole']: 'STUDENT',
        ['dailyNotificationHour']: "09:00",
    });
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [validation, setValidation] = useState<any>({});

    //Trigger
    useEffect(() => {getAvailableUserRoles().then(result => setAvailableUserRoles(result));},[]);
    useEffect(() => {setInput({...input, 'displayName': input.firstName})}, [input.firstName]);
    useEffect(() => {if(statusMessage.length > 0) setTimeout(() => setStatusMessage(""), 5000);},[statusMessage]);

    const onSubmit = async(e:any) => {
        if(e)
            e.preventDefault();

        //Rerun all Validations 
        const validationSet:Set<string> = new Set(REQUIRED_FIELDS);
        Object.keys(validation).forEach(field => validationSet.add(field));
        Object.keys(input).forEach(field => validationSet.add(field));

        //@ts-ignore
        const finalValidations = await [...validationSet].reduce(async (result, fieldName) => await validateInput(fieldName, input[fieldName] || '', input, await result), validation);

        if(Object.keys(finalValidations).length  > 0) {
            setStatusMessage("Please fix all validation before creating a new account.")
            return;
        } else 
        if(input.email && await testEmailExists(input.email)) {
            setStatusMessage("Account already exists with this email, please login.");
            navigate(`/login?email=${input.email}`);
            return;
        }

        axios.post(`${process.env.REACT_APP_DOMAIN}/signup`, {
            ...input,
            dob: convertDate(input.dob || '').getTime(),
            dailyNotificationHour: convertHour(input.dailyNotificationHour || ''),
        })
        .then(response => { //AUTO LOGIN
            dispatch({
                type: 'login',
                payload: {
                    JWT: response.data.JWT,
                    userId: response.data.userId,
                    userProfile: response.data.userProfile,
                }
            });
            setInput({});
            navigate('/dashboard');
            setStatusMessage('Welcome to Encouraging Prayer!');

        }).catch(error => {setStatusMessage('Failed to create new user account'); console.error('Failed to create new user account', error);});
    }


    const onInput = async (event:any) => {
        const {name, value} = event?.target;
        setInput({...input, [name]: value});
        console.log(name, value, {...input, [name]: value});
        
        setValidation(await validateInput(name, value, input, validation));
    }


    return (
        <div id='signup' className='form-page'>
            <h2>Create Account</h2>
            <form  onSubmit={onSubmit}>
                {(statusMessage.length > 0) && <h4>{statusMessage}</h4>}
                {(statusMessage.length > 0) && <button type='submit' onClick={()=>navigate('/dashboard')}>Return to Dashboard</button>}
                {(statusMessage.length > 0) && <hr/>}

                <label htmlFor='displayName'>Username</label>
                <input name='displayName' type='text' onChange={onInput}  value={input.displayName || ''}/>
                {validation?.displayName && <p className='error' >{validation.displayName}</p>}
                
                <label htmlFor='email'>Email Address</label>
                <input name='email' type='email' onChange={onInput}  value={input.email || ''}/>

                <label htmlFor='emailVerify'>Confirm Email Address</label>
                <input name='emailVerify' type='email' onChange={onInput}  value={input.emailVerify || ''}/>
                {validation?.email && <p className='error' >{validation.email}</p>}

                <label htmlFor='password'>Password</label>
                <input name='password' type='password' onChange={onInput}  value={input.password || ''}/>

                <label htmlFor='passwordVerify'>Confirm Password</label>
                <input name='passwordVerify' type='password' onChange={onInput}  value={input.passwordVerify || ''}/>
                {validation?.password && <p className='error' >{validation.password}</p>}

                <hr/>

                <label htmlFor='userRole'>Account Type</label>
                <select name="userRole" onChange={onInput}  value={input.userRole || ''}>
                    {availableUserRoles?.map((role,i)=>
                        <option key={`${i}-${role}`} value={role}>{role}</option>
                    )}
                </select>
                {validation?.userRole && <p className='error' >{validation.userRole}</p>}

                {input.userRole != 'STUDENT' && <label htmlFor='token'>New Account Token</label>}
                {input.userRole != 'STUDENT' && <input name='token' type='text' onChange={onInput}  value={input.token || ''}/>}
                {validation?.token && <p className='error' >{validation.token}</p>}

                <label htmlFor='firstName'>First Name</label>
                <input name='firstName' type='text' onChange={onInput}  value={input.firstName || ''}/>
                {validation?.firstName && <p className='error' >{validation.firstName}</p>}
            
                <label htmlFor='lastName'>Last Name</label>
                <input name='lastName' type='text' onChange={onInput}  value={input.lastName || ''}/>
                {validation?.lastName && <p className='error' >{validation.lastName}</p>}
            
                <label htmlFor='phone'>Phone Number</label>
                <input name="phone" type="tel" onChange={onInput}  value={input.phone || ''} pattern="[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}" placeholder='1-555-555-5555'/>
                {validation?.phone && <p className='error' >{validation.phone}</p>}
            
                <label htmlFor='zipcode'>Zipcode</label>
                <input name='zipcode' type='text' onChange={onInput}  value={input.zipcode || ''}/>
                {validation?.zipcode && <p className='error' >{validation.zipcode}</p>}
                {/* TODO: Zipcode Auto Search City  */}

                <label htmlFor='dob'>Date of Birth</label>
                <input name='dob' type='date' onChange={onInput}  value={input.dob || ''}/>
                {validation?.dob && <p className='error' >{validation.dob}</p>}

                <label htmlFor='gender'>Gender</label>
                <select name="gender" onChange={onInput}  value={input.gender} defaultValue='default'>
                    <option key={`default`} value="default" disabled hidden>Select Gender:</option>
                    <option key={`1-male`} value='MALE'>Male</option>
                    <option key={`2-female`} value='FEMALE'>Female</option>
                </select>
                {validation?.gender && <p className='error' >{validation.gender}</p>}

                <hr/>

                <label htmlFor='dailyNotificationHour'>Daily Reminder</label>
                <input name='dailyNotificationHour' type='time' step='3600' onChange={onInput} value={input.dailyNotificationHour || ''}/>
                {validation?.dailyNotificationHour && <p className='error' >{validation.dailyNotificationHour}</p>}

                {/* TODO: Image Upload and POST */}
                {/* <label htmlFor='profileImage'>Profile Image</label>
                <input name='profileImage' type='image' onChange={onInput}  value={input.image || ''}/> */}

                <button type='submit' onClick={onSubmit}>Create Account</button>

            </form>
        </div>
    );
}

export default Signup;

