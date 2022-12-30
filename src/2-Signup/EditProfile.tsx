import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './signup.scss'; 
import validateInput, { convertDate, convertHour, getAvailableUserRoles } from './validateProfile';


type Profile = {
    email?: string,
    emailVerify?: string,
    password?: string,
    passwordVerify?: string,
    userRole?: string,
    displayName?: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
    zipcode?: string,
    dob?: string,
    gender?: string,
    dailyNotificationHour?: string,
    profileImage?: string,

    verified?: boolean,
    notes?: string

    // circleList?: string[],
    // partnerList?: string[]
}

const AccountNames:string[] = [
    'email',
    'password',
    'userRole',
    'displayName',
    'firstName',
    'lastName',
    'phone',
    'zipcode',
    'dob',
    'gender',
    'dailyNotificationHour'
];


const EditProfile = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);

    const [input, setInput] = useState<Profile>({
        ['userRole']: 'STUDENT',
        ['gender']: 'MALE',
        ['dailyNotificationHour']: "09:00",
    });
    const [validation, setValidation] = useState<any>({});
    const [availableUserRoles, setAvailableUserRoles] = useState<string[]>([]); 

    useEffect(() => {
        getAvailableUserRoles()
            .then(result => setAvailableUserRoles(result));
    
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/profile/${userId}`)
            .then(response => setInput(response.data))
            .catch(error => {console.log('AXIOS Fetch User Roles Failed:', error); });
        
    },[]);


    const onSubmit = (e:any) => {
        if(e)
            e.preventDefault();

        //@ts-ignore
        if(AccountNames.reduce((result, fieldName) => (validateInput(fieldName, input[fieldName] || '', input, validation)[fieldName] || '').length + result, 0) != 0)
            return;

        axios.patch(`${process.env.REACT_APP_DOMAIN}/api/profile/${userId}`, {
            ...input,
            dob: convertDate(input.dob || '').getTime(),
            dailyNotificationHour: convertHour(input.dailyNotificationHour || ''),
        })
        .then(response => { //Saved Successfully
            setInput(response.data);

            console.log('AXIOS Profile Update Successfully', response.data);

        }).catch(error => console.log('AXIOS Profile Edit Error:', error));
    }


    const onInput = (event:any) => {
        const {name, value} = event?.target;
        setInput({...input, [name]: value});
        console.log(name, value, {...input, [name]: value});
        
        setValidation(validateInput(name, value, input, validation));
    }


    return (
        <div id='signup'>
            <h2>Edit Profile</h2>
            <form id='signup-form' onSubmit={onSubmit}>
                <h3>General Edits</h3>

                <label htmlFor='zipcode'>Zipcode</label>
                <input name='zipcode' type='text' onChange={onInput}  value={input.zipcode}/>
                {validation?.zipcode && <p className='error' >{validation.zipcode}</p>}
                {/* TODO: Zipcode Auto Search City  */}
                
                <label htmlFor='displayName'>Public Name</label>
                <input name='displayName' type='text' onChange={onInput}  value={input.displayName}/>
                {validation?.displayName && <p className='error' >{validation.displayName}</p>}


                <label htmlFor='dailyNotificationHour'>Daily Reminder</label>
                <input name='dailyNotificationHour' type='time' step='3600' onChange={onInput} value={input.dailyNotificationHour}/>
                {validation?.dailyNotificationHour && <p className='error' >{validation.dailyNotificationHour}</p>}

                <hr/>

                {/* {(userRole === 'ADMIN') && { */}
                    <h3>Admin Edits</h3>

                    {/* <label htmlFor='verified'>Account Verified</label>
                    <input name='verified' type='checkbox' onChange={onBooleanInput}  checked={input.verified}/>
                    {validation?.verified && <p className='error' >{validation.verified}</p>} */}

                    <label htmlFor='email'>Email address</label>
                    <input name='email' type='email' onChange={onInput}  value={input.email}/>

                    <label htmlFor='emailVerify'>Confirm Email Address</label>
                    <input name='emailVerify' type='email' onChange={onInput}  value={input.emailVerify}/>
                    {validation?.email && <p className='error' >{validation.email}</p>}

                    <label htmlFor='password'>Password</label>
                    <input name='password' type='password' onChange={onInput}  value={input.password}/>

                    <label htmlFor='passwordVerify'>Confirm Password</label>
                    <input name='passwordVerify' type='password' onChange={onInput}  value={input.passwordVerify}/>
                    {validation?.password && <p className='error' >{validation.password}</p>}


                    <label htmlFor='userRole'>Account Type</label>
                    <select name="userRole" onChange={onInput}  value={input.userRole}>
                        {availableUserRoles?.map((role,i)=>
                            <option key={`${i}-${role}`} value={role}>{role}</option>
                        )}
                    </select>
                    {validation?.userRole && <p className='error' >{validation.userRole}</p>}

                    <label htmlFor='firstName'>First Name</label>
                    <input name='firstName' type='text' onChange={onInput}  value={input.firstName}/>
                    {validation?.firstName && <p className='error' >{validation.firstName}</p>}
                
                    <label htmlFor='lastName'>Last Name</label>
                    <input name='lastName' type='text' onChange={onInput}  value={input.lastName}/>
                    {validation?.lastName && <p className='error' >{validation.lastName}</p>}
                
                    <label htmlFor='phone'>Phone Number</label>
                    <input name="phone" type="tel" onChange={onInput}  value={input.phone} pattern="[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}" placeholder='1-555-555-5555'/>
                    {validation?.phone && <p className='error' >{validation.phone}</p>}
                
                    
                    <label htmlFor='dob'>Date of Birth</label>
                    <input name='dob' type='date' onChange={onInput}  value={input.dob}/>
                    {validation?.dob && <p className='error' >{validation.dob}</p>}

                    <label htmlFor='gender'>Gender</label>
                    <select name="gender" onChange={onInput}  value={input.gender}>
                        <option key={`1-male`} value='MALE'>Male</option>
                        <option key={`2-female`} value='FEMALE'>Female</option>
                    </select>
                    {validation?.gender && <p className='error' >{validation.gender}</p>}

                    <hr/>

                    {/* TODO: Image Upload and POST */}
                    {/* <label htmlFor='profileImage'>Profile Image</label>
                    <input name='profileImage' type='image' onChange={onInput}  value={input.image}/> */}

                    <label htmlFor='notes'>Profile Notes</label>
                    <textarea name='notes' onChange={onInput} value={input.notes}/>
                    {validation?.notes && <p className='error' >{validation.notes}</p>}

                {/* } */}
                {/* } */}

                <button type='submit' onClick={onSubmit}>Save Profile</button>

            </form>
        </div>
    );
}

export default EditProfile;
