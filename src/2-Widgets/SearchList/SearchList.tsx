import axios from 'axios';
import React, { ReactElement, useEffect, useLayoutEffect, useState } from 'react';
import { CircleAnnouncementItem, CircleEventItem, CircleItem, ContentArchiveItem, LabelItem, PartnerItem, PrayerRequestCommentItem, PrayerRequestItem, ProfileItem } from './SearchListItemCards';
import { CircleAnnouncementListItem, CircleEventListItem, CircleListItem } from '../../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem } from '../../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { PartnerListItem, ProfileListItem } from '../../0-Assets/field-sync/api-type-sync/profile-types';
import SearchDetail, { ListItemTypesEnum, DisplayItemType, LabelListItem, SearchType, SearchTypeInfo, SEARCH_MIN_CHARS } from '../../0-Assets/field-sync/input-config-sync/search-config';
import { processAJAXError, useAppSelector } from '../../1-Utilities/hooks';
import { SHOW_TITLE_OPTIONS, SearchListKey, SearchListValue} from './searchList-types';
import { ContentListItem } from '../../0-Assets/field-sync/api-type-sync/content-types';

import './searchList.scss';
import './searchListItemCards.scss';


const SearchList = ({...props}:{key:any, displayMap:Map<SearchListKey, SearchListValue[]>, defaultDisplayTitleKeySearch?:string, defaultDisplayTitleList?:string[], headerChildren?:ReactElement, footerChildren?:ReactElement}) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const ignoreCache:boolean = useAppSelector((state) => state.settings.ignoreCache);

    const [displayList, setDisplayList] = useState<SearchListValue[]>([]);
    const [selectedKey, setSelectedKey] = useState<SearchListKey>(new SearchListKey({displayTitle: 'Default'}));
    const [selectedKeyTitle, setSelectedKeyTitle] = useState<string>('Default'); //Sync state for <select><option> component
    const [selectedDetail, setSelectedDetail] = useState<SearchTypeInfo<DisplayItemType>>(SearchDetail[SearchType.NONE]);
    const [searchButtonCache, setSearchButtonCache] = useState<Map<string, SearchListValue>|undefined>(undefined); //Quick pairing for accurate button options
    const [searchRefine, setSearchRefine] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const getKey = (keyTitle:string = selectedKey.displayTitle):SearchListKey => Array.from(props.displayMap.keys()).find((k) => k.displayTitle === keyTitle) || new SearchListKey({displayTitle: 'Default'});
    const getList = (keyTitle:string = selectedKey.displayTitle):SearchListValue[] => props.displayMap.get(getKey(keyTitle)) || [];

    /* Sync state for <select><option> component */
    useEffect(() => {
        setSelectedKeyTitle(selectedKey.displayTitle);
        setSelectedDetail(SearchDetail[selectedKey.searchType]);
    }, [selectedKey]);

    /*****************
     *  Default List
     * ****************/
    useLayoutEffect(() => {        
        //Assemble defaultList of SearchListValue from all categories referenced in props.defaultDisplayTitleList
        const defaultList:SearchListValue[] = [];       
        Array.from(props.displayMap.entries())
            .filter(([key, itemList]) => (props.defaultDisplayTitleList === undefined || Array.from(props.defaultDisplayTitleList).includes(key.displayTitle)))
            .sort(([keyA], [keyB]) => (props.defaultDisplayTitleList?.indexOf(keyA.displayTitle) || 0) - (props.defaultDisplayTitleList?.indexOf(keyB.displayTitle) || 0))
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
            setSelectedKey(getKey(props.defaultDisplayTitleKeySearch || props.defaultDisplayTitleList[0]));
        }
        setDisplayList(defaultList);

    },[props.displayMap, props.defaultDisplayTitleKeySearch, props.defaultDisplayTitleList]);


     /********************************************************************************
     *                          SERVER SEARCH
     * Use Cache list of current circle/members/partners to optimize button settings
     * *******************************************************************************/
    const searchExecute = async(value:string = searchTerm) => { //copy over primary/alternative button settings (optimize buttons)
        if(selectedKey.searchType === undefined || selectedKey.searchType === SearchType.NONE) {
            return;
        }

        const params = new URLSearchParams([['search', value]]);
        if(selectedDetail.searchRefineList.length > 0 && searchRefine !== undefined) params.set('refine', searchRefine);
        if(selectedDetail.searchFilterList.length > 0 && selectedKey.searchFilter !== undefined) params.set('filter', selectedKey.searchFilter);
        if(selectedDetail.cacheAvailable) params.set('ignoreCache', ignoreCache ? 'true' : 'false');

        await axios.get(`${process.env.REACT_APP_DOMAIN}`+ selectedDetail.route, { headers: { jwt: jwt }, params} )
            .then((response:{data:DisplayItemType[]}) => {
                const cacheMap:Map<string, SearchListValue> = searchButtonCache || assembleSearchButtonCache();
                const resultList:SearchListValue[] = [];  
                const displayType:ListItemTypesEnum = selectedDetail.itemType;

                Array.from(response.data).forEach((displayItem) => {
                    const itemID:number = selectedDetail.getID(displayItem);
                    const matchingCacheItem:SearchListValue|undefined = cacheMap.get(`${selectedKey.searchType}-${itemID}`);

                    if(matchingCacheItem !== undefined) {
                        resultList.push(matchingCacheItem);
                    } else {
                        resultList.push(new SearchListValue({displayType, displayItem: displayItem, 
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
            const itemID:number = selectedDetail.getID(item.displayItem);
            if(itemID > 0)
                cacheMap.set(`${item.displayType}-${selectedDetail.getID(item.displayItem)}`, item);
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
        if(value.length >= SEARCH_MIN_CHARS) searchExecute(value);
    }

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
                {(getKey(selectedKeyTitle).searchType !== SearchType.NONE)
                && <div id='search-header-search'>
                        <input id='search-header-field' value={searchTerm} onChange={onSearchInput} onKeyDown={(e)=>{if(e.key === 'Enter') searchExecute()}} type='text' placeholder={SearchDetail[selectedKey.searchType].displayTitle}/>
                        <select id='search-header-refine' className='title' onChange={({ target: { value } }) => setSearchRefine(value)} defaultValue='ALL'>
                            {[...SearchDetail[selectedKey.searchType].searchRefineList].map((value, index) =>
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

                    : item.displayType === ListItemTypesEnum.PARTNER ? 
                        <PartnerItem key={`${props.key}+${index}`} {...item} partner={item.displayItem as PartnerListItem} onClick={item.onClick} onPrimaryButtonClick={item.onPrimaryButtonCallback} onAlternativeButtonClick={item.onAlternativeButtonCallback} />

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
