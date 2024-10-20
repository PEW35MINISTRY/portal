import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FacebookEmbed, InstagramEmbed, PinterestEmbed, TikTokEmbed, TwitterEmbed, YouTubeEmbed } from 'react-social-media-embed';
import InputField, { checkFieldName, ENVIRONMENT_TYPE, InputSelectionField } from '../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum, } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { assembleRequestBody, makeDisplayText } from '../1-Utilities/utilities';
import { blueColor, PageState, ModelPopUpAction, ToastStyle } from '../100-App/app-types';
import FormInput from '../2-Widgets/Form/FormInput';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { ContentSourceEnum, ContentTypeEnum, EDIT_CONTENT_FIELDS, EDIT_CONTENT_FIELDS_ADMIN, MOBILE_CONTENT_SUPPORTED_TYPES_MAP } from '../0-Assets/field-sync/input-config-sync/content-field-config';
import { ContentListItem, ContentMetaDataResponseBody, ContentResponseBody } from '../0-Assets/field-sync/api-type-sync/content-types';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import SearchDetail, { ListItemTypesEnum, SearchType } from '../0-Assets/field-sync/input-config-sync/search-config';
import FullImagePage, { PageNotFound } from '../12-Features/Utility-Pages/FullImagePage';
import { ContentThumbnailImage, ImageDefaultEnum, ImageUpload, getDefaultImage } from '../2-Widgets/ImageWidgets';

import './contentArchive.scss';

/* Content Default Thumbnails */
import MEDIA_DEFAULT from '../0-Assets/default-images/media-blue.png';
import GOT_QUESTIONS from '../0-Assets/default-images/got-questions.png';
import BIBLE_PROJECT from '../0-Assets/default-images/bible-project.png';
import THROUGH_THE_WORD from '../0-Assets/default-images/through-the-word.png';
import ErrorRenderWrapper from '../1-Utilities/ErrorRenderWrapper';

export const getDefaultThumbnail = (contentSource:ContentSourceEnum) =>
        contentSource === ContentSourceEnum.GOT_QUESTIONS ? GOT_QUESTIONS
        : contentSource === ContentSourceEnum.BIBLE_PROJECT ? BIBLE_PROJECT
        : contentSource === ContentSourceEnum.THROUGH_THE_WORD ? THROUGH_THE_WORD
        : MEDIA_DEFAULT;


const ContentArchivePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const { id = -1, action } = useParams();

    const [EDIT_FIELDS, setEDIT_FIELDS] = useState<InputField[]>([]);
    const [inputMap, setInputMap] = useState<Map<string, any>>(new Map());
    const [showURLPreview, setShowURLPreview] = useState<boolean>(false); //false shows thumbnail

    const [editingContentID, setEditingContentID] = useState<number>(-1);
    const [viewState, setViewState] = useState<PageState>(PageState.LOADING);
    const [popUpAction, setPopUpAction] = useState<ModelPopUpAction>(ModelPopUpAction.NONE);
    const SUPPORTED_POP_UP_ACTIONS:ModelPopUpAction[] = [ModelPopUpAction.IMAGE, ModelPopUpAction.DELETE, ModelPopUpAction.NONE];

    //SearchList Cache
    const [searchUserID, setSearchUserID] = useState<number>(userID);
    const [ownedContentList, setOwnedContentList] = useState<ContentListItem[]>([]);


    /* Search for Content by ID */
    useEffect(() => {
        if(searchUserID <= 0)
            return;
       
        //Server prioritized owned content, default search also includes latest
        axios.get(`${process.env.REACT_APP_DOMAIN}${SearchDetail[SearchType.CONTENT_ARCHIVE].route}`, { headers: { jwt: jwt }})
            .then((response:{data:ContentListItem[]}) => {
                if(response.data.length === 0) notify('No Content Found', ToastStyle.INFO);
                setOwnedContentList(Array.from(response.data || []));

            }).catch((error) => processAJAXError(error));
        
    }, [searchUserID]);


    //Update state to reflect URL as source of truth
    useEffect(() => {
        if(userID <= 0 || jwt.length === 0) return;

        if(userID > 0) {
            setSearchUserID(userID);
        }

        if(userRole === RoleEnum.ADMIN)
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS_ADMIN);
        else
            setEDIT_FIELDS(EDIT_CONTENT_FIELDS);

        let targetID:number = parseInt(id as string);
        let targetPath:string = location.pathname;
        let targetView:PageState = viewState;
        let targetAction:ModelPopUpAction = popUpAction;
        
        //New Content
        if(isNaN(targetID)) {
            targetID = -1;
            targetPath = `/portal/edit/content-archive/new`;
            targetView = PageState.NEW;
            targetAction = ModelPopUpAction.NONE;

        //Edit Specific Content
        } else if(targetID > 0) {
            targetAction = SUPPORTED_POP_UP_ACTIONS.includes(action?.toLowerCase() as ModelPopUpAction)
                ? (action?.toLowerCase() as ModelPopUpAction)
                : ModelPopUpAction.NONE;
            targetPath = `/portal/edit/content-archive/${targetID}${targetAction.length > 0 ? `/${targetAction}` : ''}`;

        //Redirect to First Content if Available
        } else if(targetID < 1 && ownedContentList.length > 0) {
            targetID = ownedContentList[0].contentID;
            targetPath = `/portal/edit/content-archive/${targetID}`;
            targetAction = ModelPopUpAction.NONE;
        }

        //Limit State Updates
        if(targetID !== editingContentID) setEditingContentID(targetID);
        if(targetPath !== location.pathname) navigate(targetPath);
        if(targetView !== viewState) setViewState(targetView);
        if(targetAction !== popUpAction) setPopUpAction(targetAction);

    }, [jwt, id, (editingContentID < 1 && ownedContentList.length > 0)]);


    const updatePopUpAction = (newAction:ModelPopUpAction) => {
        if(SUPPORTED_POP_UP_ACTIONS.includes(newAction) && popUpAction !== newAction) {
            navigate(`/portal/edit/content-archive/${editingContentID}${newAction.length > 0 ? `/${newAction}` : ''}`, {replace: true});
            setPopUpAction(newAction);
        }
    }


    /*******************************************
     *   RETRIEVE CONTENT ARCHIVE BEING EDITED
     * *****************************************/
    useEffect(() => { 
        if(editingContentID > 0) {
            setViewState(PageState.LOADING);
            navigate(`/portal/edit/content-archive/${editingContentID}${popUpAction.length > 0 ? `/${popUpAction}` : ''}`, {replace: true});
            fetchContentArchive(editingContentID);

        } else { //(id === -1)
            setInputMap(new Map());
            setShowURLPreview(false);
            updatePopUpAction(ModelPopUpAction.NONE);
        }
    }, [editingContentID]);

    const fetchContentArchive = (fetchContentID:string|number) => 
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${fetchContentID}`,{headers: { jwt: jwt }})
            .then(response => {
                const fields:ContentResponseBody = response.data;
                const valueMap:Map<string, any> = new Map([['contentID', fields.contentID]]);

                [...Object.entries(fields)].forEach(([field, value]) => { //TODO these list are not returned if empty and state must be reset to []
                    if(field === 'recorderID') {
                        setSearchUserID(value);
                        valueMap.set('recorderID', value);

                    } else if(checkFieldName(EDIT_FIELDS, field))
                        valueMap.set(field, value);
                        
                    else if(process.env.REACT_APP_ENVIRONMENT === ENVIRONMENT_TYPE.DEVELOPMENT)  
                        console.log(`EditContentArchiveRequest-skipping field: ${field}`, value);
                });
                setInputMap(new Map(valueMap));
                setViewState(PageState.VIEW);
            })
            .catch((error) => { processAJAXError(error); setViewState(PageState.NOT_FOUND); });


    /*********************************************
     *   RETRIEVE METADATA & THUMBNAIL           *
     * | Doesn't save to Model util Form Saved | *
     * *******************************************/
    const allowMetaDataFetch = (url:string = getInputField('url')):boolean => {
        const urlInputField:InputField|undefined = EDIT_FIELDS.find(field => field.field === 'url');
        const typeInputField:InputField|undefined = EDIT_FIELDS.find(field => field.field === 'type');
        const sourceInputField:InputField|undefined = EDIT_FIELDS.find(field => field.field === 'source');
        const type:ContentTypeEnum|undefined = getInputField('type');
        const source:ContentSourceEnum|undefined = getInputField('source');

        return (url !== undefined && urlInputField !== undefined && urlInputField.validationRegex.test(url) 
             && type !== undefined && type !== ContentTypeEnum.CUSTOM && typeInputField !== undefined && typeInputField.validationRegex.test(type) 
             && source !== undefined && source !== ContentSourceEnum.CUSTOM && sourceInputField !== undefined && sourceInputField.validationRegex.test(source));
    }
    

    const fetchMetaData = async(url:string = getInputField('url')) => {
        const urlInputField:InputField|undefined = EDIT_FIELDS.find(field => field.field === 'url');
        const type:ContentTypeEnum|undefined = getInputField('type');
        const source:ContentSourceEnum|undefined = getInputField('source');

        if(!allowMetaDataFetch(url))
            return notify(`Invalid URL${urlInputField ? ' - ' : ''}${urlInputField?.validationMessage || ''}`, ToastStyle.WARN);

        return await axios.post(`${process.env.REACT_APP_DOMAIN}/api/content-archive/utility/meta-data`, { url, type, source }, { headers: { jwt: jwt }})
            .then((response:{ data:ContentMetaDataResponseBody} ) => {
                setInputField('image', response.data.imageURL);
                setInputField('title', response.data.title);
                setInputField('description', response.data.description);
                setShowURLPreview(false);
            })
            .catch((error) => processAJAXError(error));
    }

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
                        title: response.data.title,
                        description: response.data.description,
                        image: response.data.image,
                        keywordList: [...response.data.keywordList],
                        likeCount: response.data.likeCount,
                    }, ...currentList]);

                    //Reset for new entry
                    setInputMap(new Map());
                    setEditingContentID(-1);
                    setShowURLPreview(false);
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
    const getInputField = (field:string):any|undefined => inputMap.get(field) ?? EDIT_FIELDS.find(f => f.field === field)?.value;

    const setInputField = (field:string, value:any):void => setInputMap(map => new Map(map.set(field, value)));
   
    /********************************
     * Listen & Auto Fetch MetaData *
     ********************************/
    useEffect(() => {
        if(allowMetaDataFetch() && getInputField('image') === undefined && getInputField('title') === undefined && getInputField('description') === undefined)
            fetchMetaData();
    }, [getInputField('url'), getInputField('type'), getInputField('source')]);

    /*****************************
     * Update Conditional Fields *
     *****************************/
     //Indicating Type supported on Mobile based on Source selection
    useEffect(() => {
        let supportedTypeList:ContentTypeEnum[] = [];
        const typeField:InputSelectionField = EDIT_CONTENT_FIELDS.find((field:InputField) => field.field === 'type') as InputSelectionField;

        if(typeField !== undefined) {
            if(getInputField('source') !== undefined && MOBILE_CONTENT_SUPPORTED_TYPES_MAP.has(getInputField('source')))
                supportedTypeList = MOBILE_CONTENT_SUPPORTED_TYPES_MAP.get(getInputField('source')) ?? [];
                         
            setInputField('type', (supportedTypeList.length > 0) ? supportedTypeList[0] : ContentTypeEnum.CUSTOM);   

            typeField.selectOptionList.forEach((type:string, index:number) =>
                typeField.displayOptionList[index] = (supportedTypeList.includes(ContentTypeEnum[type as keyof typeof ContentTypeEnum]))
                    ? `${makeDisplayText(type)} (mobile)` :  makeDisplayText(type)
            );
        }
    }, [getInputField('source')]);


    /******************
     * RENDER DISPLAY *
     ******************/
    return (
        <div id='edit-content-archive'  className='form-page form-page-stretch'>

        {(viewState === PageState.LOADING) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} backgroundColor='transparent' message='Loading...' messageColor={blueColor}
                                                            alternativeButtonText={'New Content'} onAlternativeButtonClick={()=>navigate('/portal/edit/content-archive/new')} />
           : (viewState === PageState.NOT_FOUND) ? <PageNotFound primaryButtonText={'New Content'} onPrimaryButtonClick={()=>navigate('/portal/edit/content-archive/new')} />
           : <></>
        }

        {[PageState.NEW, PageState.VIEW].includes(viewState) &&  
           <FormInput
                key={editingContentID}
                getIDField={()=>({modelIDField: 'contentID', modelID: editingContentID})}
                getInputField={getInputField}
                setInputField={setInputField}
                FIELDS={EDIT_FIELDS}
                onSubmitText={(editingContentID > 0) ? 'Save Content' : 'Create Content'}              
                onSubmitCallback={(editingContentID > 0) ? makeEditRequest : makePostRequest}
                onAlternativeText={(editingContentID > 0) ? 'Delete Content' : undefined}
                onAlternativeCallback={() => updatePopUpAction(ModelPopUpAction.DELETE)}
                headerChildren={[
                    <div key='content-header' className='form-header-vertical'>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                        </div>
                        {(showURLPreview || !getInputField('image')) ?
                            <ContentArchivePreview
                                url={getInputField('url')}
                                source={getInputField('source')}
                                maxWidth={400}
                                height={undefined}
                            />
                            : <ContentThumbnailImage className='form-header-image' src={getInputField('image')} defaultSrc={getDefaultThumbnail(getInputField('source'))} />
                        }
                        <div className='form-header-horizontal'>
                            {getInputField('url') && getInputField('image')
                                && <button className='alternative-button form-header-button' onClick={(event) => {event.preventDefault(); setShowURLPreview(current => !current);}}>Show {showURLPreview ? 'Thumbnail' : 'Content'} Preview</button>}
                            {(editingContentID > 0) && <button type='button' className='alternative-button form-header-button' onClick={() => updatePopUpAction(ModelPopUpAction.IMAGE)}>Edit Thumbnail</button>}
                            {(allowMetaDataFetch()) && <button className='alternative-button form-header-button' onClick={(event) => {event.preventDefault(); fetchMetaData();}}>Fetch Metadata</button>}
                        </div>
                    </div>]}
            />}

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

            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.IMAGE) &&
                <ImageUpload
                    key={'content-thumbnail-image-'+editingContentID}
                    title='Upload Thumbnail'
                    imageStyle='thumbnail-image'
                    currentImage={ getInputField('image') }
                    defaultImage={ ImageDefaultEnum.MEDIA }
                    onCancel={()=>updatePopUpAction(ModelPopUpAction.NONE)}
                    onClear={()=>axios.delete(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}/image`, { headers: { jwt: jwt }} )
                        .then(response => {
                            updatePopUpAction(ModelPopUpAction.NONE);
                            setInputField('image', undefined);
                            notify(`Thumbnail Deleted`, ToastStyle.SUCCESS)})
                        .catch((error) => processAJAXError(error))}
                    onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/content-archive/${editingContentID}/image/${imageFile.name}`, imageFile, { headers: { jwt, 'Content-Type': imageFile.type }} )
                        .then(response => {
                            updatePopUpAction(ModelPopUpAction.NONE);
                            setInputField('image', response.data);
                            notify(`Thumbnail Uploaded`, ToastStyle.SUCCESS)})
                        .catch((error) => processAJAXError(error))}
                />
            }

            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.DELETE) &&
                <div key={'ContentArchiveEdit-confirmDelete-'+editingContentID} id='confirm-delete' className='center-absolute-wrapper' onClick={() => updatePopUpAction(ModelPopUpAction.NONE)}>

                    <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                        <div className='form-header-detail-box'>
                            <h1 className='name'>{'Content Archive'}</h1>
                            <span>
                                {(userRole === RoleEnum.ADMIN) && <label className='id-left'>#{editingContentID}</label>}
                            </span>
                        </div>                        
                        <ContentThumbnailImage className='form-header-image' src={getInputField('image')} defaultSrc={getDefaultThumbnail(getInputField('source'))} />
                        <h2>Delete Content?</h2>
                        {getInputField('description') && <p className='id' >{getInputField('description')}</p>}
                        <label >{`-> ${getInputField('type')}`}</label>
                        <label >{`-> ${getInputField('source')}`}</label>
                        {Array.from((getInputField('keywordList') as string[]) || []).map((tag, index) =>
                            <label key={'tag'+index}>{` * ${makeDisplayText(tag)}`}</label>
                        )}
                        <hr/>
                        <button className='submit-button' type='button' onClick={makeDeleteRequest}>DELETE</button>
                        <button className='alternative-button'  type='button' onClick={() => updatePopUpAction(ModelPopUpAction.NONE)}>Cancel</button>
                    </div>
                </div>}
        </div>
    );
}

export default ContentArchivePage;



/**********************************
 * Embedded Social Post Component *
 **********************************/
export const ContentArchivePreview = (props:{url?:string, source:string, maxWidth:number, height:number|undefined}) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [previewWidth, setPreviewWidth] = useState<number>(200);

    useEffect(() => {
        if(previewRef.current) setPreviewWidth(Math.min(previewRef.current.offsetWidth * 0.9, props.maxWidth));
    }, [previewRef.current?.offsetWidth]);

    return (
        <div ref={previewRef} id='content-wrapper' style={props.height ? {height: props.height} : {}} onClick={(e)=>{e.preventDefault(); e.stopPropagation();}} >
            <ErrorRenderWrapper
                description={`ContentArchivePreview - ${props.source} | ${props.url}`}
                component={<div id='content-inner' >
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
                            </div>}
                fallbackComponent={<img src={getDefaultImage(ImageDefaultEnum.NOT_FOUND)} alt='Preview Unavailable' style={{objectFit: 'contain', overflow: 'hidden'}}/>}
            />

        </div>
    );
}
