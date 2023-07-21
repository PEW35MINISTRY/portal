import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams  } from 'react-router-dom';
import { resetAccount, updateProfile } from '../redux-store';
import { useAppSelector, useAppDispatch, processAJAXError, notify } from '../hooks';
import { ProfileListItem, ProfileResponse } from './profile-types';
import { EDIT_PROFILE_FIELDS, InputField, EDIT_PROFILE_FIELDS_ADMIN, RoleEnum } from './Fields-Sync/profile-field-config';
import FormProfile from './FormProfile';
import { ToastStyle } from '../app-types';
import '../index.scss'; 
import './form.scss'; 

const EditProfile = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const { id = -1 } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());

    const [editingUserID, setEditingUserID] = useState<number>(-1);
    const [accessProfiles, setAccessProfiles] = useState<ProfileListItem[]>([]);
    const [confirmDelete, setConfirmDelete] = useState<Boolean>(false);

    //Triggers | (delays fetchProfile until after Redux auto login)
    useEffect(() => { if(id as number > 0) setEditingUserID(parseInt(id.toString()));}, [id]);

    //componentDidMount
    useEffect(() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS);
        
        //Get list of profiles have access to edit
        if(userID > 0)
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/access`, {
                headers: {
                    ['user-id']: userID,
                    jwt: jwt
                }})
                .then(response => setAccessProfiles(response.data))
                .catch((error) => processAJAXError(error));
        },[userID, editingUserID]);
            

    /*******************************************
     *     RETRIEVE PROFILE BEING EDITED
     * *****************************************/
    useEffect(() => { if(editingUserID > 0 && userID > 0) { fetchProfile(editingUserID); }}, [userID, editingUserID, EDIT_FIELDS]);

    const fetchProfile = (fetchUserID:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${fetchUserID}`,{
        headers: {
            ['user-id']: userID,
            jwt: jwt
        }})
        .then(response => {
            const fields:ProfileResponse = response.data;
            const valueMap:Map<string, any> = new Map([['userID', fields.userID as unknown as string], ['userRole', fields.userRole]]);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(field === 'userRoleList' && EDIT_FIELDS.some(f => f.field === 'userRoleTokenList')) {
                    valueMap.set('userRoleTokenList', new Map(Array.from(value).map((role) => ([role, '']))));
                } else if(EDIT_FIELDS.some(f => f.field === field))
                    valueMap.set(field, value);
                else    
                    console.log(`EditProfile-skipping field: ${field}`, value);
            });
            console.log('EditProfile-fetched-user', valueMap);
            setInputMap(new Map(valueMap));
        })
        .catch((error) => { 
            processAJAXError(error, ()=>navigate(`/portal/edit-profile/${userID}`));
        });

    /*******************************************
     *         SAVE CHANGES TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeEditRequest = async(result?:Map<string,any>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody = {};
        finalMap.forEach((value, field) => {
            if(field === 'userRoleTokenList') { //@ts-ignore
                requestBody[field] = Array.from((finalMap.get('userRoleTokenList') as Map<string,string>).entries())
                                        .map(([role, token]) => ({role: role, token: token || ''}));
            } else //@ts-ignore
                requestBody[field] = value;
        });

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${editingUserID}`, requestBody, 
                {
                    headers: {
                        ['user-id']: userID,
                        jwt: jwt
                    }
                }
            )
            .then(response => {
                //Save to Redux for current session
                if(userID === editingUserID)
                    dispatch(updateProfile(response.data));

                notify(`${response.data.firstName} Profile Saved`, ToastStyle.SUCCESS);

            }).catch((error) => processAJAXError(error));
    }

    /*******************************************
     *         DELETE Editing Profile
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/user/profile/${editingUserID}`, 
                { headers: { ['user-id']: userID, jwt: jwt }} )
            .then(response => {
                notify(`Deleted user ${editingUserID}`, ToastStyle.SUCCESS, () => {
                    setConfirmDelete(false);
                    if(userID === editingUserID) { //Delete self
                        dispatch(resetAccount());
                        navigate(`/login`);
                    } 
                    else 
                        navigate(`/portal/edit-profile/${userID}`);
                });
            }).catch((error) => processAJAXError(error));

    const getInputField = (field:string):any|undefined => inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-profile'  className='form-page'>
            <h2>Edit Profile</h2>

            {(accessProfiles.length > 0) &&
                <form id='accessProfilesForm'>
                    <div className='inputWrapper'>
                        <label htmlFor='accessProfiles'>Edit User</label>
                        <select name="accessProfiles" onChange={(e)=>navigate(`/portal/edit-profile/${e.target.value}`)} value={editingUserID}>
                            {accessProfiles.length > 0 && accessProfiles.map((user:ProfileListItem, i:number)=>
                                <option key={`${i}-${user.userID}`} value={user.userID}>{user.userID} | {user.displayName}</option>
                            )}
                        </select>
                    </div>
                </form>
            }

            {(accessProfiles.length > 0) && <hr/> }

            { confirmDelete
                ? <button onClick={makeDeleteRequest}>{`Confirm deleting user: ${editingUserID}`}</button> //TODO Display full static profile and memberships; circle leader exception and redirect
                :   <FormProfile
                        key={editingUserID}
                        validateUniqueFields={true}
                        getInputField={getInputField}
                        setInputField={setInputField}
                        PROFILE_FIELDS={EDIT_FIELDS}
                        onSubmitText='Save Changes'              
                        onSubmitCallback={makeEditRequest}
                        onAlternativeText='Delete Profile'
                        onAlternativeCallback={()=>setConfirmDelete(true)}
                    />
            }

        </div>
    );
}

export default EditProfile;
