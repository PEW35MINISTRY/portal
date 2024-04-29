import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FacebookEmbed, InstagramEmbed, PinterestEmbed, TikTokEmbed, TwitterEmbed, YouTubeEmbed } from 'react-social-media-embed';
import InputField, { checkFieldName } from '../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { assembleRequestBody, makeDisplayText } from '../1-Utilities/utilities';
import { ToastStyle } from '../100-App/app-types';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { EDIT_CONTENT_FIELDS, EDIT_CONTENT_FIELDS_ADMIN } from '../0-Assets/field-sync/input-config-sync/content-field-config';
import { ContentListItem, ContentResponseBody } from '../0-Assets/field-sync/api-type-sync/content-types';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import SearchDetail, { ListItemTypesEnum, SearchType } from '../0-Assets/field-sync/input-config-sync/search-config';
import PageNotFound from '../2-Widgets/NotFoundPage';
import { ImageWidget } from '../2-Widgets/ImageWidgets';

import './contentArchive.scss';

//Assets
import MEDIA_DEFAULT from '../0-Assets/media-blue.png';
import GOT_QUESTIONS from '../0-Assets/got-questions.png';
import BIBLE_PROJECT from '../0-Assets/bible-project.png';
import THROUGH_THE_WORD from '../0-Assets/through-the-word.png';


