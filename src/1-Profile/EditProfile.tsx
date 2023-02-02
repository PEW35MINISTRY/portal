import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams  } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 
import FormProfile from './FormProfile';
import validateInput, {ProfileType, convertDate, convertHour, getAvailableUserRoles } from './validateProfile';
import { serverErrorResponse, ToastStyle } from '../app-types';


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

    const [input, setInput] = useState<ProfileType>({});
    const [original, setOriginal] = useState<ProfileType>({});
    const [validation, setValidation] = useState<any>({});
    const [requiredProfileFields, setRequiredProfileFields] = useState<any>({}); //Uses SIGNUP access list
    const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
    const [editingUserId, setEditingUserId] = useState<number>(-1);

    //Triggers
    useEffect(() => {if(id > 0) setEditingUserId(parseInt(id.toString()));}, [id]);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_DOMAIN}/resources/profile-edit-list`) //No headers to get default SIGNUP list
            .then(response => setRequiredProfileFields(response.data || []))

            .catch((res) => { 
                dispatch({type: "notify", payload: {response: res,
                    message: 'Failed to find required fields.'}});
            });
        
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/access`,{
            headers: {
                ['user-id']: userId,
                jwt: JWT
            }})
            .then(response => setAccessProfiles(response.data))

            .catch((res) => { 
                dispatch({type: "notify", payload: {response: res}});
            });

        },[]);
            

    useEffect(() => { if(editingUserId > 0) fetchProfile(editingUserId);}, [editingUserId]);

    const fetchProfile = (fetchUserId:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${fetchUserId}`,{
        headers: {
            ['user-id']: userId,
            jwt: JWT
        }})
        .then(response => {setOriginal(response.data); })
        .catch((res) => { 
            dispatch({type: "notify", payload: {
                response: res,
                message: 'Failed to retrieve requested Profile',
                //@ts-ignore
                log: editingUserId,
                callback: () => {
                    navigate(`/portal/edit-profile/${userId}`);
                }
            }});
        });

    const onSubmit = async(e:any) => {
        if(e)
            e.preventDefault();

        //Rerun all Validations 
        const validationSet:Set<string> = new Set();
        Object.keys(validation).forEach(field => validationSet.add(field));
        Object.keys(input).forEach(field => validationSet.add(field));

        //@ts-ignore
        const finalValidations = await [...validationSet].reduce(async (result, fieldName) => await validateInput(fieldName, input[fieldName] || '', input, await result, requiredProfileFields), validation);

        if(Object.keys(finalValidations).length  > 0) {
            dispatch({type: "notify", payload: {
                message: 'Please fix all validation before saving account changes.',
            }});

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
            dispatch({type: "notify", payload: {
                response: response,
                message: 'Changes saved.'
            }});

            fetchProfile(editingUserId);

        }).catch((response) => { 
            dispatch({type: "notify", payload: { response: response }});
        });
    }


    const onInput = async(event:any) => {
        const {name, value} = event?.target;
        setInput({...input, [name]: value});
        console.log('Editing', name, value, {...input, [name]: value});
        
        setValidation(await validateInput(name, value, input, validation, requiredProfileFields));
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
            <FormProfile
                onInput={onInput}
                getInput={getInput}
                validation={validation}
                headerChildren={
                    <div className='children'>
                        <label htmlFor='Available Profiles'>Edit User</label>
                        <select name="credentialSelect" onChange={(e)=>navigate(`/portal/edit-profile/${e.target.value}`)} value={editingUserId}>
                            {accessProfiles?.sort((a,b)=>(a.user_id < b.user_id ? -1 : 1)).map((user,i)=>
                                <option key={`${i}-${user.user_id}`} value={user.user_id}>{user.user_id} | {user.display_name} | {user.user_role}</option>
                            )}
                        </select>
        
                        <h3>{userRole} Edits</h3>
                    </div>
                }
                footerChildren={<button type='submit' onClick={onSubmit}>Save Profile</button>}               
            />
        </div>
    );
}

export default EditProfile;
