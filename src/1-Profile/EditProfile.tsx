import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams  } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 
import validateInput, {ProfileType, convertDate, convertHour, getAvailableUserRoles } from './validateProfile';

type AccessProfile = { 
    user_id: number,
    display_name: string,
    user_role: string
}

const EditProfile = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);
    const { id = -1 } = useParams();
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);

    const isAdmin = () => userRole === "ADMIN";

    const [input, setInput] = useState<ProfileType>({});
    const [original, setOriginal] = useState<ProfileType>({});
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [validation, setValidation] = useState<any>({});
    const [availableUserRoles, setAvailableUserRoles] = useState<string[]>([]); 
    const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
    const [editingUserId, setEditingUserId] = useState<number>(-1);

    //Triggers
    useEffect(() => {if(id > 0) setEditingUserId(parseInt(id.toString()));}, [id]);
    // useEffect(() => {if(statusMessage.length > 0) setTimeout(() => setStatusMessage(""), 5000);},[statusMessage]);

    useEffect(() => {
        getAvailableUserRoles()
            .then(result => setAvailableUserRoles(result));
        
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/access`,{
            headers: {
                ['user-id']: userId,
                jwt: JWT
            }})
            .then(response => setAccessProfiles(response.data))
            .catch(error => {
                console.error('Failed to fetch all user credentials', error);});
            },[]);
            

    useEffect(() => { if(editingUserId > 0) fetchProfile(editingUserId);}, [editingUserId]);

    const fetchProfile = (fetchUserId:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${fetchUserId}`,{
        headers: {
            ['user-id']: userId,
            jwt: JWT
        }})
        .then(response => {setOriginal(response.data); })
        .catch(error => {
            navigate(`/edit-profile/${userId}`);

            setStatusMessage('Failed to retrieve requested Profile'); 
            console.error('Failed to fetch current Profile',  editingUserId, error);});


    const onSubmit = async(e:any) => {
        if(e)
            e.preventDefault();

        //Rerun all Validations 
        const validationSet:Set<string> = new Set();
        Object.keys(validation).forEach(field => validationSet.add(field));
        Object.keys(input).forEach(field => validationSet.add(field));

        //@ts-ignore
        const finalValidations = await [...validationSet].reduce(async (result, fieldName) => await validateInput(fieldName, input[fieldName] || '', input, await result), validation);

        if(Object.keys(finalValidations).length  > 0) {
            setStatusMessage("Please fix all validation before creating a new account.")
            return;
        } 
            axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${editingUserId}`, {
            ...input,
            dob: input.dob ? convertDate(input.dob || '').getTime() : undefined,
            dailyNotificationHour: input.dailyNotificationHour ? convertHour(input.dailyNotificationHour || '') : undefined,
        }, {
            headers: {
                ['user-id']: userId,
                jwt: JWT
            }
        })
        .then(response => { //Saved Successfully
            setInput(response.data);
            setStatusMessage("Profile update saved successfully.");
            fetchProfile(editingUserId);
            console.log('AXIOS Profile Update Successfully', response.data);

        }).catch(error => {setStatusMessage('Failed to Save Profile Changes'); console.error(error);});
    }


    const onInput = async(event:any) => {
        const {name, value} = event?.target;
        setInput({...input, [name]: value});
        console.log('Editing', name, value, {...input, [name]: value});
        
        setValidation(await validateInput(name, value, input, validation));
    }

    
    const getInput = (field:string) => {
        //@ts-ignore
        return input[field] || original[field] || '';
        // if(input[field]) return input[field];
        // else if(origional[field]) return origional[field];
        // else return '';
    }


    return (
        <div id='edit-profile'  className='form-page'>
            <h2>Edit Profile</h2>
            <form onSubmit={onSubmit}>
                {(statusMessage.length > 0) && <h4>{statusMessage}</h4>}
                {(statusMessage.length > 0) && <button type='submit' onClick={()=>navigate('/dashboard')}>Return to Dashboard</button>}
                {(statusMessage.length > 0) && <hr/>}

                <label htmlFor='Available Profiles'>Edit User</label>
                <select name="credentialSelect" onChange={(e)=>navigate(`/edit-profile/${e.target.value}`)} value={editingUserId}>
                    {accessProfiles?.sort((a,b)=>(a.user_id < b.user_id ? -1 : 1)).map((user,i)=>
                        <option key={`${i}-${user.user_id}`} value={user.user_id}>{user.user_id} | {user.display_name} | {user.user_role}</option>
                    )}
                </select>

                <h3>General Edits</h3>
              
                <label htmlFor='displayName'>Public Name</label>
                <input name='displayName' type='text' onChange={onInput}  value={getInput('displayName')}/>
                {validation?.displayName && <p className='error' >{validation.displayName}</p>}

                <label htmlFor='zipcode'>Zipcode</label>
                <input name='zipcode' type='text' onChange={onInput}  value={getInput('zipcode')}/>
                {validation?.zipcode && <p className='error' >{validation.zipcode}</p>}
                {/* TODO: Zipcode Auto Search City  */}

                <label htmlFor='dailyNotificationHour'>Daily Reminder</label>
                <input name='dailyNotificationHour' type='time' step='3600' onChange={onInput} value={getInput('dailyNotificationHour')}/>
                {validation?.dailyNotificationHour && <p className='error' >{validation.dailyNotificationHour}</p>}

                {isAdmin() && <hr/>}


                {isAdmin() && <h3>Admin Edits</h3>}

                {/* <label htmlFor='verified'>Account Verified</label>
                <input name='verified' type='checkbox' onChange={onBooleanInput}  checked={getInput('verified}/>
                {validation?.verified && <p className='error' >{validation.verified}</p>} */}

                {isAdmin() && <label htmlFor='email'>Email address</label>}
                {isAdmin() && <input name='email' type='email' onChange={onInput}  value={getInput('email')}/>}

                {isAdmin() && <label htmlFor='emailVerify'>Confirm Email Address</label>}
                {isAdmin() && <input name='emailVerify' type='email' onChange={onInput}  value={getInput('emailVerify')}/>}
                {validation?.email && <p className='error' >{validation.email}</p>}

                {isAdmin() && <label htmlFor='password'>Password</label>}
                {isAdmin() && <input name='password' type='password' onChange={onInput}  value={getInput('password')}/>}

                {isAdmin() && <label htmlFor='passwordVerify'>Confirm Password</label>}
                {isAdmin() && <input name='passwordVerify' type='password' onChange={onInput}  value={getInput('passwordVerify')}/>}
                {validation?.password && <p className='error' >{validation.password}</p>}


                {isAdmin() && <label htmlFor='userRole'>Account Type</label>}
                {isAdmin() && <select name="userRole" onChange={onInput}  value={getInput('userRole')}>
                        {availableUserRoles?.map((role,i)=>
                            <option key={`${i}-${role}`} value={role}>{role}</option>
                        )}
                    </select>}
                {validation?.userRole && <p className='error' >{validation.userRole}</p>}

                {isAdmin() && <label htmlFor='firstName'>First Name</label>}
                {isAdmin() && <input name='firstName' type='text' onChange={onInput}  value={getInput('firstName')}/>}
                {validation?.firstName && <p className='error' >{validation.firstName}</p>}
                
                {isAdmin() && <label htmlFor='lastName'>Last Name</label>}
                {isAdmin() && <input name='lastName' type='text' onChange={onInput}  value={getInput('lastName')}/>}
                {validation?.lastName && <p className='error' >{validation.lastName}</p>}
                
                {isAdmin() && <label htmlFor='phone'>Phone Number</label>}
                {isAdmin() && <input name="phone" type="tel" onChange={onInput}  value={getInput('phone')} pattern="[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}" placeholder='1-555-555-5555'/>}
                {validation?.phone && <p className='error' >{validation.phone}</p>}
                
                    
                {isAdmin() && <label htmlFor='dob'>Date of Birth</label>}
                {isAdmin() && <input name='dob' type='date' onChange={onInput}  value={getInput('dob')}/>}
                {validation?.dob && <p className='error' >{validation.dob}</p>}

                {isAdmin() && <label htmlFor='gender'>Gender</label>}
                {isAdmin() && <select name="gender" onChange={onInput}  value={getInput('gender')}>
                        <option key={`1-male`} value='MALE'>Male</option>
                        <option key={`2-female`} value='FEMALE'>Female</option>
                    </select>}
                {validation?.gender && <p className='error' >{validation.gender}</p>}

                    <hr/>

                    {/* TODO: Image Upload and POST */}
                    {/* <label htmlFor='profileImage'>Profile Image</label>
                    <input name='profileImage' type='image' onChange={onInput}  value={getInput('image')}/> */}

              {isAdmin() && <label htmlFor='notes'>Profile Notes</label>}
              {isAdmin() && <textarea name='notes' onChange={onInput} value={getInput('notes')}/>}
              {validation?.notes && <p className='error' >{validation.notes}</p>}

                {/* } */}
                {/* } */}

                <button type='submit' onClick={onSubmit}>Save Profile</button>

            </form>
        </div>
    );
}

export default EditProfile;
