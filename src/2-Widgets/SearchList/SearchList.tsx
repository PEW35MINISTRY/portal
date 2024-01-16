import axios from 'axios';
import React, { ReactElement, useEffect, useLayoutEffect, useState } from 'react';
import { CircleAnnouncementListItem, CircleEventListItem, CircleListItem } from '../../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem } from '../../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem } from '../../0-Assets/field-sync/api-type-sync/profile-types';
import { CircleSearchFilterEnum } from '../../0-Assets/field-sync/input-config-sync/circle-field-config';
import { RoleEnum, UserSearchFilterEnum } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import formatRelativeDate from '../../1-Utilities/dateFormat';
import { processAJAXError, useAppSelector } from '../../1-Utilities/hooks';
import { DisplayItemType, LabelListItem, ListItemTypesEnum, SHOW_TITLE_OPTIONS, SearchListKey, SearchListSearchTypesEnum, SearchListValue, extractItemID } from './searchList-types';

import './searchList.scss';

//Assets
import PROFILE_DEFAULT from '../../0-Assets/profile-default.png';
import CIRCLE_DEFAULT from '../../0-Assets/circle-default.png';
import CIRCLE_ANNOUNCEMENT_ICON from '../../0-Assets/announcement-icon-blue.png';
import PRAYER_ICON from '../../0-Assets/prayer-request-icon-blue.png';
import LIKE_ICON from '../../0-Assets/like-icon-blue.png';
import CIRCLE_EVENT_DEFAULT from '../../0-Assets/event-icon-blue.png';
import { ContentListItem } from '../../0-Assets/field-sync/api-type-sync/content-types';
import { ContentSearchFilterEnum } from '../../0-Assets/field-sync/input-config-sync/content-field-config';


