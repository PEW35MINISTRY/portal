import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { NewPartnerListItem, PartnerListItem, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import InputField, { checkFieldName, makeDisplayList } from '../0-Assets/field-sync/input-config-sync/inputField';
import { EDIT_PROFILE_FIELDS, EDIT_PROFILE_FIELDS_ADMIN, PartnerStatusEnum, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import { addCircle, addCircleRequest, removeCircle, removeCircleInvite, removePartner, removePartnerPendingPartner, removePartnerPendingUser, resetAccount, setLastNewPartnerRequest, updateProfile, updateProfileImage } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { SearchType, ListItemTypesEnum, DisplayItemType } from '../0-Assets/field-sync/input-config-sync/search-config';
import { ImageDefaultEnum, ImageUpload, ProfileImage } from '../2-Widgets/ImageWidgets';
import { PartnershipContract, PartnershipStatusADMIN } from '../2-Widgets/PartnershipWidgets';
import PageNotFound from '../2-Widgets/NotFoundPage';

import '../2-Widgets/Form/form.scss';


const UserEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:RoleEnum = useAppSelector((state) => state.account.userRole);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userLastNewPartnerRequest:number = useAppSelector((state) => state.settings.lastNewPartnerRequest);
    const userAccessProfileList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const userCircleList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleList) || [];
    const userCircleInviteList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleInviteList) || [];
    const userCircleRequestList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleRequestList) || [];
    const userPartnerList:PartnerListItem[] = useAppSelector((state) => state.account.userProfile.partnerList) || [];
    const userPartnerPendingUserList:PartnerListItem[] = useAppSelector((state) => state.account.userProfile.partnerPendingUserList) || [];
    const userPartnerPendingPartnerList:PartnerListItem[] = useAppSelector((state) => state.account.userProfile.partnerPendingPartnerList) || [];
    const userPrayerRequestList:PrayerRequestListItem[] = useAppSelector((state) => state.account.userProfile.prayerRequestList) || [];
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [image, setImage] = useState<string|undefined>(undefined); //Read Only

    const [editingUserID, setEditingUserID] = useState<number>(-1);
    const [showNotFound, setShowNotFound] = useState<Boolean>(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);
    const [showImageUpload, setShowImageUpload] = useState<Boolean>(false);
    const [newPartner, setNewPartner] = useState<PartnerListItem|undefined>(undefined); //undefined hides new partnership popup

    //SearchList Cache unique for editingUserID
    const DEFAULT_DISPLAY_TITLE_LIST:string[] = ['Pending Partner Acceptance', 'New Circles', 'Partners', 'Circles', 'Prayer Request'];
    const [defaultDisplayTitleList, setDefaultDisplayTitleList] = useState<string[]>(DEFAULT_DISPLAY_TITLE_LIST);
    const [memberCircleList, setMemberCircleList] = useState<CircleListItem[]>([]);
    const [circleInviteList, setCircleInviteList] = useState<CircleListItem[]>([]);
    const [circleRequestList, setCircleRequestList] = useState<CircleListItem[]>([]);
    const [partnerList, setPartnerList] = useState<PartnerListItem[]>([]);
    const [partnerPendingUserList, setPartnerPendingUserList] = useState<PartnerListItem[]>([]);
    const [partnerPendingPartnerList, setPartnerPendingPartnerList] = useState<PartnerListItem[]>([]);
    const [availablePartnerList, setAvailablePartnerList] = useState<NewPartnerListItem[]>([]);
    const [prayerRequestList, setPrayerRequestList] = useState<PrayerRequestListItem[]>([]);


    /* Sync Redux State */
    useEffect(() => {
        if(userID === editingUserID) {
            setMemberCircleList(userCircleList);
            setCircleInviteList(userCircleInviteList);
            setCircleRequestList(userCircleRequestList);
            setPartnerList(userPartnerList);
            setPartnerPendingUserList(userPartnerPendingUserList);
            setPartnerPendingPartnerList(userPartnerPendingPartnerList)
            setPrayerRequestList(userPrayerRequestList);
        }
    }, [ userCircleList, userCircleInviteList, userCircleRequestList, userPartnerList, userPartnerPendingUserList, userPartnerPendingPartnerList, userPrayerRequestList ]);


    //Triggers | (delays fetchProfile until after Redux auto login)
    useLayoutEffect(() => {
        if(userHasAnyRole([RoleEnum.ADMIN]))
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_PROFILE_FIELDS); 

        //setEditingUserID
        if(userID > 0 && jwt.length > 0) {
            if(isNaN(id as any) || (parseInt(id as string) < 1)) { //new
                navigate(`/portal/edit/profile/${userID}`);
                setEditingUserID(userID);

            } else //edit
                setEditingUserID(parseInt(id as string));
        }

        /* Sync state change to URL action */
        setShowNotFound(false);
        setShowDeleteConfirmation(action === 'delete');
        setShowImageUpload(action === 'image');

    }, [jwt, userID, id, action]);

    useEffect(() => {
        if(showNotFound) {
            setShowDeleteConfirmation(false);
            setShowImageUpload(false);
        }
    }, [showNotFound]);
            

    /*******************************************
     *     RETRIEVE PROFILE BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        if(editingUserID > 0 && userID > 0) {
            navigate(`/portal/edit/profile/${editingUserID}/${action || ''}`, {replace: (id.toString() === '-1')}); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
            fetchProfile(editingUserID); 
            setShowNotFound(false);

        } else { //(id === -1)
            setShowNotFound(true);  
        }  
    }, [userID, editingUserID]);


    const fetchProfile = (fetchUserID:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${fetchUserID}`,{
        headers: { jwt: jwt }})
        .then((response:{ data:ProfileResponse }) => {
            const fields:ProfileResponse = response.data;
            const valueMap:Map<string, any> = new Map([['userID', fields.userID as unknown as string], ['userRole', fields.userRole]]);
            //Clear Lists, not returned if empty
            setMemberCircleList([]);
            setCircleInviteList([]);
            setCircleRequestList([]);
            setPartnerList([]);
            setPartnerPendingUserList([]);
            setPartnerPendingPartnerList([]);
            setPrayerRequestList([]);
            setAvailablePartnerList([]);
            setImage(undefined);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(field === 'userRoleList') {
                    valueMap.set('userRoleTokenList', new Map(Array.from(value).map((role) => ([role, '']))));

                } else if(field === 'circleList') {
                    setMemberCircleList([...value]);

                } else if(field === 'circleInviteList') {
                    setCircleInviteList([...value]);

                } else if(field === 'circleRequestList') {
                    setCircleRequestList([...value]);

                } else if(field === 'partnerList') {
                    setPartnerList([...value]);

                } else if(field === 'partnerPendingUserList') {
                    setPartnerPendingUserList([...value]);

                } else if(field === 'partnerPendingPartnerList') {
                    setPartnerPendingPartnerList([...value]);

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
        })
        .catch((error) => processAJAXError(error, () => setShowNotFound(true)));


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
                    if(userID === editingUserID) { //Delete self
                        dispatch(resetAccount());
                        navigate(`/login`);
                    } 
                    else 
                        navigate(`/portal/edit/profile/${userID}`);
                });
            }).catch((error) => processAJAXError(error));



    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => inputMap.get(field) || EDIT_FIELDS.find(f => f.field === field)?.value;

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));


    /****************
     * PARTNERSHIPS *
     ****************/
    const fetchAvailablePartners = (fetchUserID:string|number = editingUserID) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/client/${fetchUserID}/available`, { headers: { jwt: jwt }})
        .then((response:{ data:NewPartnerListItem[] }) => {
            setAvailablePartnerList([...response.data]);
            setDefaultDisplayTitleList(['Available Partners']);
            notify(`${response.data.length} Available Partners`, ToastStyle.INFO);
        })
        .catch((error) => processAJAXError(error));


    const fetchNewRandomPartner = (fetchUserID:string|number = editingUserID) => axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${fetchUserID}/new-partner`, { }, { headers: { jwt: jwt }})
        .then((response:{ data:PartnerListItem }) => {
            setNewPartner(response.data);
            notify('New Partner Found', ToastStyle.SUCCESS);
        })
        .catch((error) => processAJAXError(error));

    
    const showNewPartnerButton = ():boolean => 
        (editingUserHasAnyRole([RoleEnum.STUDENT])) 
        && (userHasAnyRole([RoleEnum.ADMIN]) 
            || ((getInputField('maxPartners') > (partnerList.length + userPartnerPendingPartnerList.length + partnerPendingPartnerList.length))
                && (Date.now() - userLastNewPartnerRequest) >= 60 * 60 * 1000));


    /*****************************
     * REDIRECT LINKED UTILITIES *
     *****************************/
    const redirectToProfile = (redirectUserID:number):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) || userAccessProfileList.map((profile:ProfileListItem) => profile.userID).includes(redirectUserID)) 
            navigate(`/portal/edit/profile/${redirectUserID}`);
        else if(partnerList.map((profile:PartnerListItem) => profile.userID).includes(redirectUserID))
            notify('TODO - Partner profile popup');
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

        {showNotFound ?
           <PageNotFound primaryButtonText={'New User'} onPrimaryButtonClick={()=>navigate('/signup')} />
           
           : <FormInput
                key={editingUserID}
                getIDField={()=>({modelIDField: 'userID', modelID: editingUserID})}
                validateUniqueFields={true}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText='Save Changes'              
                onSubmitCallback={makeEditRequest}
                onAlternativeText='Delete Profile'
                onAlternativeCallback={()=>navigate(`/portal/edit/profile/${editingUserID}/delete`)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('firstName')} {getInputField('lastName')}</h1>
                            <label className='title id-left'>{getInputField('displayName')}</label>
                            <span>
                                {(memberCircleList.length > 0) && <label className='title id-left'>{memberCircleList.length} Circles</label>}
                                {(partnerList.length > 0) && <label className='title id-left'>{partnerList.length} Partners</label>}
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingUserID}</label>}
                            </span>
                        </div>
                        <ProfileImage className='form-header-image' src={image} />
                        <div className='form-header-horizontal'>
                            <button type='button' className='alternative-button form-header-button' onClick={() => navigate(`/portal/edit/profile/${editingUserID}/image`)}>Edit Image</button>
                            {showNewPartnerButton() &&
                                <button type='button' className='alternative-button form-header-button' onClick={() => {if(userHasAnyRole([RoleEnum.ADMIN])) fetchAvailablePartners(); else fetchNewRandomPartner();  dispatch(setLastNewPartnerRequest()); }}>New Partner</button>}
                        </div>
                        <h2>{`Edit Profile`}</h2>
                    </div>}
            />
        }

            <SearchList
                key={'UserEdit-'+editingUserID}
                defaultDisplayTitleKeySearch='Profiles'
                defaultDisplayTitleList={defaultDisplayTitleList}
                displayMap={new Map([
                        [
                            new SearchListKey({displayTitle:'Profiles', searchType: SearchType.USER,
                                onSearchClick: (id:number) => redirectToProfile(id),
                            }),
                            [...userAccessProfileList].map((profile:ProfileListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) => redirectToProfile(id),
                            }))
                        ], 
                        [ /* Active Partners */
                            new SearchListKey({ displayTitle:'Partners' }),

                            [...partnerList].map((profile:ProfileListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) =>  redirectToProfile(id),
                                primaryButtonText: 'Leave Partnership', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/partner/${id}/leave`, { headers: { jwt: jwt }} )
                                            .then(response => notify(`Left Partnership with ${profile.displayName}`, ToastStyle.SUCCESS, () => (editingUserID === userID) && dispatch(removePartner(id))))
                                            .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [ /* Pending editingUser Contract Acceptance */
                            new SearchListKey({ displayTitle:'Pending Partners' }),

                            [...partnerPendingUserList].map((partner:PartnerListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: partner, 
                                onClick: (id:number) => redirectToProfile(id),
                                primaryButtonText: userHasAnyRole([RoleEnum.ADMIN]) ? 'Assign Partnership' : 'View Contract', 
                                onPrimaryButtonCallback: (id:number) => setNewPartner(partner),

                                alternativeButtonText: 'Decline Partnership', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/partner-pending/${id}/decline`, { headers: { jwt: jwt }} )
                                            .then(response => notify(`Declined Partnership with ${partner.displayName}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(removePartnerPendingUser(id)) : setPartnerPendingUserList(list => list.filter(partner => partner.userID !== id))))
                                            .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [ /* Pending other partner Contract Acceptance */
                            new SearchListKey({ displayTitle:'Pending Partner Acceptance' }),

                            [...partnerPendingPartnerList].map((partner:PartnerListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: partner, 
                                onClick: (id:number) => redirectToProfile(id),
                                primaryButtonText: userHasAnyRole([RoleEnum.ADMIN]) ? 'Assign Partnership' : '', 
                                onPrimaryButtonCallback: (id:number) => setNewPartner(partner),

                                alternativeButtonText: 'Decline Partnership', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/partner-pending/${id}/decline`, { headers: { jwt: jwt }} )
                                            .then(response => notify(`Declined Partnership with ${partner.displayName}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(removePartnerPendingPartner(id)) : setPartnerPendingPartnerList(list => list.filter(partner => partner.userID !== id))))
                                            .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [ /* Only ADMIN can Choose or Search Partners */
                            new SearchListKey({displayTitle:'Available Partners', searchType: userHasAnyRole([RoleEnum.ADMIN]) ? SearchType.USER : SearchType.NONE, 
                                onSearchClick: (id:number) => redirectToProfile(id),
                                searchPrimaryButtonText: 'Assign Partnership', 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => setNewPartner(item as PartnerListItem),
                            }),

                            [...availablePartnerList].map((partner:NewPartnerListItem) => new SearchListValue({displayType: ListItemTypesEnum.PARTNER, displayItem: partner, 
                                onClick: (id:number) => redirectToProfile(id),
                                primaryButtonText: userHasAnyRole([RoleEnum.ADMIN]) ? 'Assign Partnership' : '', 
                                onPrimaryButtonCallback: (id:number) => setNewPartner({...partner, status: PartnerStatusEnum.PENDING_CONTRACT_BOTH}),
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
                        [ /* Pending User Acceptance | Student Search */
                            new SearchListKey({displayTitle:'New Circles', searchType: userHasAnyRole([RoleEnum.STUDENT]) ? SearchType.CIRCLE : SearchType.NONE,
                                onSearchClick: (id:number) => redirectToCircle(id),
                                searchPrimaryButtonText: 'Request to Join', 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/circle/${id}/request}`, {}, { headers: { jwt: jwt }} )
                                        .then((response:{ data:CircleListItem }) => notify(`Request Sent to Join ${(item as CircleListItem).name}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(addCircleRequest(item as CircleListItem)) : setCircleRequestList(list => [item as CircleListItem, ...list])))
                                        .catch((error) => processAJAXError(error)),
                                }),

                            [...circleInviteList].map((circle:CircleListItem) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE, displayItem: circle, 
                                onClick: (id:number) => redirectToCircle(id),
                                primaryButtonText: userHasAnyRole([RoleEnum.STUDENT]) ? 'Accept' : '', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/circle/${id}/accept`, { headers: { jwt: jwt }} )
                                        .then((response:{ data: CircleListItem }) => notify(`Joined Circle ${circle.name}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(addCircle(circle)) : setMemberCircleList(list => [circle, ...list])))
                                        .catch((error) => processAJAXError(error)),

                                alternativeButtonText: 'Decline', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}${
                                            userHasAnyRole([RoleEnum.ADMIN, RoleEnum.CIRCLE_LEADER]) ? `/api/leader/circle/${id}/client/${editingUserID}/leave` : `/api/circle/${id}/leave`}`, { headers: { jwt: jwt }} )
                                            .then(response => notify(`Declined Circle ${circle.name}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(removeCircleInvite(id)) : setCircleInviteList(list => list.filter(circle => circle.circleID !== id))))
                                            .catch((error) => processAJAXError(error)),
                                    }))
                        ], 
                        [ /* Pending Leader Acceptance | Leader Accept Invite | Leader Search */
                            new SearchListKey({displayTitle:'Pending Circles', searchType: userHasAnyRole([RoleEnum.CIRCLE_LEADER]) ? SearchType.CIRCLE : SearchType.NONE,
                                onSearchClick: (id:number) => redirectToCircle(id),
                                searchPrimaryButtonText: 'Invite', 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${id}/client/${editingUserID}/invite`, {}, { headers: { jwt: jwt }} )
                                        .then((response:{ data:CircleListItem }) => notify('Invite Sent', ToastStyle.SUCCESS, () => setCircleInviteList(list => [item as CircleListItem, ...list])))
                                        .catch((error) => processAJAXError(error)),
                                }),

                            [...circleRequestList].map((circle:CircleListItem) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE, displayItem: circle, 
                                onClick: (id:number) => redirectToCircle(id),
                                primaryButtonText: userHasAnyRole([RoleEnum.ADMIN, RoleEnum.CIRCLE_LEADER]) ? 'Accept' : '', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${id}/client/${editingUserID}/accept`, { headers: { jwt: jwt }} )
                                        .then((response:{ data: CircleListItem }) => notify(`Joined Circle ${circle.name}`, ToastStyle.SUCCESS, () => setMemberCircleList(list => [circle, ...list])))
                                        .catch((error) => processAJAXError(error)),

                                alternativeButtonText: 'Decline', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}${
                                            userHasAnyRole([RoleEnum.ADMIN, RoleEnum.CIRCLE_LEADER]) ? `/api/leader/circle/${id}/client/${editingUserID}/leave` : `/api/circle/${id}/leave`}`, { headers: { jwt: jwt }} )
                                            .then(response => notify(`Declined Circle ${circle.name}`, ToastStyle.SUCCESS, () => (editingUserID === userID) ? dispatch(removeCircleInvite(id)) : setCircleInviteList(list => list.filter(circle => circle.circleID !== id))))
                                            .catch((error) => processAJAXError(error)),
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
                <div key={'UserEdit-confirmDelete-'+editingUserID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>navigate(`/portal/edit/profile/${editingUserID}`)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()} >
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('firstName')} {getInputField('lastName')}</h1>
                            <span>
                                <label className='title id-left'>{getInputField('displayName')}</label>
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingUserID}</label>}
                            </span>
                        </div>
                        <ProfileImage className='form-header-image' src={image} />
                        <h2>Delete Profile?</h2>

                        {makeDisplayList(Array.from((getInputField('userRoleTokenList') as Map<string,string>)?.keys() || [])).map((role) =>
                            <label key={role}>{`+ ${role} Role`}</label>
                        )}
                        <hr/>
                        {(memberCircleList.length > 0) && <label >{`+ ${memberCircleList.length} Memberships`}</label>}
                        {(partnerList.length > 0) && <label >{`+ ${partnerList.length} Partnerships`}</label>}
                        {(prayerRequestList.length > 0) && <label >{`+ ${prayerRequestList.length} Prayer Requests`}</label>}
        
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={()=>navigate(`/portal/edit/profile/${editingUserID}`)}>Cancel</button>
                    </div>
                </div>}

                {newPartner && (
                    <>
                        {userRole === RoleEnum.ADMIN ? (
                            <PartnershipStatusADMIN
                                key={`User-Edit-Partnership-${editingUserID}-${newPartner.userID}-ADMIN`}
                                user={({userID: editingUserID, image: image, displayName: getInputField('displayName'), firstName: getInputField('firstName')})}
                                partner={newPartner}
                                currentStatus={newPartner.status}
                                onCancel={() => setNewPartner(undefined)}
                            />
                        ) : (
                            <PartnershipContract
                                key={`User-Edit-Partnership-${editingUserID}-${newPartner.userID}-Contract`}
                                partner={newPartner}
                                onAcceptCallback={() => setNewPartner(undefined)}
                                onDeclineCallback={() => setNewPartner(undefined)}
                            />
                        )}
                    </>
                )}

                {(showImageUpload) &&
                    <ImageUpload
                        key={'profile-image-'+editingUserID}
                        title='Upload Profile Image'
                        imageStyle='profile-image'
                        currentImage={ image }
                        defaultImage={ ImageDefaultEnum.PROFILE }
                        onCancel={() => navigate(`/portal/edit/profile/${editingUserID}`)}
                        onClear={()=>axios.delete(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}/image`, { headers: { jwt: jwt }} )
                            .then(response => {
                                navigate(`/portal/edit/profile/${editingUserID}`);
                                setImage(undefined);
                                notify(`Profile Image Deleted`, ToastStyle.SUCCESS, () => (editingUserID === userID) && dispatch(updateProfileImage(undefined)))})
                            .catch((error) => processAJAXError(error))}
                        onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${editingUserID}/image/${imageFile.name}`, imageFile, { headers: { 'jwt': jwt, 'Content-Type': imageFile.type }} )
                            .then(response => {
                                navigate(`/portal/edit/profile/${editingUserID}`);
                                setImage(response.data);
                                notify(`Profile Image Uploaded`, ToastStyle.SUCCESS, () => (editingUserID === userID) && dispatch(updateProfileImage(response.data)))})
                            .catch((error) => processAJAXError(error))}
                    />
                }
        </div>
    );
}

export default UserEditPage;
