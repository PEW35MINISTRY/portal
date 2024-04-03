import axios from 'axios';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleAnnouncementListItem, CircleEditRequestBody, CircleEventListItem, CircleLeaderResponse, CircleListItem, CircleResponse } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestListItem } from '../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { CIRCLE_ANNOUNCEMENT_FIELDS, CIRCLE_FIELDS, CIRCLE_FIELDS_ADMIN, CircleStatusEnum } from '../0-Assets/field-sync/input-config-sync/circle-field-config';
import InputField, { checkFieldName } from '../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { assembleRequestBody } from '../1-Utilities/utilities';
import { addCircle, removeCircle } from '../100-App/redux-store';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { DisplayItemType, ListItemTypesEnum, SearchType } from '../0-Assets/field-sync/input-config-sync/search-config';
import ImageUpload from '../2-Widgets/ImageUpload';

import '../2-Widgets/Form/form.scss';

//Assets
import CIRCLE_DEFAULT from '../0-Assets/circle-default.png';
import PROFILE_DEFAULT from '../0-Assets/profile-default.png';


const CircleEditPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt) || '';
    const userID:number = useAppSelector((state) => state.account.userID) || -1;
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole) || RoleEnum.STUDENT;
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userAccessProfileList:ProfileListItem[] = useAppSelector((state) => state.account.userProfile.profileAccessList) || [];
    const userDisplayName:string = useAppSelector((state) => state.account.userProfile.displayName) || '';
    const userProfile:ProfileResponse = useAppSelector((state) => state.account.userProfile) || {};
    const userLeaderCircleList:CircleListItem[] = (useAppSelector((state) => state.account.userProfile.circleList) || []).filter(circle => circle.status === CircleStatusEnum.LEADER);
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [image, setImage] = useState<string|undefined>(undefined); //Read Only
    const [leaderProfile, setLeaderProfile] = useState<ProfileListItem>();

    const [editingCircleID, setEditingCircleID] = useState<number>(-2);
    const [showAnnouncement, setShowAnnouncement] = useState<Boolean>(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);
    const [showImageUpload, setShowImageUpload] = useState<Boolean>(false);

    //SearchList Cache
    const [memberProfileList, setMemberProfileList] = useState<ProfileListItem[]>([]);
    const [requestProfileList, setRequestProfileList] = useState<ProfileListItem[]>([]);
    const [inviteProfileList, setInviteProfileList] = useState<ProfileListItem[]>([]);
    const [prayerRequestList, setPrayerRequestList] = useState<PrayerRequestListItem[]>([]);
    const [announcementList, setAnnouncementList] = useState<CircleAnnouncementListItem[]>([]);
    const [eventList, setEventList] = useState<CircleEventListItem[]>([]);


    /* Checks Logged in User */
    const userHasAnyRole = (roleList: RoleEnum[]):boolean =>
        (!userRoleList || userRoleList.length === 0) ? 
            roleList.includes(RoleEnum.STUDENT)
        : roleList.some(role => userRoleList.some((userRole:RoleEnum) => userRole === role));


    //Triggers | (delays fetchProfile until after Redux auto login)
    useLayoutEffect(() => {
        if(userHasAnyRole([RoleEnum.ADMIN]))
            setEDIT_FIELDS(CIRCLE_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(CIRCLE_FIELDS);

        //setEditingCircleID
        if(isNaN(id as any) || userLeaderCircleList.length === 0) { //new
            setEditingCircleID(-1);
            setInputMap(new Map());
            setImage(undefined)
            setLeaderProfile({ userID, displayName: userDisplayName, firstName: userProfile.firstName, image: userProfile.image });

        } else if(parseInt(id as string) < 1) //default on navigation
            setEditingCircleID(userLeaderCircleList[0].circleID); //triggers fetchCircle
        else //edit
            setEditingCircleID(parseInt(id as string)); //triggers fetchCircle

    }, [id, userLeaderCircleList.length]);


    /* Sync state change to URL action */
    useEffect(() => {
        if(showDeleteConfirmation) 
            navigate(`/portal/edit/circle/${editingCircleID}/delete`);
        else if(showAnnouncement) 
            navigate(`/portal/edit/circle/${editingCircleID}/announcement`);
        else if(showImageUpload) 
            navigate(`/portal/edit/circle/${editingCircleID}/image`);
        else 
            navigate(`/portal/edit/circle/${editingCircleID}`);

    }, [showDeleteConfirmation, showImageUpload]);
            

    /*******************************************
     *     RETRIEVE CIRCLE BEING EDITED
     * *****************************************/
    useLayoutEffect(() => { 
        if(editingCircleID > 0) navigate(`/portal/edit/circle/${editingCircleID}/${action || ''}`); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
        if(editingCircleID > 0) fetchCircle(editingCircleID); }, [editingCircleID]);


    const fetchCircle = (fetchCircleID:string|number) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${fetchCircleID}`, {headers: { jwt: jwt }})
        .then(response => {
            const fields:CircleResponse = response.data;
            const valueMap:Map<string, any> = new Map([['circleID', fields.circleID]]);
            //Clear Lists, not returned if empty
            setMemberProfileList([]);
            setRequestProfileList([]);
            setInviteProfileList([]);
            setPrayerRequestList([]);
            setAnnouncementList([]);
            setImage(undefined);

            [...Object.entries(fields)].forEach(([field, value]) => {
                if(field === 'memberList') {
                    setMemberProfileList([...value]); //TODO

                } else if(field === 'pendingRequestList') {
                    setRequestProfileList([...value]);

                } else if(field === 'pendingInviteList') {
                    setInviteProfileList([...value]);

                } else if(field === 'prayerRequestList') {
                    setPrayerRequestList([...value]);

                } else if(field === 'announcementList') {
                    setAnnouncementList([...value]);

                } else if(field === 'eventList') {
                    setEventList([...value]);

                } else if(field === 'leaderProfile') {
                    setLeaderProfile(value);

                } else if(field === 'image') {
                    setImage(value);
                    valueMap.set('image', value);

                } else if(checkFieldName(EDIT_FIELDS, field))
                    valueMap.set(field, value);
                else    
                    console.log(`EditCircle-skipping field: ${field}`, value);
            });
            setInputMap(new Map(valueMap));

            /* Update State based on sub route */
            if(action === 'delete') 
                setShowDeleteConfirmation(true);
            else if(action === 'announcement') 
                setShowAnnouncement(true);
            else if(action === 'image') 
                setShowImageUpload(true);
        })
        .catch((error) => processAJAXError(error, () => navigate('/portal/edit/circle/-1')));

    /*******************************************
     *      SAVE CIRCLE CHANGES TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makeEditRequest = async(resultMap:Map<string,any> = inputMap) =>
        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}`, assembleRequestBody(resultMap), { headers: { jwt: jwt }})
            .then(response => notify(`${response.data.name} Circle Saved`, ToastStyle.SUCCESS))
            .catch((error) => processAJAXError(error));


    /*******************************************
     *       SAVE NEW CIRCLE TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makePostRequest = async(resultMap:Map<string, string> = inputMap) => {
        const requestBody:CircleEditRequestBody = assembleRequestBody(resultMap) as CircleEditRequestBody;
        requestBody['leaderID'] = leaderProfile?.userID || userID;

        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle`, requestBody, {headers: { jwt: jwt }})
            .then((response:{ data:CircleLeaderResponse }) =>
                notify(`Circle Created`, ToastStyle.SUCCESS, () => {
                    setEditingCircleID(response.data.circleID);
                    navigate(`/portal/edit/circle/${response.data.circleID}/image`);
                    dispatch(addCircle({
                        circleID: response.data.circleID || -1,
                        name: response.data.name || '',
                        status: CircleStatusEnum.LEADER, 
                    }));
                }))
            .catch((error) => { processAJAXError(error); });
    }


    /*******************************************
     *         DELETE CIRCLE
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted circle ${editingCircleID}`, ToastStyle.SUCCESS, () => {
                    setShowDeleteConfirmation(false);
                    dispatch(removeCircle(editingCircleID));
                    navigate('/portal/edit/circle/-1');
                });
            }).catch((error) => processAJAXError(error));


    /*******************************************
     *     SAVE NEW CIRCLE ANNOUNCEMENT
     * *****************************************/
    const makeCircleAnnouncementRequest = async(announcementInputMap:Map<string, any>) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/announcement`, assembleRequestBody(announcementInputMap), {headers: { jwt: jwt }})
            .then(response => {
                notify('Announcement Sent', ToastStyle.SUCCESS, () => {
                    setShowAnnouncement(false);
                    setAnnouncementList(current => [{announcementID: -1, circleID: editingCircleID, //Note: only for display purposes; since server doesn't return announcementID
                        message: announcementInputMap.get('message'), startDate: announcementInputMap.get('startDate'), endDate: announcementInputMap.get('endDate')} as CircleAnnouncementListItem, 
                         ...current]);
                });
            })
            .catch((error) => { processAJAXError(error); });



    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));

    useEffect(()=>{if(leaderProfile !== undefined && leaderProfile.userID !== getInputField('leaderID')) setInputField('leaderID', leaderProfile.userID);}, [leaderProfile]);


    /*****************************
     * REDIRECT LINKED UTILITIES *
     *****************************/
    const redirectToProfile = (redirectUserID:number):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) 
            || userAccessProfileList.map((profile:ProfileListItem) => profile.userID).includes(redirectUserID)
            || (userHasAnyRole([RoleEnum.CIRCLE_LEADER]) && (userID === leaderProfile?.userID) && memberProfileList.map((profile:ProfileListItem) => profile.userID).includes(redirectUserID))) //Circle Leader Access
            navigate(`/portal/edit/profile/${redirectUserID}`);
        else
            notify('TODO - Public profile popup');
    }

    const redirectToPrayerRequest = (prayerRequestItem:PrayerRequestListItem):void => {
        if(userHasAnyRole([RoleEnum.ADMIN]) || prayerRequestItem.requestorProfile.userID === userID) 
            navigate(`portal/edit/prayer-request/${prayerRequestItem.prayerRequestID}`);
        else
            notify('TODO - Preview Prayer Request popup');
    }


    /*************************************
     *   RENDER DISPLAY 
     * *** Only Supporting Leader Routes
     * ***********************************/
    const getDisplayNew = ():boolean => editingCircleID < 1;

    return (
        <div id='edit-circle'  className='form-page form-page-stretch'>

            <FormInput
                key={editingCircleID}
                getIDField={()=>({modelIDField: 'circleID', modelID: editingCircleID})}
                validateUniqueFields={true}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={getDisplayNew() ? 'Create Circle' : 'Save Changes'}
                onSubmitCallback={getDisplayNew() ? makePostRequest : makeEditRequest}
                onAlternativeText={getDisplayNew() ? undefined : 'Delete Circle'}
                onAlternativeCallback={()=>setShowDeleteConfirmation(true)}
                headerChildren={
                <div className='form-header-vertical'>
                    <div className='form-header-detail-box'>
                        <h1 className='name'>{getInputField('name') || 'New Circle'}</h1>
                        <span>
                            {(memberProfileList.length > 0) && <label className='title id-left'>{memberProfileList.length} Members</label>}
                            {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingCircleID}</label> }
                        </span>
                        <span className='right-align'>
                            {leaderProfile && <img className='leader-profile-image' src={leaderProfile.image || PROFILE_DEFAULT} alt={leaderProfile.displayName} />}
                            {leaderProfile && <label className='title'>{leaderProfile.displayName}</label>}
                            {(leaderProfile && userRole === RoleEnum.ADMIN) && <label className='id-left'>#{leaderProfile.userID}</label>}
                        </span>
                    </div> 
                    <img className='form-header-image circle-image' src={image || CIRCLE_DEFAULT} alt='Circle-Image' />
                    <div className='form-header-horizontal'>
                        {(editingCircleID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => setShowImageUpload(true)}>Edit Image</button>}
                        {(editingCircleID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => setShowAnnouncement(true)}>New Announcement</button>}
                    </div>
                    <h2 className='sub-header'>{getDisplayNew() ? 'Create Details' : `Edit Details`}</h2>
                </div>}
            />

            <SearchList
                key={'CircleEdit-'+editingCircleID}
                defaultDisplayTitleKeySearch='Circles'
                defaultDisplayTitleList={['Pending Requests', 'Announcements', 'Events']}
                displayMap={new Map([
                        [ 
                            new SearchListKey({displayTitle:'Circles', searchType: SearchType.CIRCLE,
                                onSearchClick: (id:number)=> userHasAnyRole([RoleEnum.ADMIN]) ? setEditingCircleID(id) : {}
                                }),

                            [...userLeaderCircleList].map((circle) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE, displayItem: circle, 
                                onClick: (id:number)=>setEditingCircleID(id),
                                }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Pending Requests', searchType: SearchType.USER,
                                onSearchClick: (id:number) => redirectToProfile(id),
                                searchPrimaryButtonText: 'Invite', 
                                onSearchPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/client/${id}/invite`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Invite Sent`, ToastStyle.SUCCESS)) //TODO Update inviteList state
                                        .catch((error) => processAJAXError(error)),
                            }),

                            [...requestProfileList].map((profile) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) => redirectToProfile(id),
                                primaryButtonText: 'Accept Request', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}${
                                            userHasAnyRole([RoleEnum.ADMIN]) ? `/api/admin/circle/${editingCircleID}/join/${id}`
                                            : userHasAnyRole([RoleEnum.CIRCLE_LEADER]) ? `/api/leader/circle/${editingCircleID}/client/${id}/accept`
                                            : `/api/circle/${editingCircleID}/request`}`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify(userHasAnyRole([RoleEnum.ADMIN]) ? `Joined Circle` : userHasAnyRole([RoleEnum.CIRCLE_LEADER]) ? 'Circle Request Accepted' : 'Circle Request Sent', ToastStyle.SUCCESS, () => {
                                                const profile:ProfileListItem|undefined = requestProfileList.find(user => user.userID === id);
                                                setRequestProfileList(current => current.filter(user => user.userID !== id));
                                                if(profile !== undefined) setMemberProfileList(current => [profile, ...current]);                                            
                                            }))
                                        .catch((error) => processAJAXError(error)),

                                alternativeButtonText: 'Decline', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}${(userRole === RoleEnum.STUDENT) ? `/api/circle/${id}/leave` 
                                            : `/api/leader/circle/${editingCircleID}/client/${id}/leave`}`, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Request Revoked`, ToastStyle.SUCCESS,  ()=> setRequestProfileList(current => current.filter(user => user.userID !== id))))
                                        .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Announcements'}),

                            [...announcementList].map((announcement) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE_ANNOUNCEMENT, displayItem: announcement, 
                                primaryButtonText: 'Delete', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/announcement/${id}`, 
                                        { headers: { jwt: jwt }} )
                                        .then(response => notify(`Announcement Deleted`, ToastStyle.SUCCESS))
                                        .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Events'}),

                            [...eventList].map((event) => new SearchListValue({displayType: ListItemTypesEnum.CIRCLE_EVENT, displayItem: event, 
                                }))
                        ],
                        [
                            new SearchListKey({displayTitle:'Pending Invites', searchType: SearchType.USER,
                                onSearchClick: (id:number) => redirectToProfile(id),    
                                searchPrimaryButtonText: 'Invite', 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/client/${id}/invite`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Invite Sent`, ToastStyle.SUCCESS, () =>setInviteProfileList(current => [item as ProfileListItem, ...current])))
                                        .catch((error) => processAJAXError(error)),
                            }),

                            [...inviteProfileList].map((profile) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) => redirectToProfile(id),
                                alternativeButtonText: 'Decline Invite', 
                                onAlternativeButtonCallback: (id:number) => 
                                axios.delete(`${process.env.REACT_APP_DOMAIN}${(userRole === RoleEnum.STUDENT) ? `/api/circle/${id}/leave` 
                                            : `/api/leader/circle/${editingCircleID}/client/${id}/leave`}`, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Invite Revoked`, ToastStyle.SUCCESS,  ()=> setInviteProfileList(current => current.filter(user => user.userID !== id))))
                                        .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Members', searchType: SearchType.USER,
                                onSearchClick: (id:number) => redirectToProfile(id),
                                searchPrimaryButtonText: 'Invite', 
                                onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/client/${id}/invite`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Invite Sent`, ToastStyle.SUCCESS), () =>setInviteProfileList(current => [item as ProfileListItem, ...current]))
                                        .catch((error) => processAJAXError(error)),
                            }),

                            [...memberProfileList].map((profile) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                onClick: (id:number) => redirectToProfile(id),
                                alternativeButtonText: 'Remove', 
                                onAlternativeButtonCallback: (id:number) => 
                                    axios.delete(`${process.env.REACT_APP_DOMAIN}${(userRole === RoleEnum.STUDENT) ? `/api/circle/${id}/leave` 
                                            : `/api/leader/circle/${editingCircleID}/client/${id}/leave`}`, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Member Removed`, ToastStyle.SUCCESS, ()=> setMemberProfileList(current => current.filter(user => user.userID !== id))))
                                        .catch((error) => processAJAXError(error))
                            }))
                        ], 
                        [
                            new SearchListKey({displayTitle:'Prayer Requests'}),

                            [...prayerRequestList].map((prayer) => new SearchListValue({displayType: ListItemTypesEnum.PRAYER_REQUEST, displayItem: prayer, 
                                onClick: (id:number, item:DisplayItemType) => redirectToPrayerRequest(item as PrayerRequestListItem),
                                primaryButtonText: 'Pray', 
                                onPrimaryButtonCallback: (id:number) => 
                                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/prayer-request-edit/${id}/like`, {}, { headers: { jwt: jwt }} )
                                        .then(response => notify(`Shared Prayer Request`, ToastStyle.SUCCESS))
                                        .catch((error) => processAJAXError(error)),
                            }))
                        ], 
                    ])}
            />

            {(showAnnouncement && editingCircleID > 0) &&
                <CircleAnnouncementPage 
                    key={'CircleEdit-circleAnnouncement-'+editingCircleID}
                    onSaveCallback={makeCircleAnnouncementRequest}
                    onCancelCallback={()=>setShowAnnouncement(false)}
                />}

            {(showDeleteConfirmation) &&
                <div key={'CircleEdit-confirmDelete-'+editingCircleID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>setShowDeleteConfirmation(false)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        {leaderProfile && 
                                <div className='form-header-detail-box'>
                                    <span>
                                        <h1 className='name'>{getInputField('name')}</h1>
                                        {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{editingCircleID}</label>}
                                    </span>
                                    <span className='right-align'>
                                        <img className='leader-profile-image' src={leaderProfile.image || PROFILE_DEFAULT} alt={leaderProfile.displayName} />
                                        <label className='title'>{leaderProfile?.displayName}</label>
                                        {userHasAnyRole([RoleEnum.ADMIN]) && <label className='id-left'>#{leaderProfile.userID}</label>}
                                    </span>
                                </div> }
                        <img className='form-header-image circle-image' src={getInputField('image') || CIRCLE_DEFAULT} alt='Circle-Image' />
                        <h2>Delete Circle?</h2>

                        <label >{`+ ${requestProfileList.length + inviteProfileList.length + memberProfileList.length} Memberships`}</label>
                        {(announcementList.length > 0) && <label >{`+ ${announcementList.length} Announcements`}</label>}
                        {(eventList.length > 0) && <label >{`+ ${eventList.length} Events`}</label>}
        
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={()=>setShowDeleteConfirmation(false)}>Cancel</button>
                    </div>
                </div>
                }
                
                {(showImageUpload) &&
                    <ImageUpload
                        key={'circle-image-'+editingCircleID}
                        title='Upload Circle Image'
                        imageStyle='circle-image'
                        currentImage={ image }
                        defaultImage={ PROFILE_DEFAULT }
                        onCancel={()=>setShowImageUpload(false)}
                        onClear={()=>axios.delete(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/image`, { headers: { jwt: jwt }} )
                            .then(response => {
                                setShowImageUpload(false);
                                setImage(undefined);
                                notify(`Circle Image Deleted`, ToastStyle.SUCCESS)})
                            .catch((error) => processAJAXError(error))}
                        onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/leader/circle/${editingCircleID}/image/${imageFile.name}`, imageFile, { headers: { 'jwt': jwt, 'Content-Type': imageFile.type }} )
                            .then(response => {
                                setShowImageUpload(false);
                                setImage(response.data);
                                notify(`Circle Image Uploaded`, ToastStyle.SUCCESS)})
                            .catch((error) => processAJAXError(error))}
                    />
                }
        </div>
    );
}