const SearchList = ({...props}:{key:any, displayMap:Map<SearchListKey, SearchListValue[]>, defaultDisplayTitleKeySearch?:string, defaultDisplayTitleList?:string[], headerChildren?:ReactElement, footerChildren?:ReactElement}) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const ignoreCache:boolean = useAppSelector((state) => state.settings.ignoreCache);

    const [displayList, setDisplayList] = useState<SearchListValue[]>([]);
    const [selectedKey, setSelectedKey] = useState<SearchListKey>(new SearchListKey({displayTitle: 'Default'}));
    const [selectedKeyTitle, setSelectedKeyTitle] = useState<string>('Default'); //Sync state for <select><option> component
    const [searchButtonCache, setSearchButtonCache] = useState<Map<string, SearchListValue>|undefined>(undefined); //Quick pairing for accurate button options
    const [searchFilter, setSearchFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const getKey = (keyTitle:string = selectedKey.displayTitle):SearchListKey => Array.from(props.displayMap.keys()).find((k) => k.displayTitle === keyTitle) || new SearchListKey({displayTitle: 'Default'});
    const getList = (keyTitle:string = selectedKey.displayTitle):SearchListValue[] => props.displayMap.get(getKey(keyTitle)) || [];

    /* Sync Selected Key Title | Sync state for <select><option> component */
    useEffect(() => {
        setSelectedKeyTitle(selectedKey.displayTitle);
    }, [selectedKey]);

    /*****************
     *  Default List
     * ****************/
    useLayoutEffect(() => {        
        //Assemble defaultList of SearchListValue from all categories referenced in props.defaultDisplayTitleList
        const defaultList:SearchListValue[] = [];       
        Array.from(props.displayMap.entries()).filter(([key, itemList]) => 
            (props.defaultDisplayTitleList === undefined || Array.from(props.defaultDisplayTitleList).includes(key.displayTitle)))
            .forEach(([key, itemList]) => {
                if(itemList.length > 0) {
                    defaultList.push(new SearchListValue({displayType: ListItemTypesEnum.LABEL, displayItem: key.displayTitle, onClick: (id:number, item:DisplayItemType)=>onOptionSelection(key.displayTitle)}))
                    defaultList.push(...itemList);
                }
            });
        //No matches for defaultDisplayTitleList -> display first list
        if(defaultList.length === 0) {
            const firstEntry:[SearchListKey, SearchListValue[]] | undefined = Array.from(props.displayMap.entries()).find(([key, itemList]) => itemList.length > 0);
            if(firstEntry !== undefined) {
                defaultList.push(...firstEntry[1]);
                setSelectedKey(firstEntry[0] || new SearchListKey({displayTitle: 'Default'}));
            }

        //Default to First display Title (Even for multi display of multiple categories)
        } else if(props.defaultDisplayTitleList !== undefined && props.defaultDisplayTitleList.length > 0) {
            setSelectedKey(getKey(props.defaultDisplayTitleList[0]));
        }
        setDisplayList(defaultList);

    },[props.displayMap, props.defaultDisplayTitleKeySearch, props.defaultDisplayTitleList]);


     /********************************************************************************
     *                          SERVER SEARCH
     * Use Cache list of current circle/members/partners to optimize button settings
     * *******************************************************************************/
    const searchExecute = async(value:string = searchTerm) => { //copy over primary/alternative button settings (optimize buttons)
        const params = new URLSearchParams([['search', value], ['filter', searchFilter], ['status', selectedKey.searchCircleStatus || ''], ['ignoreCache', ignoreCache ? 'true' : 'false']]);

        await axios.get(`${process.env.REACT_APP_DOMAIN}/`+
                (getSearchType() === SearchListSearchTypesEnum.USER) ? 'api/user-list'
                : (getSearchType() === SearchListSearchTypesEnum.CIRCLE) ? 'api/circle-list'
                : (getSearchType() === SearchListSearchTypesEnum.CONTENT_ARCHIVE) ? 'api/content-approver/content-list'
                : 'search-type', { headers: { jwt: jwt }, params} )
            .then(response => {
                const cacheMap:Map<string, SearchListValue> = searchButtonCache || assembleSearchButtonCache();
                const resultList:SearchListValue[] = [];  
                const displayType:ListItemTypesEnum = ListItemTypesEnum[getSearchType() || 'USER'];

                Array.from(response.data).forEach((displayItem) => {
                    const itemID:number = extractItemID(displayItem as DisplayItemType, displayType);
                    const matchingCacheItem:SearchListValue|undefined = cacheMap.get(`${getSearchType()}-${itemID}`);

                    if(matchingCacheItem !== undefined) {
                        resultList.push(matchingCacheItem);
                    } else {
                        resultList.push(new SearchListValue({displayType, displayItem: displayItem as DisplayItemType, 
                            onClick: selectedKey.onSearchClick,
                            primaryButtonText: selectedKey.searchPrimaryButtonText,
                            onPrimaryButtonCallback: selectedKey.onSearchPrimaryButtonCallback,
                            alternativeButtonText: selectedKey.searchAlternativeButtonText,
                            onAlternativeButtonCallback: selectedKey.onSearchAlternativeButtonCallback
                        }));
                    }
                });
                setDisplayList(resultList);
                // setSelectedKey(new SearchListKey({...selectedKey, displayTitle: 'Search Results'}));
            }).catch((error) => processAJAXError(error));
    }

    
    //Save Map as: 'type-id' : SearchListValue = CIRCLE-1 : {...}
    const assembleSearchButtonCache = ():Map<string, SearchListValue> => { 
        const cacheMap = new Map();
        Array.from(props.displayMap.values()).reverse().flatMap(list => list).forEach((item:SearchListValue) => {
            const itemID:number = extractItemID(item.displayItem, item.displayType);
            if(itemID > 0)
                cacheMap.set(`${item.displayType}-${extractItemID(item.displayItem, item.displayType)}`, item);
        });
        setSearchButtonCache(cacheMap);
        return cacheMap;
    }


    /********************
     *  Input Handlers
     * ******************/
    const onOptionSelection = (keyTitle:string) => {
        setSelectedKey(getKey(keyTitle));
        setDisplayList(getList(keyTitle));
        setSearchTerm('');
    }

    const onSearchInput = (event:React.FormEvent<HTMLInputElement>) => {
        const value:string = event.currentTarget.value || '';
        setSearchTerm(value);
        if(value.length >= 3) searchExecute(value);
        else setDisplayList(getList(Array.from(props.displayMap.keys()).find((value) => (value.searchType === getSearchType()))?.displayTitle));
    }

    const getSearchType = ():SearchListSearchTypesEnum|undefined => selectedKey.searchType || undefined;

    const getSearchFilterList = ():string[] => Object.values(
          (selectedKey.searchType) === SearchListSearchTypesEnum.USER ? UserSearchFilterEnum 
        : (selectedKey.searchType) === SearchListSearchTypesEnum.CIRCLE ? CircleSearchFilterEnum
        : (selectedKey.searchType) === SearchListSearchTypesEnum.CONTENT_ARCHIVE ? ContentSearchFilterEnum
        : []);

    const getSearchTypeTitleList = ():string[] => 
        Array.from(props.displayMap.keys() || [])
            .filter(key => Array.from(props.displayMap.get(key) || []).length > 0 
                    || SHOW_TITLE_OPTIONS.includes(key.displayTitle))
            .map(key => key.displayTitle);

    return (
        <div key={props.key} id='search-side-component' >
            {props.headerChildren}

            <div id='search-header'>
                <select id='search-header-menu' className='title' onChange={({ target: { value } }) => onOptionSelection(value)} value={selectedKeyTitle} >
                    {getSearchTypeTitleList().map((displayTitle, index) =>
                        <option key={index} value={displayTitle} >{displayTitle}</option>
                    )}
                </select>
                {(getKey(selectedKeyTitle).searchType !== undefined)
                && <div id='search-header-search'>
                        <input id='search-header-field' value={searchTerm} onChange={onSearchInput} onKeyDown={(e)=>{if(e.key === 'Enter') searchExecute()}} type='text' placeholder={`${getSearchType()?.charAt(0)}${getSearchType()?.replaceAll('_', ' ').toLowerCase()?.slice(1) || 'ERROR'} search`}/>
                        <select id='search-header-filter' className='title' onChange={({ target: { value } }) => setSearchFilter(value)} defaultValue='ALL'>
                            {getSearchFilterList().map((value, index) =>
                                <option key={index} value={value} >{value?.charAt(0) || ''}{value?.toLowerCase()?.replaceAll('_', ' & ')?.substring(1,4) || ''}</option>
                            )}             
                        </select>
                    </div>}
            </div>

            <div id='search-list'>
                {displayList.map((item:SearchListValue, index) => 
                    item.displayType === ListItemTypesEnum.LABEL ?
                        <LabelItem key={`${props.key}+${index}`} {...item} label={item.displayItem as LabelListItem} onClick={item.onClick} />

                    : item.displayType === ListItemTypesEnum.USER ? 
                        <ProfileItem key={`${props.key}+${index}`} {...item} user={item.displayItem as ProfileListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : item.displayType === ListItemTypesEnum.CIRCLE ? 
                        <CircleItem key={`${props.key}+${index}`} {...item} circle={item.displayItem as CircleListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : item.displayType === ListItemTypesEnum.CIRCLE_ANNOUNCEMENT ? 
                        <CircleAnnouncementItem key={`${props.key}+${index}`} {...item} circleAnnouncement={item.displayItem as CircleAnnouncementListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : item.displayType === ListItemTypesEnum.CIRCLE_EVENT ? 
                        <CircleEventItem key={`${props.key}+${index}`} {...item} circleEvent={item.displayItem as CircleEventListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : item.displayType === ListItemTypesEnum.PRAYER_REQUEST ? 
                        <PrayerRequestItem key={`${props.key}+${index}`} {...item} prayerRequest={item.displayItem as PrayerRequestListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />
                        
                    : item.displayType === ListItemTypesEnum.PRAYER_REQUEST_COMMENT ? 
                        <PrayerRequestCommentItem key={`${props.key}+${index}`} {...item} prayerRequestComment={item.displayItem as PrayerRequestCommentListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : item.displayType === ListItemTypesEnum.CONTENT_ARCHIVE ? 
                        <ContentArchiveItem key={`${props.key}+${index}`} {...item} content={item.displayItem as ContentListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

                    : <div key={`${props.key}+${index}`}>ERROR</div>                    
                )}
            </div>            

            {props.footerChildren}
        </div>
    );
}

export default SearchList;


/********************
 *  LIST ITEM CARDS
 * ******************/

export const LabelItem = ({...props}:{key:any, label:LabelListItem, onClick?:(id:number, item:LabelListItem)=>void}) => 
        <div key={props.key} className='search-label-item' onClick={()=>props.onClick && props.onClick(0, props.label)}>
            <label className='title'>{props.label}</label>
        </div>;

export const ProfileItem = ({...props}:{key:any, user:ProfileListItem, onClick?:(id:number, item:ProfileListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:ProfileListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:ProfileListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
        <div key={props.key} className='search-profile-item' onClick={()=>props.onClick && props.onClick(props.user.userID, props.user)}>
            <div className='profile-detail-box'>
                <img src={props.user.image || PROFILE_DEFAULT} alt={props.user.displayName} />
                <label className='title name'>{props.user.firstName}<p>{props.user.displayName}</p></label>
                {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.user.userID}</label>}
            </div>
            {(props.alternativeButtonText || props.primaryButtonText) && 
                <div className='search-item-button-row' >
                        {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.user.userID, props.user);}} >{props.alternativeButtonText}</button>}
                        {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.user.userID, props.user);}} >{props.primaryButtonText}</button>}
                </div>}
        </div>);
}


export const CircleItem = ({...props}:{key:any, circle:CircleListItem, onClick?:(id:number, item:CircleListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-circle-item' onClick={()=>props.onClick && props.onClick(props.circle.circleID, props.circle)}>
        <img src={props.circle.image || CIRCLE_DEFAULT} alt={props.circle.name}/>
        <div className='circle-detail-box'>
            <label className='title name'>{props.circle.name}</label>
            <p className='status'>{props.circle.status}</p>
            {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.circle.circleID}</label>}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circle.circleID, props.circle);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick &&  props.onPrimaryButtonClick(props.circle.circleID, props.circle);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const CircleAnnouncementItem = ({...props}:{key:any, circleAnnouncement:CircleAnnouncementListItem, onClick?:(id:number, item:CircleAnnouncementListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleAnnouncementListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleAnnouncementListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-circle-announcement-item' onClick={()=>props.onClick && props.onClick(props.circleAnnouncement.announcementID, props.circleAnnouncement)} >       
        <label className='date' >{formatRelativeDate(new Date(props.circleAnnouncement.startDate || ''))}</label>
        <div className='circle-announcement-detail-box'>
            <img className='icon' src={CIRCLE_ANNOUNCEMENT_ICON} alt={'announcement-'+props.circleAnnouncement.circleID}/>
            <p className='message'>{props.circleAnnouncement.message}</p>
            {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.circleAnnouncement.circleID}| #{props.circleAnnouncement.announcementID}</label>}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circleAnnouncement.announcementID, props.circleAnnouncement);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.circleAnnouncement.announcementID, props.circleAnnouncement);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const CircleEventItem = ({...props}:{key:any, circleEvent:CircleEventListItem, onClick?:(id:number, item:CircleEventListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleEventListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleEventListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-circle-event-item' onClick={()=>props.onClick && props.onClick(props.circleEvent.eventID, props.circleEvent)} >
        <img src={props.circleEvent.image || CIRCLE_EVENT_DEFAULT} alt={props.circleEvent.name}/>
        <span className='detail-header-box'>
            <label className='title name' >{props.circleEvent.name}</label>
            <label className='date' >{formatRelativeDate(new Date(props.circleEvent.startDate), new Date(props.circleEvent.endDate), {markPassed: true})}</label>
        </span>
        <p >{props.circleEvent.description}</p>
        {(userRole === RoleEnum.ADMIN) && <label className='id'>[{props.circleEvent.circleID}] #{props.circleEvent.eventID}</label>}
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circleEvent.eventID, props.circleEvent);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.circleEvent.eventID, props.circleEvent);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const PrayerRequestItem = ({...props}:{key:any, prayerRequest:PrayerRequestListItem, onClick?:(id:number, item:PrayerRequestListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:PrayerRequestListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:PrayerRequestListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-prayer-request-item' onClick={()=>props.onClick && props.onClick(props.prayerRequest.prayerRequestID, props.prayerRequest)}>
        {props.prayerRequest.requestorProfile && 
            <div className='profile-detail-box'>
                <img className='icon' src={props.prayerRequest.requestorProfile.image || PROFILE_DEFAULT} alt={props.prayerRequest.requestorProfile.displayName} />
                <p >{props.prayerRequest.requestorProfile.displayName}</p>
                {(props.prayerRequest.prayerCount > 0) && <img className='icon' src={PRAYER_ICON} alt='prayer-count'/>}
                {(props.prayerRequest.prayerCount > 0) && <label className='count' >{props.prayerRequest.prayerCount}</label>}
            </div>}
        <label className='title name' >{props.prayerRequest.topic}</label>
        {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.prayerRequest.prayerRequestID}</label>}
        {(props.prayerRequest.tagList) && 
            <div className='tag-detail-box'>
                {[...props.prayerRequest.tagList].map((tag, index) => 
                    <p key={'tag'+index}>{tag}</p>
                )}
            </div>}
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.prayerRequest.prayerRequestID, props.prayerRequest);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.prayerRequest.prayerRequestID, props.prayerRequest);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const PrayerRequestCommentItem = ({...props}:{key:any, prayerRequestComment:PrayerRequestCommentListItem, onClick?:(id:number, item:PrayerRequestCommentListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:PrayerRequestCommentListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:PrayerRequestCommentListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-prayer-request-comment-item' onClick={()=>props.onClick && props.onClick(props.prayerRequestComment.commentID, props.prayerRequestComment)} >       
        {props.prayerRequestComment.commenterProfile && 
            <div className='profile-detail-box' >
                <img className='icon' src={props.prayerRequestComment.commenterProfile.image || PROFILE_DEFAULT} alt={props.prayerRequestComment.commenterProfile.displayName} />
                <p >{props.prayerRequestComment.commenterProfile.displayName}</p>
                {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.prayerRequestComment.prayerRequestID}| #{props.prayerRequestComment.commentID}</label>}
                {(props.prayerRequestComment.likeCount > 0) && <img className='icon' src={LIKE_ICON} alt='like-count'/>}
                {(props.prayerRequestComment.likeCount > 0) && <label className='count' >{props.prayerRequestComment.likeCount}</label>}
            </div>}
            <p className='comment'>{props.prayerRequestComment.message}</p>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.prayerRequestComment.commentID, props.prayerRequestComment);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.prayerRequestComment.commentID, props.prayerRequestComment);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const ContentArchiveItem = ({...props}:{key:any, content:ContentListItem, onClick?:(id:number, item:ContentListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:ContentListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:ContentListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-content-archive-item' onClick={()=>props.onClick && props.onClick(props.content.contentID, props.content)} >       
        <img src={CIRCLE_DEFAULT} alt={props.content.url}/>
        {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.content.contentID}</label>}
        <div className='tag-detail-box'>
            <p key={'type'}>{props.content.type}</p>
            <p key={'source'}>{props.content.source}</p>
            {(props.content.keywordList) &&
                [...props.content.keywordList].map((tag, index) => 
                    <p key={'tag'+index}>{tag}</p>
            )}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.content.contentID, props.content);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.content.contentID, props.content);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}