const ContentArchivePage = () => {
    const navigate = useNavigate();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [previewURL, setPreviewURL] = useState<string|undefined>(undefined);

    const [editingContentID, setEditingContentID] = useState<number>(-1);
    const [showNotFound, setShowNotFound] = useState<Boolean>(false);
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


    /* Search for Content by ID */
    useLayoutEffect (() => {
        if(searchUserID <= 0)
            return;
       
        //Server prioritized owned content, default search also includes latest
        axios.get(`${process.env.REACT_APP_DOMAIN}${SearchDetail[SearchType.CONTENT_ARCHIVE].route}`, { headers: { jwt: jwt }})
            .then((response:{data:ContentListItem[]}) => {
                if(response.data.length === 0) notify('No Content Found', ToastStyle.INFO);
                setOwnedContentList(Array.from(response.data || []));

            }).catch((error) => processAJAXError(error));
        
    }, [searchUserID]);


    //Triggers | (delays fetchCircle until after Redux auto login)
    useLayoutEffect(() => {
        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS);

        //setEditingContentID
        if(userID > 0 && jwt.length > 0) {
            if(isNaN(id as any)) { //new
                navigate(`/portal/edit/content-archive/new`);
                setEditingContentID(-1);

            } else if((ownedContentList.length > 0) && (parseInt(id as string) < 1)) { //redirect to first circle
                navigate(`/portal/edit/content-archive/${ownedContentList[0].contentID}`);
                setEditingContentID(ownedContentList[0].contentID);

            } else if(parseInt(id as string) < 1) { //new
                navigate(`/portal/edit/content-archive/new`);
                setEditingContentID(-1);

            } else if(parseInt(id as string) > 0) //edit
                setEditingContentID(parseInt(id as string));
        }

        /* Sync state change to URL action */
        setShowNotFound(false);
        setShowDeleteConfirmation(action === 'delete');

    }, [jwt, userID, userRole, id, action, ownedContentList]);
    
    useEffect(() => {
        if(showNotFound) {
            setShowDeleteConfirmation(false);
        }
    }, [showNotFound]);



    /*******************************************
     *   RETRIEVE CONTENT ARCHIVE BEING EDITED
     * *****************************************/
    useLayoutEffect (() => { 
        if(editingContentID > 0) {
            navigate(`/portal/edit/content-archive/${editingContentID}/${action || ''}`, {replace: (id.toString() === '-1')});
            fetchContentArchive(editingContentID);

        } else { //(id === -1)
            setInputMap(new Map());
            setPreviewURL(undefined);
        }
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

                    } else if(field === 'url') {
                        setPreviewURL(value);
                        valueMap.set(field, value);

                    } else if(checkFieldName(EDIT_FIELDS, field))
                        valueMap.set(field, value);
                        
                    else    
                        console.log(`EditContentArchiveRequest-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));

            })
            .catch((error) => processAJAXError(error, () => setShowNotFound(true)));

    /*******************************************
     *  SAVE CONTENT ARCHIVE CHANGES TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makeEditRequest = async(resultMap:Map<string,any> = inputMap) => 
        await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}`, assembleRequestBody(resultMap), { headers: { jwt: jwt }})
            .then((response:{ data:ContentResponseBody} ) => notify(`Content Saved`, ToastStyle.SUCCESS))
            .catch((error) => processAJAXError(error));

    
    /*******************************************
     *  SAVE NEW CONTENT ARCHIVE TO SEVER
     * FormInput already handled validations
     * *****************************************/
    const makePostRequest = async(resultMap:Map<string, string> = inputMap) =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/content-archive`, assembleRequestBody(resultMap), {headers: { jwt: jwt }})
            .then((response:{ data:ContentResponseBody} ) =>
                notify(`Content Archive Created`, ToastStyle.SUCCESS, () => {
                    setOwnedContentList((currentList) => [{
                        contentID: response.data.contentID, 
                        url: response.data.url, 
                        type: response.data.type,
                        source: response.data.source,
                        keywordList: [...response.data.keywordList],
                        description: response.data.description,
                    }, ...currentList]);

                    //Reset for new entry
                    setInputMap(new Map());
                    setEditingContentID(-1);
                    setPreviewURL(undefined);
                }))
            .catch((error) => { processAJAXError(error); });
    
    
    /*******************************************
     *         DELETE CONTENT ARCHIVE
     * *****************************************/
    const makeDeleteRequest = async() => 
        axios.delete(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}`, { headers: { jwt: jwt }} )
            .then(response => {
                notify(`Deleted Content`, ToastStyle.SUCCESS, () => {
                    navigate('/portal/edit/content-archive/-1');
                });
            }).catch((error) => processAJAXError(error));
    

    /***************************
     *   Edit Field Handlers
     * *************************/
    const getInputField = (field:string):any|undefined =>  inputMap.get(field);

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));
   
    /*************************
     * Update Social Preview *
     *************************/
    const onUpdatePreview = (event:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        setPreviewURL(undefined);
        setTimeout(()=>setPreviewURL(getInputField('url')), 1500);
    }

    /******************
     * RENDER DISPLAY *
     ******************/
    return (
        <div id='edit-content-archive'  className='form-page form-page-stretch'>

    {showNotFound ?
           <PageNotFound primaryButtonText={'New Content Archive'} onPrimaryButtonClick={()=>navigate('/portal/edit/circle/new')} />
           
           : <FormInput
                key={editingContentID}
                getIDField={()=>({modelIDField: 'contentID', modelID: editingContentID})}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingContentID > 0) ? 'Save Content' : 'Create Content'}              
                onSubmitCallback={(editingContentID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingContentID > 0) ? 'Delete Content' : undefined}
                onAlternativeCallback={() => navigate(`/portal/edit/content-archive/${editingContentID}/delete`)}
                headerChildren={
                    <div className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                        </div>
                        <ContentArchivePreview
                            url={previewURL || ''}
                            source={getInputField('source')}
                            maxWidth={400}
                            height={undefined}
                        />
                        <button className='alternative-button update-button' onClick={onUpdatePreview}>Update Preview</button>
                    </div>}
            />
        }

            <SearchList
                key={'ContentArchiveEdit-'+editingContentID}
                defaultDisplayTitleKeySearch={'Content'}
                defaultDisplayTitleList={['Content']}
                displayMap={new Map([
                        [
                            new SearchListKey({displayTitle:'Content', searchType: SearchType.CONTENT_ARCHIVE,
                                onSearchClick: (id:number)=> setEditingContentID(id)
                            }),
                            [...ownedContentList].map((content) => new SearchListValue({displayType: ListItemTypesEnum.CONTENT_ARCHIVE, displayItem: content, 
                                onClick: (id:number)=>setEditingContentID(id)
                            }))
                        ],
                    ])}
            />

            {(showDeleteConfirmation) &&
                <div key={'ContentArchiveEdit-confirmDelete-'+editingContentID} id='confirm-delete' className='center-absolute-wrapper' onClick={() => navigate(`/portal/edit/content-archive/${editingContentID}`)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                            <span>
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingContentID}</label>}
                            </span>
                        </div>                        
                        <ContentArchivePreview
                            url={previewURL || ''}
                            source={getInputField('source')}
                            maxWidth={400}
                            height={undefined}
                        />
                        <h2>Delete Content?</h2>
                        {getInputField('description') && <p className='id' >{getInputField('description')}</p>}
                        <label >{`-> ${getInputField('type')}`}</label>
                        <label >{`-> ${getInputField('source')}`}</label>
                        {Array.from((getInputField('keywordList') as string[]) || []).map((tag, index) =>
                            <label key={'tag'+index}>{` * ${makeDisplayText(tag)}`}</label>
                        )}
                        <hr/>
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={() => navigate(`/portal/edit/content-archive/${editingContentID}`)}>Cancel</button>
                    </div>
                </div>}
        </div>
    );
}

