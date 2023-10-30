import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileEditRequestBody, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import InputField, { makeDisplayList } from '../0-Assets/field-sync/input-config-sync/inputField';
import { EDIT_PROFILE_FIELDS, EDIT_PROFILE_FIELDS_ADMIN, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { removeCircle, removePrayerRequest, resetAccount, updateProfile } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';

import '../2-Widgets/Form/form.scss';

//Assets
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';

const UserEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const userAccessProfileList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const { id = -1 } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [image, setImage] = useState<string|undefined>(undefined); //Read Only

    const [editingUserID, setEditingUserID] = useState<number>(-1);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);

    //SearchList Cache unique for editingUserID
    const [partnerProfileList, setPartnerProfileList] = useState<ProfileListItem[]>([]);
    const [memberCircleList, setMemberCircleList] = useState<CircleListItem[]>([]);
    const [prayerRequestList, setPrayerRequestList] = useState<PrayerRequestListItem[]>([]);



    //Triggers | (delays fetchProfile until after Redux auto login)
    useLayoutEffect(() => { if(id as number > 0) setEditingUserID(parseInt(id.toString()));}, [id]);

    //componentDidMount
    useLayoutEffect(() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS);       
         
        },[userID]);
            

    /*******************************************
     *     RETRIEVE PROFILE BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        navigate(`/portal/edit/profile/${editingUserID}`); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
        if(editingUserID > 0 && userID > 0) fetchProfile(editingUserID); }, [userID, editingUserID]);


    const fetchProfile = (fetchUserID:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${fetchUserID}`,{
        headers: { jwt: jwt }})
        .then(response => {
            const fields:ProfileResponse = response.data;
            const valueMap:Map<string, any> = new Map([['userID', fields.userID as unknown as string], ['userRole', fields.userRole]]);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(field === 'userRoleList' && EDIT_FIELDS.some(f => f.field === 'userRoleTokenList')) {
                    valueMap.set('userRoleTokenList', new Map(Array.from(value).map((role) => ([role, '']))));
                } else if(field === 'partnerList') {
                    setPartnerProfileList(value);

                } else if(field === 'circleList') {
                    setMemberCircleList(value);

                } else if(field === 'prayerRequestList') {
                    setPrayerRequestList(value);

                } else if(field === 'image') {
                    setImage(value);

                } else if(EDIT_FIELDS.some(f => f.field === field))
                    valueMap.set(field, value);
                else    
                    console.log(`EditProfile-skipping field: ${field}`, value);
            });
            setInputMap(new Map(valueMap));
        })
        .catch((error) => processAJAXError(error, () => setEditingUserID(userID)));


    /*******************************************
     *         SAVE CHANGES TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeEditRequest = async(result?:Map<string,any>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:ProfileEditRequestBody = {} as ProfileEditRequestBody;
        finalMap.forEach((value, field) => {
            if(field === 'userRoleTokenList') { //@ts-ignore
                requestBody[field] = Array.from((finalMap.get('userRoleTokenList') as Map<string,string>).entries())
                                        .map(([role, token]) => ({role: role, token: token || ''}));
            } else //@ts-ignore
                requestBody[field] = value;
        });

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}`, requestBody, 
            { headers: { jwt: jwt }})
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
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}`, 
                { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted user ${editingUserID}`, ToastStyle.SUCCESS, () => {
                    setShowDeleteConfirmation(false);
                    if(userID === editingUserID) { //Delete self
                        dispatch(resetAccount());
                        navigate(`/login`);
                    } 
                    else 
                        setEditingUserID(userID);
                });
            }).catch((error) => processAJAXError(error));



    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-profile'  className='form-page form-page-stretch'>

            <FormInput
                key={editingUserID}
                validateUniqueFields={true}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText='Save Changes'              
                onSubmitCallback={makeEditRequest}
                onAlternativeText='Delete Profile'
                onAlternativeCallback={()=>setShowDeleteConfirmation(true)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('firstName')} {getInputField('lastName')}</h1>
                            <label className='title id-left'>{getInputField('displayName')}</label>
                            <span>
                                {(memberCircleList.length > 0) && <label className='title id-left'>{memberCircleList.length} Circles</label>}
                                {(partnerProfileList.length > 0) && <label className='title id-left'>{partnerProfileList.length} Partners</label>}
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingUserID}</label>}
                            </span>
                        </div>
                        <img className='form-header-image profile-image' src={image || PROFILE_DEFAULT} alt='Profile-Image' />
                        <h2>{`Edit Profile`}</h2>
                    </div>}
            />

            {(showDeleteConfirmation) &&
                <div key={'UserEdit-confirmDelete-'+editingUserID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>setShowDeleteConfirmation(false)}>

                    <div className='form-page-block center-absolute-inside'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('firstName')} {getInputField('lastName')}</h1>
                            <span>
                                <label className='title id-left'>{getInputField('displayName')}</label>
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingUserID}</label>}
                            </span>
                        </div>
                        <img className='form-header-image profile-image' src={getInputField('image') || PROFILE_DEFAULT} alt='Profile-Image' />
                        <h2>Delete Profile?</h2>

                        {makeDisplayList(Array.from((getInputField('userRoleTokenList') as Map<string,string>)?.keys() || [])).map((role) =>
                            <label >{`+ ${role} Role`}</label>
                        )}
                        <hr/>
                        {(memberCircleList.length > 0) && <label >{`+ ${memberCircleList.length} Memberships`}</label>}
                        {(partnerProfileList.length > 0) && <label >{`+ ${partnerProfileList.length} Partnerships`}</label>}
                        {(prayerRequestList.length > 0) && <label >{`+ ${prayerRequestList.length} Prayer Requests`}</label>}
        
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={()=>setShowDeleteConfirmation(false)}>Cancel</button>
                    </div>
                </div>}

        </div>
    );
}

export default UserEditPage;