export default CircleEditPage;



/***********************************************
 *   CREATE ANNOUNCEMENT POP-UP PAGE COMPONENT
 * *********************************************/
const CircleAnnouncementPage = ({...props}:{key:any, onSaveCallback:(announcementInputMap:Map<string, any>) => void, onCancelCallback:() => void}) => {
    const [announcementInputMap, setAnnouncementInputMap] = useState<Map<string, any>>(new Map());

    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined => announcementInputMap.get(field);

    const setInputField = (field:string, value:any):void => setAnnouncementInputMap(map => new Map(map.set(field, value)));

    const onCancel = () => (event:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        if(props.onCancelCallback) props.onCancelCallback();
    }

    return (
        <div key={props.key} id='circle-announcement-popup' className='center-absolute-wrapper' onClick={props.onCancelCallback}>

            <div className='form-page-block center-absolute-inside' onClick={(event)=>event.stopPropagation()}>
                <h2>Create Circle Announcement</h2>

                <FormInput
                    key={'CIRCLE-ANNOUNCEMENT'+props.key}
                    getIDField={()=>({modelIDField: 'announcementID', modelID: -1})}
                    getInputField={getInputField}
                    setInputField={setInputField}
                    FIELDS={CIRCLE_ANNOUNCEMENT_FIELDS}
                    onSubmitText='Send Announcement'              
                    onSubmitCallback={() => props.onSaveCallback(announcementInputMap)}
                    onAlternativeText='Cancel'
                    onAlternativeCallback={() => props.onCancelCallback()}
                />
            </div>
        </div>
    );
}