export default ContentArchivePage;



/**********************************
 * Embedded Social Post Component *
 **********************************/
export const ContentArchivePreview = (props:{url:string, source:string, maxWidth:number, height:number|undefined}) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [previewWidth, setPreviewWidth] = useState<number>(200);

    useEffect(() => {
        if(previewRef.current) setPreviewWidth(Math.min(previewRef.current.offsetWidth * 0.9, props.maxWidth));
    }, [previewRef.current?.offsetWidth]);

    return (
        <div ref={previewRef} id='content-wrapper' style={props.height ? {height: props.height} : {}} onClick={(e)=>{e.preventDefault(); e.stopPropagation();}} >
            <div id='content-inner' >
                {(props.url && props.source === 'FACEBOOK') ?
                    <FacebookEmbed url={props.url} width={previewWidth} />
                : (props.source === 'FACEBOOK') ?
                    <p>Visit Facebook in the browser.  On the post you'd like to embed, select ⋯ › Embed › Advanced settings › Get Code, then use the cite link in the generated blockquote.</p>
                : (props.url && props.source === 'INSTAGRAM') ?
                    <InstagramEmbed url={props.url} width={previewWidth} />
                : (props.source === 'INSTAGRAM') ?
                    <p>Visit Instagram in the browser.  Open a post in a browser window and copy the URL from the address bar. The URL should be in the format: https://www.instagram.com/p/abc123xyzAB/.</p>
                : (props.url && props.source === 'PINTEREST') ?
                    <PinterestEmbed url={props.url} width={previewWidth} />
                : (props.source === 'PINTEREST') ?
                    <p>Visit a Pinterest post in the browser. Copy the URL from the address bar.  The URL must contain the pin ID, in the format pin/1234567890123456789. Short links are not supported.</p>
                : (props.url && props.source === 'TIKTOK') ?
                    <TikTokEmbed url={props.url} width={previewWidth} />
                : (props.source === 'TIKTOK') ?
                    <p>Visit TikTok in the browser. Copy the URL from the address bar. URL format: https://www.tiktok.com/@username/video/1234567890123456789. Short links are not supported.</p>
                : (props.url && props.source === 'X_TWITTER') ?
                    <TwitterEmbed url={props.url} width={previewWidth} />
                : (props.source === 'X_TWITTER') ?
                    <p>Open X in the browser.  Copy the URL from the address bar. https://twitter.com/username/status/1234567890123456789. Short links are not supported.</p>
                : (props.url && props.source === 'YOUTUBE') ?
                    <YouTubeEmbed url={props.url} width={previewWidth} />
                : (props.source === 'YOUTUBE') ?
                    <p>May use browser or share within the App.  Video links must be URL format: https://www.youtube.com/watch?v=VIDEO_ID.  Shorts format: https://youtube.com/shorts/VIDEO_ID.</p>
                : (props.source === 'GOT_QUESTIONS') ?
                    <img className='form-header-image content-image' src={GOT_QUESTIONS} alt='Got Questions' style={props.height ? {maxHeight: props.height * 0.95} : {}} />
                : (props.source === 'BIBLE_PROJECT') ?
                    <img className='form-header-image content-image' src={BIBLE_PROJECT} alt='Bible Project' style={props.height ? {maxHeight: props.height * 0.95} : {}} />
                : (props.source === 'THROUGH_THE_WORD') ?
                    <img className='form-header-image content-image' src={THROUGH_THE_WORD} alt='Through the Word' style={props.height ? {maxHeight: props.height * 0.95} : {}} />
                : 
                    <img className='form-header-image content-image' src={MEDIA_DEFAULT} alt='Content Preview' style={props.height ? {maxHeight: props.height * 0.95} : {}} /> }
            </div>
        </div>
    );
}
