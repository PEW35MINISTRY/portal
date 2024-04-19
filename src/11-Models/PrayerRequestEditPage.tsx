import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem, PrayerRequestPatchRequestBody, PrayerRequestResponseBody } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { PartnerListItem, ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { CircleStatusEnum } from '../0-Assets/field-sync/input-config-sync/circle-field-config';
import InputField, { checkFieldName } from '../0-Assets/field-sync/input-config-sync/inputField';
import { CREATE_PRAYER_REQUEST_FIELDS, EDIT_PRAYER_REQUEST_FIELDS, PRAYER_REQUEST_COMMENT_FIELDS, PRAYER_REQUEST_FIELDS_ADMIN } from '../0-Assets/field-sync/input-config-sync/prayer-request-field-config';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector, useQuery } from '../1-Utilities/hooks';
import { assembleRequestBody, circleFilterUnique, makeDisplayText, userFilterUnique } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import { addPrayerRequest, removePrayerRequest } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { DisplayItemType, ListItemTypesEnum, SearchType } from '../0-Assets/field-sync/input-config-sync/search-config';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import PageNotFound from '../2-Widgets/NotFoundPage';

import '../2-Widgets/Form/form.scss';

//Assets
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';

const PrayerRequestEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userProfileAccessList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const userPartnerList:PartnerListItem[] = useAppSelector((state) => state.account.userProfile.partnerList) || [];
    const userDisplayName:string = useAppSelector((state) => state.account.userProfile.displayName);
    const userProfile:ProfileResponse = useAppSelector((state) => state.account.userProfile);
    const userCircleList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleList) || [];
    const userPrayerRequestList:PrayerRequestListItem[] = useAppSelector((state) => state.account.userProfile.prayerRequestList) || [];
    const userContactList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.contactList) || [];
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [requestorProfile, setRequestorProfile] = useState<ProfileListItem>(); //Prayer Request Author

    const [editingPrayerRequestID, setEditingPrayerRequestID] = useState<number>(-1);
    const [searchUserID, setSearchUserID] = useState<number>(userID);
    const [showNotFound, setShowNotFound] = useState<Boolean>(false);
    const [showNewComment, setShowNewComment] = useState<Boolean>(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);

    //SearchList Cache
    const [ownedPrayerRequestList, setOwnedPrayerRequestList] = useState<PrayerRequestListItem[]>([]);
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
            roleList.includes(RoleEnum.STUDENT)
        : roleList.some(role => userRoleList.some((userRole:RoleEnum) => userRole === role));


    /* Search for Prayer Request by user/requestor */
    useLayoutEffect (() => {
        if(searchUserID <= 0)
            return;
        
        //Get list of owned prayer requests
        if(searchUserID === userID)
            setOwnedPrayerRequestList(userPrayerRequestList);

        else  //Must Fetch by user, since can't search prayer requests
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${searchUserID}/prayer-request-list`, { headers: { jwt: jwt }})
                .then(response => {
                    const resultList:PrayerRequestListItem[] = Array.from(response.data || []);
                    setOwnedPrayerRequestList(resultList);
                    if(resultList.length === 0) notify('No Prayer Requests Found', ToastStyle.INFO);

                }).catch((error) => processAJAXError(error));
        
    }, [searchUserID]);


    //Triggers | (delays fetchPrayerRequest until after Redux auto login)
    useLayoutEffect(() => {
        if(userHasAnyRole([RoleEnum.ADMIN]))
            setEDIT_FIELDS(PRAYER_REQUEST_FIELDS_ADMIN);
        else if(editingPrayerRequestID === -1)
            setEDIT_FIELDS(CREATE_PRAYER_REQUEST_FIELDS);
        else
            setEDIT_FIELDS(EDIT_PRAYER_REQUEST_FIELDS);

        if(userID > 0) {
            setSearchUserID(userID);
            setRequestorProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });
        }
        
        //setEditingPrayerRequestID
        if(userID > 0 && jwt.length > 0) {
            if(isNaN(id as any)) { //new
                navigate(`/portal/edit/prayer-request/new`);
                setEditingPrayerRequestID(-1);

            } else if((ownedPrayerRequestList.length > 0) && (parseInt(id as string) < 1)) { //redirect to first circle
                navigate(`/portal/edit/prayer-request/${ownedPrayerRequestList[0].prayerRequestID}`);
                setEditingPrayerRequestID(ownedPrayerRequestList[0].prayerRequestID);

            } else if(parseInt(id as string) < 1) { //new
                navigate(`/portal/edit/prayer-request/new`);
                setEditingPrayerRequestID(-1);

            } else if(parseInt(id as string) > 0) //edit
                setEditingPrayerRequestID(parseInt(id as string));
        }

        /* Sync state change to URL action */
        setShowNotFound(false);
        setShowDeleteConfirmation(action === 'delete');
        setShowNewComment(action === 'comment');

    }, [jwt, userID, id, action, ownedPrayerRequestList]);

    useEffect(() => {
        if(showNotFound) {
            setShowDeleteConfirmation(false);
            setShowNewComment(false);
        }
    }, [showNotFound]);
            


    /*******************************************
     *   RETRIEVE Prayer Request BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        if(editingPrayerRequestID > 0) {
            navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}/${action || ''}`, {replace: (id.toString() === '-1')});
            fetchPrayerRequest(editingPrayerRequestID); 

        } else { //(id === -1)
            setRequestorProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });
            setEditingPrayerRequestID(-1);
            setInputMap(new Map());
            setCommentList([]);
            setUserRecipientList([]);
            setCircleRecipientList([]);
            setAddUserRecipientIDList([]);
            setRemoveUserRecipientIDList([]);
            setAddCircleRecipientIDList([]);
            setRemoveCircleRecipientIDList([]);
        }
    }, [editingPrayerRequestID, jwt]);

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
                    else    
                        console.log(`EditPrayerRequest-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));
                setAddUserRecipientIDList([]);
                setRemoveUserRecipientIDList([]);
                setAddCircleRecipientIDList([]);
                setRemoveCircleRecipientIDList([]);

            })
            .catch((error) => processAJAXError(error, () => setShowNotFound(true)));

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
            .then((response:{ data:PrayerRequestResponseBody }) =>
                notify(`Prayer Request Created`, ToastStyle.SUCCESS, () => {
                    setEditingPrayerRequestID(response.data.prayerRequestID);
                    setDefaultDisplayTitleList(['Prayer Requests']);
                    if(searchUserID === userID)
                        dispatch(addPrayerRequest({
                            prayerRequestID: response.data.prayerRequestID || -1,
                            requestorProfile: {userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image},
                            topic: response.data.topic || '',
                            tagList: response.data.tagList || [],
                            prayerCount: 0                
                        }));
                }))
            .catch((error) => { processAJAXError(error); });
    }
    
    
    /*******************************************
     *         DELETE PRAYER REQUEST
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${editingPrayerRequestID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted Prayer Request`, ToastStyle.SUCCESS, () => {
                    navigate('/portal/edit/prayer-request/-1');
                });
            }).catch((error) => processAJAXError(error));
    

    /*******************************************
     *     SAVE NEW PRAYER REQUEST COMMENT
     * *****************************************/
    const makePrayerCommentRequest = async(announcementInputMap:Map<string, any>) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${editingPrayerRequestID}/comment`, assembleRequestBody(announcementInputMap), {headers: { jwt: jwt }})
            .then(response => {
                notify('Comment Posted', ToastStyle.SUCCESS);
                navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}`);
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
    const getInputField = (field:string):any|undefined =>  inputMap.get(field);

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

        {showNotFound ?
           <PageNotFound primaryButtonText={'New Prayer Request'} onPrimaryButtonClick={()=>navigate('/portal/edit/prayer-request/new')} />
           
           : <FormInput
                key={editingPrayerRequestID}
                getIDField={()=>({modelIDField: 'prayerRequestID', modelID: editingPrayerRequestID})}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingPrayerRequestID > 0) ? 'Save Changes' : 'Create Prayer Request'}              
                onSubmitCallback={(editingPrayerRequestID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingPrayerRequestID > 0) ? 'Delete Prayer Request' : undefined}
                onAlternativeCallback={() => navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}/delete`)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic') || 'New Prayer Request'}</h1>
                            <span>
                                {((userRecipientList.length + circleRecipientList.length) > 0) && <label className='title id-left'>{(userRecipientList.length + circleRecipientList.length)} Recipients</label>}
                                {(commentList.length > 0) && <label className='title id-left'>{commentList.length} Comments</label>}
                                {((getInputField('prayerCount') as number) > 0) && <label className='title id-left'>{getInputField('prayerCount')} Prayers</label>}
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingPrayerRequestID}</label>}
                            </span>
                            <span className='right-align'>
                                {requestorProfile && <img className='leader-profile-image' src={requestorProfile.image || PROFILE_DEFAULT} alt={requestorProfile.displayName} />}
                                {requestorProfile && <label className='title'>{requestorProfile.displayName}</label>}
                                {(requestorProfile && userRole === RoleEnum.ADMIN) && <label className='id-left'>#{requestorProfile.userID}</label>}
                            </span>
                        </div>
                        <div className='form-header-horizontal'>
                            {(editingPrayerRequestID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}/comment`)}>New Comment</button>}
                        </div>
                        {(editingPrayerRequestID > 0) && <h2 className='sub-header'>Edit Details</h2>}
                    </div>}
            />
        }

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
                                            if(searchUserID === userID) dispatch(removePrayerRequest(id))}))
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
                            new SearchListKey({displayTitle:'Profiles', searchType: (userProfileAccessList.length > 0 || userRole === RoleEnum.ADMIN) ? SearchType.USER : SearchType.NONE,
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
                            new SearchListKey({displayTitle:'Circles', searchType:SearchType.CIRCLE, searchFilter: userHasAnyRole([RoleEnum.ADMIN]) ? undefined : CircleStatusEnum.MEMBER,
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
                    ])}
            />

            {(showNewComment && editingPrayerRequestID > 0) &&
                <PrayerRequestCommentPage 
                    key={'PrayerRequestEdit-comment-'+editingPrayerRequestID}
                    onSaveCallback={makePrayerCommentRequest}
                    onCancelCallback={()=>navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}`)}
                />}

            {(showDeleteConfirmation) &&
                <div key={'PrayerRequestEdit-confirmDelete-'+editingPrayerRequestID} id='confirm-delete' className='center-absolute-wrapper' onClick={() => navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}`)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic')}</h1>
                            <span>
                                <h1 className='name'>{getInputField('topic')}</h1>
                                {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingPrayerRequestID}</label>}
                            </span>
                            { requestorProfile &&
                                <span className='right-align'>
                                    <img className='leader-profile-image' src={requestorProfile?.image || PROFILE_DEFAULT} alt={requestorProfile.displayName} />
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
                        <button className='alternative-button'  type='button' onClick={() => navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}`)}>Cancel</button>
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
