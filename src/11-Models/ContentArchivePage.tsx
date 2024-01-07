import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ProfileListItem, ProfileResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import InputField from '../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector, useQuery } from '../1-Utilities/hooks';
import { makeDisplayText } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { EDIT_CONTENT_FIELDS, EDIT_CONTENT_FIELDS_ADMIN } from '../0-Assets/field-sync/input-config-sync/content-field-config';
import { ContentListItem, ContentResponseBody } from '../0-Assets/field-sync/api-type-sync/content-types';
import { ListItemTypesEnum, SearchListKey, SearchListSearchTypesEnum, SearchListValue } from '../2-Widgets/SearchList/searchList-types';

import '../2-Widgets/Form/form.scss';

//Assets
import CIRCLE_DEFAULT from '../0-Assets/circle-default.png';


const ContentArchivePage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());

    const [editingContentID, setEditingContentID] = useState<number>(-1);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<Boolean>(false);

    //SearchList Cache
    const [searchUserID, setSearchUserID] = useState<number>(userID);
    const [ownedContentList, setOwnedContentList] = useState<ContentListItem[]>([]);

    //Sync userID on initial load
    useEffect(() => {
        if(userID > 0) {
            setSearchUserID(userID);
        }
    },[userID]);

    /* Set Privilege Edit Fields Available */
    useLayoutEffect (() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS);

    }, [userRole, editingContentID]);

    /* Search for Prayer Request by user/requestor */
    useLayoutEffect (() => {
        if(searchUserID <= 0)
            return;
        
        //Must Fetch by user, since can't search prayer requests
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/content-archive/content-list`, { headers: { jwt: jwt }})
            .then(response => {
                const resultList:ContentListItem[] = Array.from(response.data || []);
                setOwnedContentList(resultList);
                if(resultList.length === 0) notify('No Prayer Requests Found', ToastStyle.INFO);

            }).catch((error) => processAJAXError(error));
        
    }, [searchUserID]);

    useLayoutEffect (() => { //setEditingContentID
        if(parseInt((id || '-1') as string) > 0) //URL navigate
            setEditingContentID(parseInt(id as string)); //triggers fetchContentArchive

        else if(isNaN(id as any) || ownedContentList.length === 0) { //new
            setEditingContentID(-1);
            setInputMap(new Map());

        } else //default on navigation
            setEditingContentID(ownedContentList[0].contentID);

    }, [id, ownedContentList]);
            

        /* Sync state change to URL action */
        useEffect(() => {
            if(showDeleteConfirmation) 
                navigate(`/portal/edit/content-archive/${editingContentID}/delete`);
            else 
                navigate(`/portal/edit/content-archive/${editingContentID}`);

        }, [showDeleteConfirmation]);


    /*******************************************
     *   RETRIEVE Prayer Request BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        if(editingContentID > 0) navigate(`/portal/edit/content-archive/${editingContentID}/${action || ''}`); //Should not re-render: https://stackoverflow.com/questions/56053810/url-change-without-re-rendering-in-react-router
        if(editingContentID > 0 && jwt.length > 0) fetchContentArchive(editingContentID); 
    }, [editingContentID, jwt]);

    const fetchContentArchive = (fetchContentID:string|number) => 
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${fetchContentID}`,{headers: { jwt: jwt }})
            .then(response => {
                const fields:ContentResponseBody = response.data;
                const valueMap:Map<string, any> = new Map([['contentID', fields.contentID]]);

                [...Object.entries(fields)].forEach(([field, value]) => { //TODO these list are not returned if empty and state must be reset to []
                    if(field === 'recorderID') {
                        setSearchUserID(value);
                        valueMap.set('recorderID', value);

                    } else if(EDIT_FIELDS.some(f => f.field === field))
                        valueMap.set(field, value);
                    else    
                        console.log(`EditContentArchiveRequest-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));

                /* Update State based on sub route */
                if(action === 'delete') 
                    setShowDeleteConfirmation(true);
            })
            .catch((error) => processAJAXError(error, () => navigate('/portal/edit/content-archive/-1')));

    /*******************************************
     *  SAVE CONTENT ARCHIVE CHANGES TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makeEditRequest = async(result?:Map<string,any>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:ContentResponseBody = {} as ContentResponseBody;
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}`, requestBody, { headers: { jwt: jwt }})
            .then(response => notify(`Content Saved`, ToastStyle.SUCCESS, () => {
            }))
            .catch((error) => processAJAXError(error));
    }

    
    /*******************************************
     *  SAVE NEW CONTENT ARCHIVE TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makePostRequest = async(result?:Map<string, string>) => {
        const finalMap:Map<string,any> = result || inputMap;
        //Assemble Request Body (Simple JavaScript Object)
        const requestBody:ContentResponseBody = {} as ContentResponseBody;
        finalMap.forEach((value, field) => {
            //@ts-ignore
            requestBody[field] = value;
        });

        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/content-archive`, requestBody, {headers: { jwt: jwt }})
            .then(response =>
                notify(`Content Archive Created`, ToastStyle.SUCCESS, () => {
                    setEditingContentID(response.data.contentID);
                }))
            .catch((error) => { processAJAXError(error); });
    }
    
    
    /*******************************************
     *         DELETE CONTENT ARCHIVE
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted Prayer Request`, ToastStyle.SUCCESS, () => {
                    setShowDeleteConfirmation(false);
                    navigate('/portal/edit/content-archive/-1');
                });
            }).catch((error) => processAJAXError(error));
    

    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined =>  inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));
   
    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='edit-content-archive'  className='form-page'>

            <FormInput
                key={editingContentID}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingContentID > 0) ? 'Save Content' : 'Create Content'}              
                onSubmitCallback={(editingContentID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingContentID > 0) ? 'Delete Content' : undefined}
                onAlternativeCallback={()=>setShowDeleteConfirmation(true)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                        </div>
                        <img className='form-header-image circle-image' src={CIRCLE_DEFAULT} alt='Content-Preview' />
                    </div>}
            />

            <SearchList
                key={'ContentArchiveEdit-'+editingContentID}
                defaultDisplayTitleKeySearch={'Content'}
                defaultDisplayTitleList={['Content']}
                displayMap={new Map([
                        [
                            new SearchListKey({displayTitle:'Content', searchType:SearchListSearchTypesEnum.CONTENT_ARCHIVE,
                                onSearchClick: (id:number)=> setEditingContentID(id)
                            }),
                            [...ownedContentList].map((content) => new SearchListValue({displayType: ListItemTypesEnum.CONTENT_ARCHIVE, displayItem: content, 
                                onClick: (id:number)=>setEditingContentID(id)
                            }))
                        ],
                    ])}
            />

            {(showDeleteConfirmation) &&
                <div key={'PrayerRequestEdit-confirmDelete-'+editingContentID} id='confirm-delete' className='center-absolute-wrapper' onClick={()=>setShowDeleteConfirmation(false)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                            <span>
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingContentID}</label>}
                            </span>
                        </div>
                        
                        <img className='form-header-image circle-image' src={getInputField('image') || CIRCLE_DEFAULT} alt='Circle-Image' />
                        <h2>Delete Content?</h2>
                        {getInputField('description') && <p className='id' >{getInputField('description')}</p>}
                        <label >{`-> ${getInputField('type')}`}</label>
                        <label >{`-> ${getInputField('source')}`}</label>
                        {Array.from((getInputField('keywordList') as string[]) || []).map((tag, index) =>
                            <label key={'tag'+index}>{` * ${makeDisplayText(tag)}`}</label>
                        )}
                        <hr/>
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={()=>setShowDeleteConfirmation(false)}>Cancel</button>
                    </div>
                </div>}
        </div>
    );
}

export default ContentArchivePage;
