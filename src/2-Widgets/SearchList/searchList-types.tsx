import { CircleListItem, CircleAnnouncementListItem, CircleEventListItem } from '../../0-Assets/field-sync/api-type-sync/circle-types';
import { PrayerRequestCommentListItem, PrayerRequestListItem } from '../../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem } from '../../0-Assets/field-sync/api-type-sync/profile-types';
import { CircleStatusEnum } from '../../0-Assets/field-sync/input-config-sync/circle-field-config';


/********************
 * SEARCH LIST TYPES
 * ******************/

/* Supported List Item Types in SearchList */
export type DisplayItemType = LabelListItem | ProfileListItem | CircleListItem | CircleAnnouncementListItem | CircleEventListItem | PrayerRequestListItem | PrayerRequestCommentListItem;

export type LabelListItem = string;

export const extractItemID = (displayItem:DisplayItemType, displayType:ListItemTypesEnum|undefined):number =>
    (displayType === ListItemTypesEnum.USER) ? (displayItem as ProfileListItem).userID
    : (displayType === ListItemTypesEnum.CIRCLE) ? (displayItem as CircleListItem).circleID
    : (displayType === ListItemTypesEnum.CIRCLE_ANNOUNCEMENT) ? (displayItem as CircleAnnouncementListItem).announcementID
    : (displayType === ListItemTypesEnum.CIRCLE_EVENT) ? (displayItem as CircleEventListItem).eventID
    : (displayType === ListItemTypesEnum.PRAYER_REQUEST) ? (displayItem as PrayerRequestListItem).prayerRequestID
    : -1;

export enum SearchListSearchTypesEnum { //Must match ListItemTypesEnum
    USER = 'USER',
    CIRCLE = 'CIRCLE'
}

export enum ListItemTypesEnum {
    LABEL = 'LABEL',
    USER = 'USER',
    CIRCLE = 'CIRCLE',
    CIRCLE_ANNOUNCEMENT = 'CIRCLE_ANNOUNCEMENT',
    CIRCLE_EVENT = 'CIRCLE_EVENT',
    PRAYER_REQUEST = 'PRAYER_REQUEST',
    PRAYER_REQUEST_COMMENT = 'PRAYER_REQUEST_COMMENT',
}

//Won't hide empty list to allow searching | Universal list, SearchListKey must still be specified
export const SHOW_TITLE_OPTIONS:string[] = ['Profiles', 'Circles', 'Members', 'Events'];

export class SearchListKey { 
    displayTitle:string;
    searchType:SearchListSearchTypesEnum|undefined;
    searchCircleStatus:CircleStatusEnum|undefined;
    onSearchClick?:(id:number, item:DisplayItemType)=>void;
    searchPrimaryButtonText?:string;
    onSearchPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void;
    searchAlternativeButtonText?:string;
    onSearchAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void;

    constructor({...props}:{displayTitle:string, searchType?:SearchListSearchTypesEnum, searchCircleStatus?:CircleStatusEnum, onSearchClick?:(id:number, item:DisplayItemType)=>void, 
        searchPrimaryButtonText?:string, onSearchPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void, searchAlternativeButtonText?:string, onSearchAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void}) {
        this.displayTitle = props.displayTitle;
        this.searchType = props.searchType;
        this.searchCircleStatus = props.searchCircleStatus;
        this.onSearchClick = props.onSearchClick;
        this.searchPrimaryButtonText = props.searchPrimaryButtonText;
        this.onSearchPrimaryButtonCallback = props.onSearchPrimaryButtonCallback;
        this.searchAlternativeButtonText = props.searchAlternativeButtonText;
        this.onSearchAlternativeButtonCallback = props.onSearchAlternativeButtonCallback;
    }
}

export class SearchListValue {         //Every list item is wrapped in this view | allows list items of different types
    displayType:ListItemTypesEnum;
    displayItem:DisplayItemType;
    onClick?:(id:number, item:DisplayItemType)=>void;
    primaryButtonText?:string;
    onPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void;
    alternativeButtonText?:string;
    onAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void;
    

    constructor({...props}:{displayType:ListItemTypesEnum, displayItem:DisplayItemType, onClick?:(id:number, item:DisplayItemType)=>void, 
        primaryButtonText?:string, onPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void, alternativeButtonText?:string, onAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void}) {

        this.displayType = props.displayType;
        this.displayItem = props.displayItem;
        this.onClick = props.onClick;
        this.primaryButtonText = props.primaryButtonText;
        this.onPrimaryButtonCallback = props.onPrimaryButtonCallback;
        this.alternativeButtonText = props.alternativeButtonText;
        this.onAlternativeButtonCallback = props.onAlternativeButtonCallback;
    }
}
