import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams  } from 'react-router-dom';
import { updateProfile } from '../redux-store';
import { useAppSelector, useAppDispatch, processAJAXError, notify } from '../hooks';
import { ProfileResponse } from './profile-types';
import { EDIT_PROFILE_FIELDS, InputField, EDIT_PROFILE_FIELDS_ADMIN, RoleEnum } from './Fields-Sync/profile-field-config';
import FormProfile from './FormProfile';
import { ToastStyle } from '../app-types';


import './form.scss'; 

//TODO Update field names with Database Update
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
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const { id = -1 } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, string>>(new Map());
    const [editingUserId, setEditingUserId] = useState<number>(-1);
    const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);

    //Triggers | (delays fetchProfile until after Redux auto login)
    useEffect(() => { if(id as number > 0) setEditingUserId(parseInt(id.toString()));}, [id]);

    //componentDidMount
    useEffect(() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS);
        
        //Get list of profiles have access to edit
        if(userId > 0)
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/access`, {
                headers: {
                    ['user-id']: userId,
                    jwt: JWT
                }})
                .then(response => setAccessProfiles(response.data))
                .catch((error) => processAJAXError(error));
        },[userId]);
            

    /*******************************************
     *     RETRIEVE PROFILE BEING EDITED
     * *****************************************/
    useEffect(() => { if(editingUserId > 0 && userId > 0) { fetchProfile(editingUserId); }}, [userId, editingUserId]);

    const fetchProfile = (fetchUserId:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${fetchUserId}`,{
        headers: {
            ['user-id']: userId,
            jwt: JWT
        }})
        .then(response => {
            const fields:ProfileResponse = response.data;
            const valueMap:Map<string, string> = new Map([['userId', fetchUserId.toString()]]);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(EDIT_FIELDS.some(f => f.field === field))
                    valueMap.set(field, value);
            });
            setInputMap(new Map(valueMap));
        })
        .catch((error) => { 
            processAJAXError(error, ()=>navigate(`/portal/edit-profile/${userId}`));
        });

    /*******************************************
     *         SAVE CHANGES TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeEditRequest = async(result?:Map<string,string>) => {
        const finalMap = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody = {};
        //@ts-ignore
        finalMap.forEach((value, field) => {requestBody[field] = value});

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${editingUserId}`, requestBody, 
                {
                    headers: {
                        ['user-id']: userId,
                        jwt: JWT
                    }
                }
            )
            .then(response => {
                //Save to Redux for current session
                if(userId === editingUserId)
                    dispatch(updateProfile(response.data));

                notify(`${response.data.profile.firstName} Profile Saved`, ToastStyle.SUCCESS);

            }).catch((error) => processAJAXError(error));
    }

    const getInputField = (field:string):string|undefined => inputMap.get(field);
    const setInputField = (field:string, value:string):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-profile'  className='form-page'>
            <h2>Edit Profile</h2>

            <form id='accessProfilesForm'>
                <div className='inputWrapper'>
                    <label htmlFor='accessProfiles'>Edit User</label>
                    <select name="accessProfiles" onChange={(e)=>navigate(`/portal/edit-profile/${e.target.value}`)} value={editingUserId}>
                        {accessProfiles?.sort((a,b)=>(a.user_id < b.user_id ? -1 : 1)).map((user,i)=>
                            <option key={`${i}-${user.user_id}`} value={user.user_id}>{user.user_id} | {user.display_name} | {user.user_role}</option>
                        )}
                    </select>
                </div>
            </form>

            <hr/>

            <FormProfile
                validateUniqueFields={true}
                getInputField={getInputField}
                setInputField={setInputField}
                PROFILE_FIELDS={EDIT_FIELDS}
                onSubmitText='Save Changes'              
                onSubmitCallback={makeEditRequest}
            />
        </div>
    );
}

export default EditProfile;
