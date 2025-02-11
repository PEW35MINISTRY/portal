import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processAJAXError, useAppSelector, useInterval } from '../../1-Utilities/hooks';
import { LogListItem, LogLocation, LogType } from '../../0-Assets/field-sync/api-type-sync/utility-types';
import { ENVIRONMENT_TYPE, makeDisplayText } from '../../0-Assets/field-sync/input-config-sync/inputField';
import FullImagePage from '../Utility-Pages/FullImagePage';
import { blueColor, blueDarkColor, PageState, PopUpAction, redColor } from '../../100-App/app-types';
import { ImageDefaultEnum } from '../../2-Widgets/ImageWidgets';
import { getEnvironment } from '../../1-Utilities/utilities';
import { NewLogPopup, SearchLogPopup, SettingsLogPopup, SettingsProperty } from './log-widgets';

import './log.scss';


const LogPage = () => {
    const navigate = useNavigate();
    const { kind, action } = useParams();
    const jwt: string = useAppSelector((state) => state.account.jwt);
    const [displayList, setDisplayList] = useState<LogListItem[]>([]);

    /* Page Management */
    const [viewState, setViewState] = useState<PageState>(PageState.LOADING);
    const [popUpAction, setPopUpAction] = useState<PopUpAction>(PopUpAction.NONE);
    const SUPPORTED_POP_UP_ACTIONS: PopUpAction[] = [PopUpAction.NEW, PopUpAction.SEARCH, PopUpAction.SETTINGS, PopUpAction.NONE];
    const [refreshInterval, setRefreshInterval] = useState<number>(150000); //2.5 min

    /* Search Criteria */
    const [type, setType] = useState<LogType|undefined>(undefined);
    const [location, setLocation] = useState<LogLocation>((getEnvironment() === ENVIRONMENT_TYPE.LOCAL) ? LogLocation.LOCAL : LogLocation.S3);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [combineDuplicates, setCombineDuplicates] = useState<boolean>(true);
    const [cumulativeIndex, setCumulativeIndex] = useState<number>(0); // Last read entry index

    useEffect(() => {
        if(jwt.length === 0) return;

        const targetType:LogType|undefined = Object.values(LogType).find((t) => t === kind?.toUpperCase());
        const targetAction:PopUpAction|undefined = SUPPORTED_POP_UP_ACTIONS.find((a) => a === action?.toLowerCase());     
        
        if(targetType) {
            executeSearch({type: targetType});

            if(targetAction) {
                navigate(`/portal/logs/${targetType.toLowerCase()}/${targetAction}`);
                setPopUpAction(targetAction);
            } else
                navigate(`/portal/logs/${targetType.toLowerCase()}`);

        } else {
            navigate(`/portal/logs`);
            executeSearch({type: undefined});
        }
    }, [jwt]);


    const updatePopUpAction = (newAction:PopUpAction) => {
        if(SUPPORTED_POP_UP_ACTIONS.includes(newAction) && popUpAction !== newAction) {
            const targetType:LogType = type ?? LogType.ERROR;
            if(type === undefined) setType(targetType); //Default | Must be initialized for popups

            navigate(`/portal/logs/${targetType.toLowerCase()}${newAction.length > 0 ? `/${newAction}` : ''}`, { replace: true });
            setPopUpAction(newAction);            
        }
    }

    /* Update State and Fetch Default */
    const updateLogType = (newType:LogType, reset:boolean = true) => {
        if(Object.values(LogType).includes(newType) && type !== newType) {
            navigate(`/portal/logs/${newType.toLowerCase()}${reset ? '' : `/${popUpAction}`}`, { replace: true });
            setType(newType);

            if(reset) {
                executeSearch({ type: newType, searchTerm: ''});
                setPopUpAction(PopUpAction.NONE);
                setSearchTerm('');
                setCumulativeIndex(0);
            }            
        }
    }

    const updateLogLocation = (newLocation:LogLocation, reset:boolean = true) => {
        if(location !== newLocation) {
            setLocation(newLocation);            

            if(reset) {
                const targetType:LogType = type ?? LogType.ERROR;
                if(type === undefined) updateLogType(targetType, false); //Default View

                executeSearch({ type: targetType, location: newLocation, searchTerm: '' });
                setPopUpAction(PopUpAction.NONE);
                setSearchTerm('');
            }   
        }
    }

    const executeSearch = async(override:Partial<{
        type:LogType|undefined;
        location:LogLocation;
        searchTerm:string;
        endTimestamp:number; //Required for cumulativeIndex to take effect
        cumulativeIndex:number;
    }> = {}) => {
        const targetType:LogType|undefined = override.hasOwnProperty('type') ? override.type : type; //Supports undefined
        await axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log${targetType ? `/${targetType.toLowerCase()}` : '/default'}`, {
            headers: { jwt },
            params: targetType ? {
                location: override.location || location,
                startTimestamp: startDate?.getTime(), 
                endTimestamp: override.endTimestamp ?? endDate?.getTime(),
                search: override.searchTerm ?? searchTerm,
                cumulativeIndex: override.cumulativeIndex ?? cumulativeIndex,
                combineDuplicates
            } : {}
        })
        .then((response: { data:LogListItem[] }) => { 
            setDisplayList(response.data); 
            if(targetType) {
                if(override.type !== undefined && override.type !== type) updateLogType(override.type, false);
                if(override.location !== undefined && override.location !== location) updateLogLocation(override.location, false);
                if(override.endTimestamp !== undefined && override.endTimestamp !== endDate?.getTime()) setEndDate(new Date(override.endTimestamp));
                if(override.cumulativeIndex !== undefined && override.cumulativeIndex !== cumulativeIndex) setCumulativeIndex(override.cumulativeIndex);
                if(popUpAction === PopUpAction.SEARCH) updatePopUpAction(PopUpAction.NONE);
            }
            setViewState((response.data.length > 0) ? PageState.VIEW : PageState.NOT_FOUND);
        }).catch((error) => processAJAXError(error));
    }


    /* Update Interval */
    useInterval({interval: refreshInterval, callback: executeSearch,
        cancelInterval: () => refreshInterval === 0 || cumulativeIndex !== 0 || startDate !== undefined || endDate !== undefined || popUpAction !== PopUpAction.NONE
    });


    return (
        <div id='log-page'>
            <div id='log-header'>
                <button className='icon-button' onClick={() => updatePopUpAction(PopUpAction.SETTINGS)}>
                    <label className='icon-button-icon'>⚙</label>
                    <label className='icon-button-label'>Settings</label>
                    {(refreshInterval > 0) && <label className='icon-button-label hide-mobile'>({formatIntervalTime(refreshInterval, false)})</label>}
                </button>
                <button className='icon-button' onClick={() => updatePopUpAction(PopUpAction.NEW)}>
                    <label className='icon-button-icon'>+</label>
                    <label className='icon-button-label'>Add</label>
                </button>

                <div className='typeSelection'>
                    <label className='header-label hide-mobile'>Type: </label>
                    <select value={type ?? 'DEFAULT'} onChange={(e) => {
                        updateLogType(LogType[e.target.value as keyof typeof LogType]);
                        executeSearch({ type: LogType[e.target.value as keyof typeof LogType] });
                    }}>
                        <option value='DEFAULT' disabled hidden>Default</option>
                        {Object.values(LogType).map((logType) => (
                            <option key={logType} value={logType}>
                                {makeDisplayText(logType)}
                            </option>
                        ))}
                    </select>
                </div>

                <button className='header-search icon-button' onClick={() => updatePopUpAction(PopUpAction.SEARCH)}>
                    <label className='icon-button-icon'>⌕</label>
                    <label className='icon-button-label'>Search...</label>
                </button>
            </div>

            {(viewState === PageState.LOADING) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} backgroundColor='transparent' message='Loading...' messageColor={blueColor}
                alternativeButtonText='Reset to Default Log' onAlternativeButtonClick={() => executeSearch({})} />
                : (viewState === PageState.NOT_FOUND) ? <FullImagePage imageType={ImageDefaultEnum.EMPTY_TOMB} backgroundColor='transparent' message='No Log Entries Found' messageColor={blueColor}
                                                            primaryButtonText={`New ${makeDisplayText(type)} Search`} onPrimaryButtonClick={() => updatePopUpAction(PopUpAction.SEARCH)}
                                                            alternativeButtonText={`View Latest ${makeDisplayText(type)} Log`} onAlternativeButtonClick={() => {
                                                                setSearchTerm(''); executeSearch({ type: undefined });
                                                            }} />
                :
                <div id='log-list'>
                    {[...displayList].map((entry, index) => (
                        <LogEntryItem key={`${index}-${entry.type}-${entry.timestamp}-${JSON.stringify(entry.messages)}`} LogListItem={entry} />
                    ))}

                    {(viewState === PageState.VIEW) && (type !== undefined) && (displayList.length > 0) &&
                        <button key='previous-page' className='alternative-button next-page-button' type='button' onClick={() => executeSearch({ cumulativeIndex: cumulativeIndex + 1, endTimestamp:displayList[displayList.length - 1].timestamp })}>Previous Page</button>}
                </div>
            }


            {(popUpAction === PopUpAction.NEW) && type &&
                <NewLogPopup
                    type={type}
                    setType={(t:LogType) => updateLogType(t, false)}
                    location={location}
                    setLocation={(l:LogLocation) => updateLogLocation(l, false)}
                    onSaveCallback={(item: LogListItem) => { setDisplayList(list => { list.unshift(item); return list; }); updatePopUpAction(PopUpAction.NONE); }}
                    onCancel={() => updatePopUpAction(PopUpAction.NONE)}
                />}

            {(popUpAction === PopUpAction.SEARCH) && type &&
                <SearchLogPopup
                    type={type}
                    /* setType() omitted to prevent triggered fetch */
                    location={location}
                    /* setLocation() omitted to prevent triggered fetch */
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    combineDuplicates={combineDuplicates}
                    setCombineDuplicates={setCombineDuplicates}
                    onSearch={(criteria:{ type?:LogType, searchTerm?:string, cumulativeIndex?:number}) => executeSearch(criteria)}
                    onCancel={() => updatePopUpAction(PopUpAction.NONE)}
                />
            }

            {(popUpAction === PopUpAction.SETTINGS) && type &&
                <SettingsLogPopup
                propertyMap={new Map<string, SettingsProperty<any>>([
                    [
                        'Type', new SettingsProperty<LogType>(type, updateLogType, Object.values(LogType))
                    ],
                    [
                        'Location', new SettingsProperty<LogLocation>(location, updateLogLocation, Object.values(LogLocation))
                    ],
                    [   'Refresh', new SettingsProperty<number>( refreshInterval, setRefreshInterval,
                            [0, 30000, 60000, 150000, 300000, 900000], 
                            [0, 30000, 60000, 150000, 300000, 900000].map(m => formatIntervalTime(m))
                    )]
                ])}
                onCancel={() => updatePopUpAction(PopUpAction.NONE)}
            />
            
            }
        </div>
    );
}

export default LogPage;


/********************
* Log Entry Listing *
*********************/
const LogEntryItem: React.FC<{ LogListItem: LogListItem }> = ({ LogListItem: { timestamp, type, messages, stackTrace, duplicateList, fileKey } }) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const [expand, setExpand] = useState<boolean>(false);

    const primaryMessage = messages && messages[0] ? messages[0] : 'Unknown Error ';

    const updateDetails = (event:React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
        event.stopPropagation();
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log?key=${fileKey}`, { headers: { jwt } })
            .then((response: { data: LogListItem }) => {
                messages = response.data.messages;
                stackTrace = response.data.stackTrace;
                duplicateList = response.data.duplicateList;
            })
            .catch((error) => processAJAXError(error));
    }

    return (
        <div className='log-entry-item'>
            <div className={`log-entry-header ${expand ? 'log-close' : ''}`} onClick={() => setExpand(current => !current)}>
                <label className='log-entry-type' style={{ color: getLogColor(type) }}>{type}</label>
                <label className='log-entry-date'>{formatLogDate(new Date(timestamp), expand)}</label>
                {(duplicateList && duplicateList.length > 0) && <label className='log-entry-indicator'>⎘ {duplicateList.length + 1}</label>}
                {!expand && <label className='log-entry-primary-message'>{makeDisplayText(primaryMessage)}</label>}
                {expand && fileKey && <label className='log-entry-link' onClick={updateDetails}>More Details</label>}
                <h3 className='log-entry-toggle'>{expand ? '-' : '+'}</h3>
            </div>

            {expand && (
                <div className='log-entry-details'>
                    {messages.length > 0 &&
                        messages.map((message, index) => (
                            <div key={index} className='log-entry-message'>{message}</div>
                        ))}

                    {duplicateList && duplicateList.length > 0 && (
                        <>
                            <hr />
                            {duplicateList.map((duplicate, index) => (
                                <div key={index} className='log-entry-duplicate'>
                                    <label className='log-entry-line-icon'>⎘</label>
                                    <p>{duplicate}</p>
                                </div>
                            ))}
                        </>
                    )}

                    {stackTrace && stackTrace.length > 0 && (
                        <>
                            <hr />
                            {stackTrace.map((trace, index) => (
                                <div key={index} className='log-entry-trace'>
                                    <label className='log-entry-line-icon'>{'>'.repeat(index + 1)}</label>
                                    <p>{trace}</p>
                                </div>
                            ))}
                        </>
                    )}

                </div>
            )}
        </div>
    );
};


