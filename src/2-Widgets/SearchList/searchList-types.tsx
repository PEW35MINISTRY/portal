import { DisplayItemType, ListItemTypesEnum, SearchType } from '../../0-Assets/field-sync/input-config-sync/search-config';


/********************
 * SEARCH LIST TYPES
 * ******************/

//SearchListKey.displayTitle | Won't hide empty list to allow searching | Universal list, SearchListKey must still be specified
export const SHOW_TITLE_OPTIONS:string[] = ['Members', 'Content', 'Shared Contacts', 'Shared Circles'];
export const SHOW_TITLE_OPTIONS_ADMIN:string[] = [...SHOW_TITLE_OPTIONS, 'Profiles', 'Circles'];

export class SearchListKey { 
    displayTitle:string;
    searchType:SearchType;
    searchFilter?:string; //Matches SearchTypeInfo.searchFilterList
    onSearchClick?:(id:number, item:DisplayItemType)=>void;
    searchPrimaryButtonText?:string;
    onSearchPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void;
    searchAlternativeButtonText?:string;
    onSearchAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void;

    constructor({...props}:{displayTitle:string, searchType?:SearchType, searchFilter?:string, onSearchClick?:(id:number, item:DisplayItemType)=>void, 
        searchPrimaryButtonText?:string, onSearchPrimaryButtonCallback?:(id:number, item:DisplayItemType)=>void, searchAlternativeButtonText?:string, onSearchAlternativeButtonCallback?:(id:number, item:DisplayItemType)=>void}) {
        this.displayTitle = props.displayTitle;
        this.searchType = props.searchType || SearchType.NONE;
        this.searchFilter = props.searchFilter;
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
