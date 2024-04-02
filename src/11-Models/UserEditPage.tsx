import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileEditRequestBody, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import InputField, { checkFieldName, makeDisplayList } from '../0-Assets/field-sync/input-config-sync/inputField';
import { EDIT_PROFILE_FIELDS, EDIT_PROFILE_FIELDS_ADMIN, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import { removeCircle, removePrayerRequest, resetAccount, updateProfile, updateProfileImage } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { SearchType, ListItemTypesEnum, DisplayItemType } from '../0-Assets/field-sync/input-config-sync/search-config';
import ImageUpload from '../2-Widgets/ImageUpload';

import '../2-Widgets/Form/form.scss';

//Assets
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';

const UserEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:RoleEnum = useAppSelector((state) => state.account.userRole);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userAccessProfileList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [image, setImage] = useState<string|undefined>(undefined); //Read Only

    const [editingUserID, setEditingUserID] = useState<number>(-1);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);
    const [showImageUpload, setShowImageUpload] = useState<Boolean>(false);

    //SearchList Cache unique for editingUserID
    const [partnerProfileList, setPartnerProfileList] = useState<ProfileListItem[]>([]);
    const [memberCircleList, setMemberCircleList] = useState<CircleListItem[]>([]);
    const [prayerRequestList, setPrayerRequestList] = useState<PrayerRequestListItem[]>([]);



    //Triggers | (delays fetchProfile until after Redux auto login)
    useLayoutEffect(() => { 
        if(id as number > 0) 
            setEditingUserID(parseInt(id.toString()));
    }, [id]);


    /* Sync state change to URL action */
    useEffect(() => {
        if(showDeleteConfirmation) 
            navigate(`/portal/edit/profile/${editingUserID}/delete`);
        else if(showImageUpload) 
            navigate(`/portal/edit/profile/${editingUserID}/image`);
        else 
            navigate(`/portal/edit/profile/${editingUserID}`);

    }, [showDeleteConfirmation, showImageUpload]);


    //componentDidMount
    useLayoutEffect(() => {
        if(userHasAnyRole([RoleEnum.ADMIN]))
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS);       
         
        },[userID]);
            

    /*******************************************
     *     RETRIEVE PROFILE BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        navigate(`/portal/edit/profile/${editingUserID}/${action || ''}`); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
        if(editingUserID > 0 && userID > 0) fetchProfile(editingUserID); }, [userID, editingUserID]);


    const fetchProfile = (fetchUserID:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${fetchUserID}`,{
        headers: { jwt: jwt }})
        .then((response:{ data:ProfileResponse }) => {
            const fields:ProfileResponse = response.data;
            const valueMap:Map<string, any> = new Map([['userID', fields.userID as unknown as string], ['userRole', fields.userRole]]);
            //Clear Lists, not returned if empty
            setPartnerProfileList([]);
            setMemberCircleList([]);
            setPrayerRequestList([]);
            setImage(undefined);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(field === 'userRoleList' && EDIT_FIELDS.some(f => f.field === 'userRoleTokenList')) {
                    valueMap.set('userRoleTokenList', new Map(Array.from(value).map((role) => ([role, '']))));

                } else if(field === 'circleList') {
                    setMemberCircleList([...value]);

                } else if(field === 'prayerRequestList') {
                    setPrayerRequestList([...value]);

                } else if(field === 'image') {
                    setImage(value);
                    valueMap.set('image', value);

                } else if(checkFieldName(EDIT_FIELDS, field))
                    valueMap.set(field, value);
                else    
                    console.log(`EditProfile-skipping field: ${field}`, value);
            });
            setInputMap(new Map(valueMap));

            /* Update State based on sub route */
            if(action === 'delete') 
                setShowDeleteConfirmation(true);
            else if(action === 'image') 
                setShowImageUpload(true);
        })
        .catch((error) => processAJAXError(error, () => navigate(`/portal/edit/profile/${userID}`)));


    /* Checks Currently Editing Profile */
    const editingUserHasAnyRole = (roleList: RoleEnum[]):boolean =>
        (!getInputField('userRoleTokenList') || getInputField('userRoleTokenList').length === 0) ? 
            roleList.includes(RoleEnum.STUDENT)
        : Array.from((getInputField('userRoleTokenList') as Map<RoleEnum, string>).keys())
            .some((editingUserRole: RoleEnum) => roleList.includes(editingUserRole));

    /* Checks Logged in User */
    const userHasAnyRole = (roleList: RoleEnum[]):boolean =>
        (!userRoleList || userRoleList.length === 0) ? 
            roleList.includes(RoleEnum.STUDENT)
        : roleList.some(role => userRoleList.some((userRole:RoleEnum) => userRole === role));

        
    /*******************************************
     *         SAVE CHANGES TO SEVER
     * FormProfile already handled validations
     * *****************************************/
    const makeEditRequest = async(resultMap:Map<string,any> = inputMap) =>
        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}`, assembleRequestBody(resultMap), 
            { headers: { jwt: jwt }})
            .then((response:{ data:ProfileResponse }) => {
                //Save to Redux for current session
                if(userID === editingUserID)
                    dispatch(updateProfile(response.data));

                notify(`${response.data.firstName} Profile Saved`, ToastStyle.SUCCESS);
            }).catch((error) => processAJAXError(error));

    /*******************************************
     *         DELETE Editing Profile
     * *****************************************/
    const makeDeleteRequest = async() => 
        await axios.delete(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}`, 
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
    const getInputField = (field:string):any|undefined => inputMap.get(field) || EDIT_FIELDS.find(f => f.field === field)?.value;

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));


    /*****************************
     * REDIRECT LINKED UTILITIES *
     *****************************/
    const redirectToProfile = (redirectUserID:number, displayType?:string):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) || userAccessProfileList.map((profile:ProfileListItem) => profile.userID).includes(redirectUserID)) 
            setEditingUserID(redirectUserID);
        else
            notify('TODO - Public profile popup');
    }

    const redirectToCircle = (redirectCircleID:number):void => {
        if(userHasAnyRole([RoleEnum.ADMIN, RoleEnum.CIRCLE_LEADER])) 
            navigate(`/portal/edit/circle/${redirectCircleID}`);
        else
            notify('TODO - Public circle popup');
    }

    const redirectToPrayerRequest = (prayerRequestItem:PrayerRequestListItem):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) || prayerRequestItem.requestorProfile.userID === userID) 
            navigate(`portal/edit/prayer-request/${prayerRequestItem.prayerRequestID}`);
        else
            notify('TODO - Preview Prayer Request popup');
    }


    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-profile'  className='form-page form-page-stretch'>

            <FormInput
                key={editingUserID}
                getIDField={()=>({modelIDField: 'userID', modelID: editingUserID})}
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
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingUserID}</label>}
                            </span>
                        </div>
                        <img className='form-header-image profile-image' src={image || PROFILE_DEFAULT} alt='Profile-Image' />
                        <div className='form-header-horizontal'>
                            <button type='button' className='alternative-button form-header-button' onClick={() => setShowImageUpload(true)}>Edit Image</button>
                        </div>
                        <h2>{`Edit Profile`}</h2>
                    </div>}
            />

            <SearchList
                key={'UserEdit-'+editingUserID}
                defaultDisplayTitleKeySearch='Profiles'
                defaultDisplayTitleList={['Partners', 'Circles', 'Prayer Request']}
                displayMap={new Map([
                        [
                            new SearchListKey({displayTitle:'Profiles', searchType: SearchType.USER,
                                onSearchClick: (id:number) => redirectToProfile(id),
                            }),
                            [...userAccessProfileList].map((profile:ProfileListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) => redirectToProfile(id),
                            }))
                        ], 
                        [ /* MEMBER & LEADER CIRCLES | Admin Search */
                            new SearchListKey({displayTitle:'Circles', searchType: userHasAnyRole([RoleEnum.ADMIN]) ? SearchType.CIRCLE : SearchType.NONE,
                                onSearchClick: (id:number) => redirectToCircle(id),
                                searchPrimaryButtonText: `Join Circle`, 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/circle/${id}/join/${editingUserID}`, { }, { headers: { jwt: jwt }} )
                                        .then((response: {data:CircleListItem}) => notify(`Joined Circle ${(item as CircleListItem).name}`, ToastStyle.SUCCESS, () => setMemberCircleList(list => [item as CircleListItem, ...list])))
                                        .catch((error) => processAJAXError(error)),
                                }),

                            [...memberCircleList].map((circle:CircleListItem) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE, displayItem: circle, 
                                onClick: (id:number) => redirectToCircle(id),
                                alternativeButtonText: 'Leave Circle', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}${
                                            userHasAnyRole([RoleEnum.ADMIN, RoleEnum.CIRCLE_LEADER]) ? `/api/leader/circle/${id}/client/${editingUserID}/leave` : `/api/circle/${id}/leave`}`, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Left Circle ${circle.name}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(removeCircle(id)) : setMemberCircleList(list => list.filter(circle => circle.circleID !== id))))
                                        .catch((error) => processAJAXError(error))
                                    }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Prayer Request'}),

                            [...prayerRequestList].map((prayerRequest:PrayerRequestListItem) => new SearchListValue({displayType: ListItemTypesEnum.PRAYER_REQUEST, displayItem: prayerRequest, 
                                onClick: (id:number) => redirectToPrayerRequest(prayerRequest),
                                primaryButtonText: 'Pray', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${id}/like`, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Prayed`, ToastStyle.SUCCESS, () => setPrayerRequestList(list => list.map((prayerRequest) => (prayerRequest.prayerRequestID === id) ? {...prayerRequest, prayerCount: prayerRequest.prayerCount + 1} : prayerRequest))))
                                        .catch((error) => processAJAXError(error))
                            }))
                        ], 
                    ])}
            />

            {(showDeleteConfirmation) &&
                <div key={'UserEdit-confirmDelete-'+editingUserID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>setShowDeleteConfirmation(false)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()} >
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('firstName')} {getInputField('lastName')}</h1>
                            <span>
                                <label className='title id-left'>{getInputField('displayName')}</label>
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingUserID}</label>}
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

                {(showImageUpload) &&
                    <ImageUpload
                        key={'profile-image-'+editingUserID}
                        title='Upload Profile Image'
                        imageStyle='profile-image'
                        currentImage={ image }
                        defaultImage={ PROFILE_DEFAULT }
                        onCancel={()=>setShowImageUpload(false)}
                        onClear={()=>axios.delete(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}/image`, { headers: { jwt: jwt }} )
                            .then(response => {
                                setShowImageUpload(false);
                                setImage(undefined);
                                notify(`Profile Image Deleted`, ToastStyle.SUCCESS, () => (editingUserID === userID) && dispatch(updateProfileImage(undefined)))})
                            .catch((error) => processAJAXError(error))}
                        onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}/image/${imageFile.name}`, imageFile, { headers: { 'jwt': jwt, 'Content-Type': imageFile.type }} )
                            .then(response => {
                                setShowImageUpload(false);
                                setImage(response.data);
                                notify(`Profile Image Uploaded`, ToastStyle.SUCCESS, () => (editingUserID === userID) && dispatch(updateProfileImage(response.data)))})
                            .catch((error) => processAJAXError(error))}
                    />
                }
        </div>
    );
}

export default UserEditPage;