/* UTILITIES */
const LOG_TYPE_COLORS: { [key in LogType]:string } = {
    [LogType.ERROR]: redColor,
    [LogType.WARN]: '#daa520', //goldenrod
    [LogType.DB]: '#470047', //Purple
    [LogType.AUTH]: '#004c00', //Green
    [LogType.EVENT]: blueDarkColor,
};

const getLogColor = (type:LogType):string => LOG_TYPE_COLORS[type] || 'black';


const formatLogDate = (date:Date, longForm:boolean = false):string => (!(date instanceof Date) || isNaN(date.getTime())) ? '[]' :
    '['
    + String(date.getMonth() + 1).padStart(2, '0')
    + '-'
    + String(date.getDate()).padStart(2, '0')
    + (longForm ? '-'
        + date.getFullYear() : '')
    + ' '
    + String(date.getHours()).padStart(2, '0')
    + ':'
    + String(date.getMinutes()).padStart(2, '0')
    + (longForm ? ':'
        + String(date.getSeconds()).padStart(2, '0')
        + '.'
        + String(date.getMilliseconds()).padStart(3, '0') : '')
    + ']';


const formatIntervalTime = (ms:number, longForm:boolean = true):string => {
    if(ms == 0)
        return longForm ? 'Pause' : '-';

    else if(ms >= 60000) {
        const minutes = ms / 60000;
        return longForm ? `${minutes} minutes` : `${minutes} min`;

    } else if(ms >= 1000) {
        const seconds = ms / 1000;
        return longForm ? `${seconds} seconds` : `${seconds} sec`;
        
    } else
        return `${ms} ms`;
};
