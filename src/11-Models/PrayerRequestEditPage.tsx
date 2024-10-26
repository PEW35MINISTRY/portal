import axios from 'axios';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem, PrayerRequestPatchRequestBody, PrayerRequestResponseBody } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { PartnerListItem, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { CircleStatusEnum } from '../0-Assets/field-sync/input-config-sync/circle-field-config';
import InputField, { checkFieldName, ENVIRONMENT_TYPE } from '../0-Assets/field-sync/input-config-sync/inputField';
import { CREATE_PRAYER_REQUEST_FIELDS, EDIT_PRAYER_REQUEST_FIELDS, PRAYER_REQUEST_COMMENT_FIELDS, PRAYER_REQUEST_FIELDS_ADMIN } from '../0-Assets/field-sync/input-config-sync/prayer-request-field-config';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { assembleRequestBody, circleFilterUnique, makeDisplayText, userFilterUnique } from '../1-Utilities/utilities';
import { blueColor, ModelPopUpAction, PageState, ToastStyle } from '../100-App/app-types';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { DisplayItemType, ListItemTypesEnum, SearchType } from '../0-Assets/field-sync/input-config-sync/search-config';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { ImageDefaultEnum, ProfileImage } from '../2-Widgets/ImageWidgets';
import FullImagePage, { PageNotFound } from '../12-Features/Utility-Pages/FullImagePage';

import '../2-Widgets/Form/form.scss';


const PrayerRequestEditPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userProfileAccessList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const userPartnerList:PartnerListItem[] = useAppSelector((state) => state.account.userProfile.partnerList) || [];
    const userDisplayName:string = useAppSelector((state) => state.account.userProfile.displayName);
    const userProfile:ProfileResponse = useAppSelector((state) => state.account.userProfile);
    const userCircleList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleList) || [];
    const userContactList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.contactList) || [];
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [requestorProfile, setRequestorProfile] = useState<ProfileListItem>(); //Prayer Request Author

    const [editingPrayerRequestID, setEditingPrayerRequestID] = useState<number>(-1);
    const [searchUserID, setSearchUserID] = useState<number>(userID);
    const [viewState, setViewState] = useState<PageState>(PageState.LOADING);
    const [popUpAction, setPopUpAction] = useState<ModelPopUpAction>(ModelPopUpAction.NONE);
    const SUPPORTED_POP_UP_ACTIONS:ModelPopUpAction[] = [ModelPopUpAction.COMMENT, ModelPopUpAction.DELETE, ModelPopUpAction.NONE];

    //SearchList Cache
    const [ownedPrayerRequestList, setOwnedPrayerRequestList] = useState<PrayerRequestListItem[]>([]);
    const [ownedResolvedPrayerRequestList, setOwnedResolvedPrayerRequestList] = useState<PrayerRequestListItem[]>([]);
    const [userRecipientList, setUserRecipientList] = useState<ProfileListItem[]>([]);
    const [circleRecipientList, setCircleRecipientList] = useState<CircleListItem[]>([]);
    const [commentList, setCommentList] = useState<PrayerRequestCommentListItem[]>([]);
    const [defaultDisplayTitleList, setDefaultDisplayTitleList] = useState<string[]>(['Prayer Requests'])

    //Recipient Edit Lists
    const [addUserRecipientIDList, setAddUserRecipientIDList] = useState<number[]>([]);
    const [removeUserRecipientIDList, setRemoveUserRecipientIDList] = useState<number[]>([]);
    const [addCircleRecipientIDList, setAddCircleRecipientIDList] = useState<number[]>([]);
    const [removeCircleRecipientIDList, setRemoveCircleRecipientIDList] = useState<number[]>([]);


    /* Checks Logged in User */
    const userHasAnyRole = (roleList: RoleEnum[]):boolean =>
        (!userRoleList || userRoleList.length === 0) ? 
            roleList.includes(RoleEnum.USER)
        : roleList.some(role => userRoleList.some((userRole:RoleEnum) => userRole === role));


    /* Search for Prayer Request by user/requestor */
    useEffect(() => {
        if(searchUserID <= 0)
            return;
        
        //Must Fetch by user, since can't search prayer requests
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${searchUserID}/prayer-request-list`, { headers: { jwt: jwt }})
            .then(response => {
                const resultList:PrayerRequestListItem[] = Array.from(response.data || []);
                setOwnedPrayerRequestList(resultList);
                if(resultList.length === 0) notify('Make Your First Prayer Request!', ToastStyle.INFO);
            }).catch((error) => processAJAXError(error));

        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${searchUserID}/prayer-request-resolved-list`, { headers: { jwt: jwt }})
            .then(response => {
                const resultList:PrayerRequestListItem[] = Array.from(response.data || []);
                setOwnedResolvedPrayerRequestList(resultList);
            }).catch((error) => processAJAXError(error));
        
    }, [searchUserID]);


    //Triggers | (delays fetchPrayerRequest until after Redux auto login)
    useEffect(() => {
        if(userID <= 0 || jwt.length === 0) return;

        if(userID > 0) {
            setSearchUserID(userID);
            setRequestorProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });
        }
        
        let targetID:number = parseInt(id as string);
        let targetPath:string = location.pathname;
        let targetView:PageState = viewState;
        let targetAction:ModelPopUpAction = popUpAction;

        //New Prayer Request
        if(isNaN(targetID)) {
            targetID = -1;
            targetPath = `/portal/edit/prayer-request/new`;
            targetView = PageState.NEW;
            targetAction = ModelPopUpAction.NONE;

        //Edit Specific Prayer Request
        } else if(targetID > 0) {            
            targetAction = SUPPORTED_POP_UP_ACTIONS.includes(action?.toLowerCase() as ModelPopUpAction)
                ? (action?.toLowerCase() as ModelPopUpAction)
                : ModelPopUpAction.NONE;
            targetPath = `/portal/edit/prayer-request/${targetID}${targetAction.length > 0 ? `/${targetAction}` : ''}`;

        //Redirect to First Prayer Request if applicable
        } else if(targetID < 1 && ownedPrayerRequestList.length > 0) {
            targetID = ownedPrayerRequestList[0].prayerRequestID;
            targetPath = `/portal/edit/prayer-request/${targetID}`;
            targetAction = ModelPopUpAction.NONE;

        } else if(targetID < 1 && ownedPrayerRequestList.length == 0) {
            targetID = -1;
            targetPath = `/portal/edit/prayer-request/new`;
            targetView = PageState.NEW;
            targetAction = ModelPopUpAction.NONE;
        } 

        //Limit State Updates
        if(targetID !== editingPrayerRequestID) setEditingPrayerRequestID(targetID);
        if(targetPath !== location.pathname) navigate(targetPath);
        if(targetView !== viewState) setViewState(targetView);
        if(targetAction !== popUpAction) setPopUpAction(targetAction);

        //Set relevant fields
        if(userHasAnyRole([RoleEnum.ADMIN]))
            setEDIT_FIELDS(PRAYER_REQUEST_FIELDS_ADMIN);
        else if(targetView === PageState.NEW)
            setEDIT_FIELDS(CREATE_PRAYER_REQUEST_FIELDS);
        else
            setEDIT_FIELDS(EDIT_PRAYER_REQUEST_FIELDS);

    }, [jwt, id, (editingPrayerRequestID < 1 && ownedPrayerRequestList.length > 0)]);


    const updatePopUpAction = (newAction:ModelPopUpAction) => {
        if(SUPPORTED_POP_UP_ACTIONS.includes(newAction) && popUpAction !== newAction) {
            navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}${newAction.length > 0 ? `/${newAction}` : ''}`, {replace: true});
            setPopUpAction(newAction);
        }
    }
            

    /*******************************************
     *   RETRIEVE Prayer Request BEING EDITED
     * *****************************************/
    useEffect(() => { 
        if(editingPrayerRequestID > 0) {
            setViewState(PageState.LOADING);
            navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}/${action || ''}`, {replace: true});
            fetchPrayerRequest(editingPrayerRequestID); 

        } else { //(id === -1)
            setRequestorProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });
            setInputMap(new Map());
            setCommentList([]);
            setUserRecipientList([]);
            setCircleRecipientList([]);
            setAddUserRecipientIDList([]);
            setRemoveUserRecipientIDList([]);
            setAddCircleRecipientIDList([]);
            setRemoveCircleRecipientIDList([]);
            updatePopUpAction(ModelPopUpAction.NONE);
        }
    }, [editingPrayerRequestID]);

    const fetchPrayerRequest = (fetchPrayerRequestID:string|number) => 
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${fetchPrayerRequestID}`,{headers: { jwt: jwt }})
            .then(response => {
                const fields:PrayerRequestResponseBody = response.data;
                const valueMap:Map<string, any> = new Map([['prayerRequestID', fields.prayerRequestID]]);
                //Clear Lists, not returned if empty
                setCommentList([]);
                setUserRecipientList([]);
                setCircleRecipientList([]);

                [...Object.entries(fields)].forEach(([field, value]) => {
                    if(field === 'commentList') {
                        setCommentList([...value]);
                        setDefaultDisplayTitleList(([...value].length > 0) ? ['Comments'] : ['Prayer Requests']);

                    } else if(field === 'userRecipientList') {
                        setUserRecipientList([...value]);

                    } else if(field === 'circleRecipientList') {
                        setCircleRecipientList([...value]);

                    } else if(field === 'requestorProfile') {
                        setRequestorProfile(value);

                    } else if(field === 'requestorID') {
                        setSearchUserID(value);
                        valueMap.set('requestorID', value);

                    } else if(checkFieldName(EDIT_FIELDS, field))
                        valueMap.set(field, value);

                    else if(process.env.REACT_APP_ENVIRONMENT === ENVIRONMENT_TYPE.DEVELOPMENT)  
                        console.log(`EditPrayerRequest-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));
                setAddUserRecipientIDList([]);
                setRemoveUserRecipientIDList([]);
                setAddCircleRecipientIDList([]);
                setRemoveCircleRecipientIDList([]);
                setViewState(PageState.VIEW);
            })
            .catch((error) => { processAJAXError(error); setViewState(PageState.NOT_FOUND); });

    /*******************************************
     *  SAVE PRAYER REQUEST CHANGES TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makeEditRequest = async(resultMap:Map<string, string> = inputMap) => {
        const requestBody:PrayerRequestPatchRequestBody = assembleRequestBody(resultMap) as PrayerRequestPatchRequestBody;

        if(addUserRecipientIDList.length > 0) requestBody['addUserRecipientIDList'] = addUserRecipientIDList;
        if(removeUserRecipientIDList.length > 0) requestBody['removeUserRecipientIDList'] = removeUserRecipientIDList;
        if(addCircleRecipientIDList.length > 0) requestBody['addCircleRecipientIDList'] = addCircleRecipientIDList;
        if(removeCircleRecipientIDList.length > 0) requestBody['removeCircleRecipientIDList'] = removeCircleRecipientIDList;

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${editingPrayerRequestID}`, requestBody, { headers: { jwt: jwt }})
            .then((response:{ data:PrayerRequestResponseBody }) => notify(`Prayer Request Saved`, ToastStyle.SUCCESS, () => {
                setAddUserRecipientIDList([]);
                setRemoveUserRecipientIDList([]);
                setAddCircleRecipientIDList([]);
                setRemoveCircleRecipientIDList([]);
                setDefaultDisplayTitleList(['Prayer Requests']);
            }))
            .catch((error) => processAJAXError(error));
    }

    
    /*******************************************
     *  SAVE NEW PRAYER REQUEST TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makePostRequest = async(resultMap:Map<string, string> = inputMap) => {
        const requestBody:PrayerRequestPatchRequestBody = assembleRequestBody(resultMap) as PrayerRequestPatchRequestBody;

        if(addUserRecipientIDList.length > 0) requestBody['addUserRecipientIDList'] = addUserRecipientIDList;
        if(addCircleRecipientIDList.length > 0) requestBody['addCircleRecipientIDList'] = addCircleRecipientIDList;

        if(addUserRecipientIDList.length + addCircleRecipientIDList.length === 0) {
            notify('Please Select Recipients', ToastStyle.ERROR);
            return;
        }

        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request`, requestBody, {headers: { jwt: jwt }})
            .then((response:{ data:PrayerRequestResponseBody }) => {
                notify(`Prayer Request Created`, ToastStyle.SUCCESS);
                navigate(`/portal/edit/prayer-request/${response.data.prayerRequestID}`);
                setDefaultDisplayTitleList(['Prayer Requests']);
            }).catch((error) => { processAJAXError(error); });
    }
    
    
    /*******************************************
     *         DELETE PRAYER REQUEST
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${editingPrayerRequestID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted Prayer Request`, ToastStyle.SUCCESS);
                navigate('/portal/edit/prayer-request/-1');
            }).catch((error) => processAJAXError(error));
    

    /*******************************************
     *     SAVE NEW PRAYER REQUEST COMMENT
     * *****************************************/
    const makePrayerCommentRequest = async(announcementInputMap:Map<string, any>) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${editingPrayerRequestID}/comment`, assembleRequestBody(announcementInputMap), {headers: { jwt: jwt }})
            .then(response => {
                notify('Comment Posted', ToastStyle.SUCCESS);
                updatePopUpAction(ModelPopUpAction.NONE);
                setDefaultDisplayTitleList(['Comments']);
                setCommentList(current => [{commentID: -1, prayerRequestID: editingPrayerRequestID, commenterProfile: userProfile, message: announcementInputMap.get('message') || '', likeCount: 0}, ...current])
            })
            .catch((error) => { processAJAXError(error); });

            
    /***********************************
     *   Handle Recipient Change Lists
     * *********************************/
    const isUserRecipient = (id:number):boolean => (userRecipientList.map(profile => profile.userID).includes(id) || addUserRecipientIDList.includes(id)) && !removeUserRecipientIDList.includes(id);
    const isCircleRecipient = (id:number):boolean => (circleRecipientList.map(circle => circle.circleID).includes(id) || addCircleRecipientIDList.includes(id)) && !removeCircleRecipientIDList.includes(id);

    //Pending Change adding or removing
    const isUserRecipientPending = (id:number):boolean => addUserRecipientIDList.includes(id) || removeUserRecipientIDList.includes(id);
    const isCircleRecipientPending = (id:number):boolean => addCircleRecipientIDList.includes(id) || removeCircleRecipientIDList.includes(id);
    
    //Handlers & prevent lists conflicts
    const shareUser = (id:number):void => { 
        if(removeUserRecipientIDList.includes(id)) removeUserRecipientIDList.splice(removeUserRecipientIDList.indexOf(id), 1);
        setAddUserRecipientIDList(current => [...new Set([...current, id])]);
        setDefaultDisplayTitleList(['Profiles']);
    }
    const removeUser = (id:number):void => { 
        if(addUserRecipientIDList.includes(id)) addUserRecipientIDList.splice(addUserRecipientIDList.indexOf(id), 1);
        setRemoveUserRecipientIDList(current => [...new Set([...current, id])]);
        setDefaultDisplayTitleList(['Profiles']);  
    }
    const shareCircle = (id:number):void => { 
        if(removeCircleRecipientIDList.includes(id)) removeCircleRecipientIDList.splice(removeCircleRecipientIDList.indexOf(id), 1);
        setAddCircleRecipientIDList(current => [...new Set([...current, id])]);  
        setDefaultDisplayTitleList(['Circles']);
    }
    const removeCircle = (id:number):void => { 
        if(addCircleRecipientIDList.includes(id)) addCircleRecipientIDList.splice(addCircleRecipientIDList.indexOf(id), 1);
        setRemoveCircleRecipientIDList(current => [...new Set([...current, id])]);
        setDefaultDisplayTitleList(['Circles']);
    }

    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => inputMap.get(field) ?? EDIT_FIELDS.find(f => f.field === field)?.value;

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));
   
    useEffect(()=>{if(requestorProfile !== undefined && requestorProfile.userID !== getInputField('requestorID')) setInputField('requestorID', requestorProfile.userID);}, [requestorProfile]);

    
    /*****************************
     * REDIRECT LINKED UTILITIES *
     *****************************/
    const redirectToProfile = (redirectUserID:number):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) || userProfileAccessList.map((profile:ProfileListItem) => profile.userID).includes(redirectUserID)) 
            navigate(`/portal/edit/profile/${redirectUserID}`);
        else if(userPartnerList.map((partner:PartnerListItem) => partner.userID).includes(redirectUserID))
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


    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-prayer-request'  className='form-page'>

        {(viewState === PageState.LOADING) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} backgroundColor='transparent' message='Loading...' messageColor={blueColor}
                                                            alternativeButtonText={'New Prayer Request'} onAlternativeButtonClick={()=>navigate('/portal/edit/prayer-request/new')} />
           : (viewState === PageState.NOT_FOUND) ? <PageNotFound primaryButtonText={'New Prayer Request'} onPrimaryButtonClick={()=>navigate('/portal/edit/prayer-request/new')} />
           : <></>
        }

        {[PageState.NEW, PageState.VIEW].includes(viewState) &&   
            <FormInput
                key={editingPrayerRequestID}
                getIDField={()=>({modelIDField: 'prayerRequestID', modelID: editingPrayerRequestID})}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingPrayerRequestID > 0) ? 'Save Changes' : 'Create Prayer Request'}              
                onSubmitCallback={(editingPrayerRequestID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingPrayerRequestID > 0) ? 'Delete Prayer Request' : undefined}
                onAlternativeCallback={() => updatePopUpAction(ModelPopUpAction.DELETE)}
                headerChildren={[
                    <div key='prayer-request-header' className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic') || 'New Prayer Request'}</h1>
                            <span>
                                {((userRecipientList.length + circleRecipientList.length) > 0) && <label className='title id-left'>{(userRecipientList.length + circleRecipientList.length)} Recipients</label>}
                                {(commentList.length > 0) && <label className='title id-left'>{commentList.length} Comments</label>}
                                {((getInputField('prayerCount') as number) > 0) && <label className='title id-left'>{getInputField('prayerCount')} Prayers</label>}
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingPrayerRequestID}</label>}
                            </span>
                            <span className='right-align'>
                                {requestorProfile && <ProfileImage className='leader-profile-image' src={requestorProfile.image} />}
                                {requestorProfile && <label className='title'>{requestorProfile.displayName}</label>}
                                {(requestorProfile && userRole === RoleEnum.ADMIN) && <label className='id-left'>#{requestorProfile.userID}</label>}
                            </span>
                        </div>
                        <div className='form-header-horizontal'>
                            {(editingPrayerRequestID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => updatePopUpAction(ModelPopUpAction.COMMENT)}>New Comment</button>}
                        </div>
                        {(editingPrayerRequestID > 0) && <h2 className='sub-header'>Edit Details</h2>}
                    </div>]}
            />}

            <SearchList
                key={'PrayerRequestEdit-'+editingPrayerRequestID+defaultDisplayTitleList[0]}
                defaultDisplayTitleKeySearch={userProfileAccessList.length <= 0 ? undefined : defaultDisplayTitleList.includes('Profiles') ? 'Profiles' : 'Circles'}
                defaultDisplayTitleList={defaultDisplayTitleList}
                displayMap={new Map([
                        [
                            new SearchListKey({displayTitle:'Prayer Requests'}),
                            [...ownedPrayerRequestList].map((prayerRequest) => new SearchListValue({displayType: ListItemTypesEnum.PRAYER_REQUEST, displayItem: prayerRequest, 
                                onClick: (id:number)=>setEditingPrayerRequestID(id),
                                primaryButtonText: 'Prayed', onPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${id}/like`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify('Prayed', ToastStyle.SUCCESS, () => setOwnedPrayerRequestList(current => [...current].map(prayerRequest => 
                                            (prayerRequest.prayerRequestID === id) ? ({...prayerRequest, prayerCount: prayerRequest.prayerCount + 1}) : prayerRequest))))
                                        .catch((error) => processAJAXError(error)),  
                                alternativeButtonText: 'Delete', onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${id}`, { headers: { jwt: jwt }} )
                                        .then(response => notify('Prayer Request Deleted', ToastStyle.SUCCESS, () => {
                                            setOwnedPrayerRequestList(current => current.filter(prayerRequest => prayerRequest.prayerRequestID !== id));
                                        }))
                                        .catch((error) => processAJAXError(error)),
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Comments'}),
                            [...commentList].map((comment) => new SearchListValue({displayType: ListItemTypesEnum.PRAYER_REQUEST_COMMENT, displayItem: comment, 
                                primaryButtonText: (comment.commentID > 0) ? 'Like' : undefined, onPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${editingPrayerRequestID}/comment/${id}/like`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify('Comment Liked', ToastStyle.SUCCESS, () => setCommentList(current => [...current].map(comment => 
                                            (comment.commentID === id) ? ({...comment, likeCount: comment.likeCount + 1}) : comment))))
                                        .catch((error) => processAJAXError(error)),  
                                alternativeButtonText: (comment.commentID > 0) ? 'Delete' : undefined, onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${editingPrayerRequestID}/comment/${id}`, { headers: { jwt: jwt }} )
                                        .then(response => notify('Comment Deleted', ToastStyle.SUCCESS, () => {
                                            setCommentList(current => current.filter(comment => comment.commentID !== id));
                                        }))
                                        .catch((error) => processAJAXError(error)),                   
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Shared Contacts', searchType: (userRole === RoleEnum.ADMIN) ? SearchType.USER : SearchType.CONTACT,
                                onSearchClick: (id:number, item:DisplayItemType)=> {
                                    setSearchUserID(id);
                                    // setRequestorProfile(item as ProfileListItem);
                                },
                                searchPrimaryButtonText: (editingPrayerRequestID <= 0) ? undefined : 'Share', 
                                onSearchPrimaryButtonCallback: (id:number) => shareUser(id),
                                searchAlternativeButtonText: 'View Profile',
                                onSearchAlternativeButtonCallback: (id:number) => redirectToProfile(id)
                            }),

                            userFilterUnique([...userRecipientList, ...userContactList, ...userProfileAccessList]).map((user) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: user, 
                                onClick: (id:number)=>(userProfileAccessList.map(user => user.userID).includes(id) || userRole === RoleEnum.ADMIN) ? setSearchUserID(id) : undefined,
                                primaryButtonText: (isUserRecipientPending(user.userID)) ? undefined : isUserRecipient(user.userID) ? 'Remove' : 'Share', onPrimaryButtonCallback: (id:number) => isUserRecipient(id) ? removeUser(id) : shareUser(id),                         
                                alternativeButtonText: isUserRecipientPending(user.userID) ? 'Pending' : undefined,                         
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Shared Circles', searchType:SearchType.CIRCLE, searchFilter: userHasAnyRole([RoleEnum.ADMIN]) ? undefined : CircleStatusEnum.MEMBER,
                                searchPrimaryButtonText: 'Share', 
                                onSearchPrimaryButtonCallback: (id:number) => shareCircle(id),
                                searchAlternativeButtonText: 'View Circle',
                                onSearchAlternativeButtonCallback: (id:number) => redirectToCircle(id)                            
                            }),

                            (circleFilterUnique([...circleRecipientList, ...userCircleList])).map((circle) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE, displayItem: circle, 
                                primaryButtonText: (isCircleRecipientPending(circle.circleID)) ? undefined : isCircleRecipient(circle.circleID) ? 'Remove' : 'Share', onPrimaryButtonCallback: (id:number) => isCircleRecipient(id) ? removeCircle(id) : shareCircle(id),                         
                                alternativeButtonText: isCircleRecipientPending(circle.circleID) ? 'Pending' : undefined,   
                            }))
                        ],  
                        [
                            new SearchListKey({displayTitle:'Resolved Prayer Requests'}),
                            [...ownedResolvedPrayerRequestList].map((prayerRequest) => new SearchListValue({displayType: ListItemTypesEnum.PRAYER_REQUEST, displayItem: prayerRequest, 
                                onClick: (id:number)=>setEditingPrayerRequestID(id),
                                primaryButtonText: 'Delete', onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${id}`, { headers: { jwt: jwt }} )
                                        .then(response => notify('Prayer Request Deleted', ToastStyle.SUCCESS, () => {
                                            setOwnedResolvedPrayerRequestList(current => current.filter(prayerRequest => prayerRequest.prayerRequestID !== id));
                                        }))
                                        .catch((error) => processAJAXError(error)),
                            }))
                        ], 
                    ])}
            />

            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.COMMENT) && (editingPrayerRequestID > 0) &&
                <PrayerRequestCommentPage 
                    key={'PrayerRequestEdit-comment-'+editingPrayerRequestID}
                    onSaveCallback={makePrayerCommentRequest}
                    onCancelCallback={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />}

            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.DELETE) &&
                <div key={'PrayerRequestEdit-confirmDelete-'+editingPrayerRequestID} id='confirm-delete' className='center-absolute-wrapper' onClick={() => updatePopUpAction(ModelPopUpAction.NONE)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic')}</h1>
                            <span>
                                <h1 className='name'>{getInputField('topic')}</h1>
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingPrayerRequestID}</label>}
                            </span>
                            { requestorProfile &&
                                <span className='right-align'>
                                    <ProfileImage className='leader-profile-image' src={requestorProfile.image} />
                                    <label className='title'>{requestorProfile.displayName}</label>
                                    {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{requestorProfile.userID}</label>}
                                </span>}
                        </div>
                        <p className='id' >{getInputField('description')}</p>
                        <label >{`-> ${(getInputField('isResolved') as boolean) ? 'Answered' : 'Waiting'}`}</label>
                        <label >{`-> ${(getInputField('isOnGoing') as boolean) ? 'Long Term' : 'Temporary'}`}</label>
                        {Array.from((getInputField('tagList') as string[]) || []).map((tag, index) =>
                            <label key={'tag'+index}>{`-> ${makeDisplayText(tag)}`}</label>
                        )}
                        <hr/>
                        <h2>Delete Prayer Request?</h2>

                        {(commentList.length > 0) && <label >{`+ ${commentList.length} Comments`}</label>}
                        {(circleRecipientList.length > 0) && <label >{`+ ${circleRecipientList.length} Circle Recipients`}</label>}
                        {(userRecipientList.length > 0) && <label >{`+ ${userRecipientList.length} User Recipients`}</label>}
                        {(getInputField('prayerCount')) && <label >{`+ ${getInputField('prayerCount') || 0} Prayers`}</label>}
        
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={() => updatePopUpAction(ModelPopUpAction.NONE)}>Cancel</button>
                    </div>
                </div>}
        </div>
    );
}

export default PrayerRequestEditPage;



/***********************************************
 *   CREATE NEW COMMENT POP-UP PAGE COMPONENT
 * *********************************************/
const PrayerRequestCommentPage = ({...props}:{key:any, onSaveCallback:(commentInputMap:Map<string, any>) => void, onCancelCallback:() => void}) => {
    const [commentInputMap, setCommentInputMap] = useState<Map<string, any>>(new Map());

    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => commentInputMap.get(field);

    const setInputField = (field:string, value:any):void => setCommentInputMap(map => new Map(map.set(field, value)));

    return (
        <div key={props.key} id='prayer-request-comment-page' className='center-absolute-wrapper' onClick={props.onCancelCallback}>

            <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                <h2>Create Prayer Request Comment</h2>

                <FormInput
                    key={'PRAYER-REQUEST-COMMENT'+props.key}
                    getIDField={()=>({modelIDField: 'commentID', modelID: -1})}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={PRAYER_REQUEST_COMMENT_FIELDS}
                    onSubmitText='Save Comment'              
                    onSubmitCallback={() => props.onSaveCallback(commentInputMap)}
                    onAlternativeText='Cancel'
                    onAlternativeCallback={() => props.onCancelCallback()}
                />
            </div>
        </div>
    );
}
