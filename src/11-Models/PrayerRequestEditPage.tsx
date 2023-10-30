import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem, PrayerRequestPatchRequestBody, PrayerRequestResponseBody } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { CircleStatusEnum } from '../0-Assets/field-sync/input-config-sync/circle-field-config';
import InputField from '../0-Assets/field-sync/input-config-sync/inputField.js';
import { CREATE_PRAYER_REQUEST_FIELDS, EDIT_PRAYER_REQUEST_FIELDS, PRAYER_REQUEST_COMMENT_FIELDS, PRAYER_REQUEST_FIELDS_ADMIN } from '../0-Assets/field-sync/input-config-sync/prayer-request-field-config';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector, useQuery } from '../1-Utilities/hooks';
import { circleFilterUnique, makeDisplayText, userFilterUnique } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import { addPrayerRequest, removePrayerRequest } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';

import '../2-Widgets/Form/form.scss';

//Assets
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';

const PrayerRequestEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const userDisplayName:string = useAppSelector((state) => state.account.userProfile.displayName);
    const userProfile:ProfileResponse = useAppSelector((state) => state.account.userProfile);
    const userCircleList:CircleListItem[] = useAppSelector((state) => state.account.userProfile.circleList) || [];
    const userPrayerRequestList:PrayerRequestListItem[] = useAppSelector((state) => state.account.userProfile.prayerRequestList) || [];
    const userContactList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.contactList) || [];
    const userProfileAccessList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];

    const queryMap = useQuery();
    const { id = -1 } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [requestorProfile, setRequestorProfile] = useState<ProfileListItem>(); //Prayer Request Author

    const [editingPrayerRequestID, setEditingPrayerRequestID] = useState<number>(-1);
    const [searchUserID, setSearchUserID] = useState<number>(-1);
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


    //Triggers | (delays fetchProfile until after Redux auto login)
    useEffect(() => {
        setDefaultDisplayTitleList(commentList.length > 0 ? ['Comments'] : ['Prayer Requests']);
    },[commentList.length, editingPrayerRequestID]);
    
    useEffect(() => {
        setSearchUserID(userID);
    },[userID]);

    useLayoutEffect (() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(PRAYER_REQUEST_FIELDS_ADMIN);
        else if(editingPrayerRequestID === -1)
            setEDIT_FIELDS(CREATE_PRAYER_REQUEST_FIELDS);
        else
            setEDIT_FIELDS(EDIT_PRAYER_REQUEST_FIELDS);

        if(searchUserID <= 0)
            return;
        
        let prayerRequestList:PrayerRequestListItem[] = [];

        //Get list of owned prayer requests
        if(searchUserID === userID) {
            prayerRequestList = userPrayerRequestList || [];

            setRequestorProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });

        } else { //Must Fetch by user, since can't search prayer requests
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${searchUserID}/prayer-request-list`, { headers: { jwt: jwt }})
                .then(response => {
                    prayerRequestList = Array.from(response.data) || [];
                })
                .catch((error) => processAJAXError(error));

                //Preserve Existing (selected) requestor user
                setRequestorProfile(current => ({...(current || { userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image }), userID: searchUserID}));
        }

        //setOwnedPrayerRequestList
        if(prayerRequestList.length > 0)
            setOwnedPrayerRequestList(Array.from(prayerRequestList as PrayerRequestListItem[]));
        else 
            setOwnedPrayerRequestList([]);

        //setEditingPrayerRequestID
        if(isNaN(id as any) || prayerRequestList.length === 0) { //new
            setEditingPrayerRequestID(-1);
            setInputMap(new Map());
            setCommentList([]);

        } else //edit
            setEditingPrayerRequestID(prayerRequestList[0].prayerRequestID); //triggers fetchPrayerRequest

        },[searchUserID, id, userPrayerRequestList.length]);
            

    /*******************************************
     *   RETRIEVE Prayer Request BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        if(editingPrayerRequestID > 0) navigate(`/portal/edit/prayer-request/${editingPrayerRequestID}`); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
        if(editingPrayerRequestID > 0) fetchPrayerRequest(editingPrayerRequestID); }, [editingPrayerRequestID]);

    const fetchPrayerRequest = (fetchPrayerRequestID:string|number) => 
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${fetchPrayerRequestID}`,{headers: { jwt: jwt }})
            .then(response => {
                const fields:PrayerRequestResponseBody = response.data;
                const valueMap:Map<string, any> = new Map([['prayerRequestID', fields.prayerRequestID]]);

                [...Object.entries(fields)].forEach(([field, value]) => {
                    if(field === 'commentList') {
                        setCommentList([...value]);

                    } else if(field === 'userRecipientList') {
                        setUserRecipientList([...value]);

                    } else if(field === 'circleRecipientList') {
                        setCircleRecipientList([...value]);

                    } else if(field === 'requestorProfile') {
                        setRequestorProfile(value);

                    } else if(EDIT_FIELDS.some(f => f.field === field))
                        valueMap.set(field, value);
                    else    
                        console.log(`EditCircle-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));
                setAddUserRecipientIDList([]);
                setRemoveUserRecipientIDList([]);
                setAddCircleRecipientIDList([]);
                setRemoveCircleRecipientIDList([]);
            })
            .catch((error) => processAJAXError(error, () => navigate('/portal/edit/circle/-1')));

    /*******************************************
     *  SAVE PRAYER REQUEST CHANGES TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makeEditRequest = async(result?:Map<string,any>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:PrayerRequestPatchRequestBody = {} as PrayerRequestPatchRequestBody;
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        if(addUserRecipientIDList.length > 0) requestBody['addUserRecipientIDList'] = addUserRecipientIDList;
        if(removeUserRecipientIDList.length > 0) requestBody['removeUserRecipientIDList'] = removeUserRecipientIDList;
        if(addCircleRecipientIDList.length > 0) requestBody['addCircleRecipientIDList'] = addCircleRecipientIDList;
        if(removeCircleRecipientIDList.length > 0) requestBody['removeCircleRecipientIDList'] = removeCircleRecipientIDList;

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${editingPrayerRequestID}`, requestBody, { headers: { jwt: jwt }})
            .then(response => notify(`Prayer Request Saved`, ToastStyle.SUCCESS, () => {
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
    const makePostRequest = async(result?:Map<string, string>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:PrayerRequestPatchRequestBody = {} as PrayerRequestPatchRequestBody;
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        if(addUserRecipientIDList.length > 0) requestBody['addUserRecipientIDList'] = addUserRecipientIDList;
        if(addCircleRecipientIDList.length > 0) requestBody['addCircleRecipientIDList'] = addCircleRecipientIDList;

        if(addUserRecipientIDList.length + addCircleRecipientIDList.length === 0) {
            notify('Please Select Recipients', ToastStyle.ERROR);
            return;
        }

        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request`, requestBody, {headers: { jwt: jwt }})
            .then(response =>
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
     *         DELETE CIRCLE
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${editingPrayerRequestID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted Prayer Request`, ToastStyle.SUCCESS, () => {
                    setShowDeleteConfirmation(false);
                    navigate('/portal/edit/prayer-request/-1');
                });
            }).catch((error) => processAJAXError(error));
    

    /*******************************************
     *     SAVE NEW PRAYER REQUEST COMMENT
     * *****************************************/
    const makePrayerCommentRequest = async(announcementInputMap:Map<string, any>) => {
        const finalMap:Map<string,any> = announcementInputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody = {};
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request/${editingPrayerRequestID}/comment`, requestBody, {headers: { jwt: jwt }})
            .then(response => {
                notify('Comment Posted', ToastStyle.SUCCESS);
                setShowNewComment(false);
                setDefaultDisplayTitleList(['Comments']);
            })
            .catch((error) => { processAJAXError(error); });
    }

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

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-prayer-request'  className='form-page'>

            <FormInput
                key={editingPrayerRequestID}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingPrayerRequestID > 0) ? 'Save Changes' : 'Create Prayer Request'}              
                onSubmitCallback={(editingPrayerRequestID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingPrayerRequestID > 0) ? 'Delete Prayer Request' : undefined}
                onAlternativeCallback={()=>setShowDeleteConfirmation(true)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic') || 'New Prayer Request'}</h1>
                            <span>
                                {((userRecipientList.length + circleRecipientList.length) > 0) && <label className='title id-left'>{(userRecipientList.length + circleRecipientList.length)} Recipients</label>}
                                {(commentList.length > 0) && <label className='title id-left'>{commentList.length} Comments</label>}
                                {((getInputField('prayerCount') as number) > 0) && <label className='title id-left'>{getInputField('prayerCount')} Prayers</label>}
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingPrayerRequestID}</label>}
                            </span>
                            <span className='right-align'>
                                {requestorProfile && <img className='leader-profile-image' src={requestorProfile.image || PROFILE_DEFAULT} alt={requestorProfile.displayName} />}
                                {requestorProfile && <label className='title'>{requestorProfile.displayName}</label>}
                                {(requestorProfile && userRole === RoleEnum.ADMIN) && <label className='id-left'>#{requestorProfile.userID}</label>}
                            </span>
                        </div>
                        <div className='form-header-horizontal'>
                            {(editingPrayerRequestID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => setShowNewComment(true)}>New Comment</button>}
                        </div>
                        {(editingPrayerRequestID > 0) && <h2 className='sub-header'>Edit Details</h2>}
                    </div>}
            />

            {(showNewComment && editingPrayerRequestID > 0) &&
                <PrayerRequestCommentPage 
                    key={'PrayerRequestEdit-comment-'+editingPrayerRequestID}
                    onSaveCallback={makePrayerCommentRequest}
                    onCancelCallback={()=>setShowNewComment(false)}
                />}

            {(showDeleteConfirmation) &&
                <div key={'PrayerRequestEdit-confirmDelete-'+editingPrayerRequestID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>setShowDeleteConfirmation(false)}>

                    <div className='form-page-block center-absolute-inside'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{getInputField('topic')}</h1>
                            { requestorProfile &&
                                <span className='right-align'>
                                    <img className='leader-profile-image' src={requestorProfile?.image || PROFILE_DEFAULT} alt={requestorProfile.displayName} />
                                    <label className='title'>{requestorProfile.displayName}</label>
                                    {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{requestorProfile.userID}</label>}
                                </span>}
                        </div>
                        <p className='id' >{getInputField('description')}</p>
                        <label >{`-> ${(getInputField('isResolved') as boolean) ? 'Answered' : 'Waiting'}`}</label>
                        <label >{`-> ${(getInputField('isOnGoing') as boolean) ? 'Long Term' : 'Temporary'}`}</label>
                        {Array.from((getInputField('tagList') as string[]) || []).map((tag) =>
                            <label >{`-> ${makeDisplayText(tag)}`}</label>
                        )}
                        <hr/>
                        <h2>Delete Prayer Request?</h2>

                        {(commentList.length > 0) && <label >{`+ ${commentList.length} Comments`}</label>}
                        {(circleRecipientList.length > 0) && <label >{`+ ${circleRecipientList.length} Circle Recipients`}</label>}
                        {(userRecipientList.length > 0) && <label >{`+ ${userRecipientList.length} User Recipients`}</label>}
                        {(getInputField('prayerCount')) && <label >{`+ ${getInputField('prayerCount') || 0} Prayers`}</label>}
        
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={()=>setShowDeleteConfirmation(false)}>Cancel</button>
                    </div>
                </div>}
        </div>
    );

    return <div>Prayer Request Page Coming Soon</div>
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

    const onCancel = () => (event:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        if(props.onCancelCallback) props.onCancelCallback();
    }

    return (
        <div key={props.key} id='prayer-request-comment-page' className='center-absolute-wrapper' onClick={onCancel}>

            <div className='form-page-block center-absolute-inside'>
                <h2>Create Prayer Request Comment</h2>

                <FormInput
                    key={'PRAYER-REQUEST-COMMENT'+props.key}
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