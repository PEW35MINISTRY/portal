import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { notify, processAJAXError, useAppSelector, useStatusInterval } from '../../1-Utilities/hooks';
import { LogListItem, LogLocation, LogType } from '../../0-Assets/field-sync/api-type-sync/utility-types';
import { ENVIRONMENT_TYPE, makeDisplayText } from '../../0-Assets/field-sync/input-config-sync/inputField';
import FullImagePage from '../Utility-Pages/FullImagePage';
import { blueColor, blueDarkColor, PageState, ModelPopUpAction, redColor } from '../../100-App/app-types';
import { ImageDefaultEnum } from '../../2-Widgets/ImageWidgets';
import { getEnvironment } from '../../1-Utilities/utilities';
import { ExportLogPopup, LogPageLocalNavigationButtons, LogPageS3NavigationButtons, NewLogPopup, SearchLogPopup, SettingsLogPopup, SettingsProperty } from './log-widgets';
import { formatNumberOrdinal } from '../../1-Utilities/dateFormat';
import './log.scss';


const LogPage = () => {
    const navigate = useNavigate();
    const routeLocation = useLocation();
    const { kind, action } = useParams();
    const jwt: string = useAppSelector((state) => state.account.jwt);
    const [displayList, setDisplayList] = useState<LogListItem[]>([]);

    /* Page Management */
    const [viewState, setViewState] = useState<PageState>(PageState.LOADING);
    const [popUpAction, setPopUpAction] = useState<ModelPopUpAction>(ModelPopUpAction.NONE);
    const SUPPORTED_POP_UP_ACTIONS: ModelPopUpAction[] = [ModelPopUpAction.SEARCH, ModelPopUpAction.NEW, ModelPopUpAction.EXPORT, ModelPopUpAction.SETTINGS, ModelPopUpAction.NONE];
    const [refreshInterval, setRefreshInterval] = useState<number>(process.env.REACT_APP_LOG_AUTO_UPDATE ? 150000 : 0); //2.5 min
    const [refreshTimeRemaining, setRefreshTimeRemaining] = useState<number>(0);
    const [showLocalTime, setShowLocalTime] = useState<boolean>(false);

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

        let targetPath:string = routeLocation.pathname;
        const targetType:LogType|undefined = Object.values(LogType).find((t) => t === kind?.toUpperCase());
        const targetAction:ModelPopUpAction|undefined = SUPPORTED_POP_UP_ACTIONS.find((a) => a === action?.toLowerCase());  

        if(targetType && targetAction)
            targetPath = `/portal/logs/${targetType.toLowerCase()}/${targetAction}`;
        else if(targetType)
            targetPath = `/portal/logs/${targetType.toLowerCase()}`;
                   
        if(targetPath !== routeLocation.pathname) navigate(targetPath);
        if(targetType && targetType !== type) setType(targetType);
        if(targetType && targetAction && targetAction !== popUpAction) setPopUpAction(targetAction);

        executeSearch({type: targetType}, false); //targetType undefined is default view with combined ERROR and WARN
    }, [jwt]);


    const updatePopUpAction = (newAction:ModelPopUpAction) => {
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
            navigate(`/portal/logs/${newType.toLowerCase()}`, { replace: true });
            setType(newType);
            setPopUpAction(ModelPopUpAction.NONE);            

            if(reset) {
                executeSearch({ type: newType, searchTerm: ''}, false);
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

                executeSearch({ type: targetType, location: newLocation, searchTerm: '' }, false);
                updatePopUpAction(ModelPopUpAction.NONE);
                setSearchTerm('');
            }   
        }
    }

    const executeSearch = async(override:Partial<{
        type:LogType|undefined;
        location:LogLocation;
        searchTerm:string;
        startTimestamp:number; //S3: Previous Day
        endTimestamp:number; //Local: Required for cumulativeIndex to take effect
        cumulativeIndex:number;
    }> = {}, syncOverrides:boolean = true):Promise<void> => {
        const targetType:LogType|undefined = override.hasOwnProperty('type') ? override.type : type; //Supports undefined
        await axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log${targetType ? `/${targetType.toLowerCase()}` : '/default'}`, {
            headers: { jwt },
            params: targetType ? {
                location: override.location || location,
                startTimestamp: override.startTimestamp ?? startDate?.getTime(), 
                endTimestamp: override.endTimestamp ?? endDate?.getTime(),
                search: override.searchTerm ?? searchTerm,
                cumulativeIndex: override.cumulativeIndex ?? cumulativeIndex,
                combineDuplicates
            } : {}
        })
        .then((response: { data:LogListItem[] }) => {             
            setDisplayList(response.data); 
            if(targetType && syncOverrides) {
                if(override.type !== undefined && override.type !== type) updateLogType(override.type, false);
                if(override.location !== undefined && override.location !== location) updateLogLocation(override.location, false);
                if(override.startTimestamp !== undefined && override.startTimestamp !== startDate?.getTime()) setStartDate(new Date(override.startTimestamp));
                if(override.endTimestamp !== undefined && override.endTimestamp !== endDate?.getTime()) setEndDate(new Date(override.endTimestamp));
                if(override.cumulativeIndex !== undefined && override.cumulativeIndex !== cumulativeIndex) setCumulativeIndex(override.cumulativeIndex);
                if(popUpAction === ModelPopUpAction.SEARCH) updatePopUpAction(ModelPopUpAction.NONE);
            }
            setViewState((response.data.length > 0) ? PageState.VIEW : PageState.NOT_FOUND);
            if(response.data.length === 0) setRefreshInterval(0);
        }).catch((error) => processAJAXError(error));
    }

    /* Day Orderly Management */
    useEffect(() => {
        if(endDate && (!startDate || endDate < startDate))
            setStartDate((currentStart) => (currentStart && currentStart <= endDate) ? currentStart 
                : new Date(endDate.getTime() - (24 * 60 * 60 * 1000)))}, [endDate]);

    useEffect(() => {
        if(startDate && (!endDate || startDate > endDate))
            setEndDate((currentEnd) => (currentEnd && currentEnd >= startDate) ? currentEnd 
                : new Date(startDate.getTime() + (24 * 60 * 60 * 1000)))}, [startDate]);


    const searchDay = (direction?:SearchDayDirection, override:Partial<{ type:LogType|undefined; location:LogLocation; timestamp:number; }> = {}):Promise<void> => {
        const timestampRange:number[] = calculateDayTimestamps(direction, override.timestamp);
        return executeSearch({
            ...override,
            startTimestamp: timestampRange[0],
            endTimestamp: timestampRange[1],
            type: (type ?? LogType.ERROR),
        });
    }  

    const getStartTimestamp = ():number => 
        (!type) ? new Date().getTime()
        : (startDate) ? startDate.getTime() 
        : (displayList.length > 1) ? displayList[displayList.length - 1].timestamp //Assumed sorted descending
        : new Date().getTime();
    
    const getEndTimestamp = ():number|undefined => 
        (!type) ? undefined
        : (endDate) ? endDate.getTime() 
        : (displayList.length > 1) ? displayList[0].timestamp //Assumed sorted descending
        : undefined;    


    

    /* Update Interval */
    useStatusInterval({interval: Number(refreshInterval), callback: executeSearch, statusInterval:1000,
        statusCallback: (timeLeft:number) => setRefreshTimeRemaining(timeLeft),
        cancelInterval: () => refreshInterval === 0 || cumulativeIndex !== 0 || startDate !== undefined || endDate !== undefined || popUpAction !== ModelPopUpAction.NONE
    });


    return (
        <div id='log-page'>
            <div id='log-header'>
                <button className='icon-button' onClick={() => updatePopUpAction(ModelPopUpAction.SETTINGS)}>
                    <label className='icon-button-icon'>⚙</label>
                    <label className='icon-button-label'>Settings</label>
                    {(refreshInterval > 0 && refreshTimeRemaining > 0) && <label className='icon-button-label hide-mobile'>({Math.floor(refreshTimeRemaining / 1000)})</label>}
                </button>
                <button className='icon-button' onClick={() => updatePopUpAction(ModelPopUpAction.EXPORT)}>
                    <label className='icon-button-icon'>⭳</label>
                    <label className='icon-button-label hide-tablet'>Export</label>
                </button>
                <button className='icon-button' onClick={() => updatePopUpAction(ModelPopUpAction.NEW)}>
                    <label className='icon-button-icon'>+</label>
                    <label className='icon-button-label hide-tablet'>Add</label>
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

                <button className='header-search icon-button' onClick={() => updatePopUpAction(ModelPopUpAction.SEARCH)}>
                    <label className='icon-button-icon'>⌕</label>
                    <label className='icon-button-label'>Search...</label>
                </button>
            </div>

            {(viewState === PageState.LOADING) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} backgroundColor='transparent' message='Loading...' messageColor={blueColor}
                alternativeButtonText='Reset to Default Log' onAlternativeButtonClick={() => executeSearch({})} />
                : (viewState === PageState.NOT_FOUND) ? 
                    <FullImagePage imageType={ImageDefaultEnum.EMPTY_TOMB} backgroundColor='transparent' message='No Log Entries Found' messageColor={blueColor}
                        primaryButtonText={`New ${makeDisplayText(type)} Search`} onPrimaryButtonClick={() => updatePopUpAction(ModelPopUpAction.SEARCH)}
                        footer={(location === LogLocation.LOCAL) ?
                                <LogPageLocalNavigationButtons
                                    type={type}
                                    showPreviousIndex={(displayList.length > 0)}
                                    cumulativeIndex={cumulativeIndex}
                                    latestTimestamp={(displayList.length > 0) ? displayList[0].timestamp : new Date().getTime()}
                                    executeSearch={executeSearch}
                                    refreshButtonText={`View Latest ${makeDisplayText(type)} Logs`}
                                    onRefreshButtonClick={() => { setSearchTerm(''); executeSearch({ searchTerm: '', endTimestamp: new Date().getTime(), cumulativeIndex: 0 })}}
                                />
                            : <LogPageS3NavigationButtons
                                    previousDayText={'Previous Day: ' + formatUTCDate(calculateDayTimestamps(SearchDayDirection.PREVIOUS, getStartTimestamp())[0])}
                                    searchPreviousDay={() => searchDay(SearchDayDirection.PREVIOUS, {timestamp: getStartTimestamp()})}

                                    showNextDay={(type && endDate && (endDate < new Date(new Date().setUTCHours(0, 0, 0, 0)))) == true}
                                    nextDayText={'Next Day: ' + formatUTCDate(calculateDayTimestamps(SearchDayDirection.NEXT, getEndTimestamp())[1])}
                                    searchNextDay={() => searchDay(SearchDayDirection.NEXT, {timestamp: getEndTimestamp()})}

                                    refreshButtonText={`View Latest ${makeDisplayText(type)} Logs`}
                                    onRefreshButtonClick={() => { setSearchTerm(''); executeSearch({ searchTerm: '', endTimestamp: new Date().getTime(), cumulativeIndex: 0 })}}
                                />}
                            />
                :
                <div id='log-list'>
                    {[...displayList].map((entry, index) => (
                        <LogEntryItem key={`${index}-${entry.type}-${entry.timestamp}-${JSON.stringify(entry.messages)}`} LogListItem={entry} showLocalTime={showLocalTime} />
                    ))}

                    {(viewState === PageState.VIEW && location === LogLocation.LOCAL) ?
                        <LogPageLocalNavigationButtons
                            type={type}
                            showPreviousIndex={(displayList.length > 0)}
                            cumulativeIndex={cumulativeIndex}
                            latestTimestamp={(displayList.length > 0) ? displayList[0].timestamp : new Date().getTime()}
                            executeSearch={executeSearch}
                            refreshButtonText={`Refresh ${makeDisplayText(type)} Logs`}
                            onRefreshButtonClick={executeSearch}
                        />
                    : (viewState === PageState.VIEW && location === LogLocation.S3) ? 
                        <LogPageS3NavigationButtons
                            previousDayText={'Previous Day: ' + formatUTCDate(calculateDayTimestamps(SearchDayDirection.PREVIOUS, getStartTimestamp())[0])}
                            searchPreviousDay={() => searchDay(SearchDayDirection.PREVIOUS, {timestamp: getStartTimestamp()})}
                            
                            showNextDay={(type && endDate && (endDate < new Date(new Date().setUTCHours(0, 0, 0, 0)))) == true}
                            nextDayText={'Next Day: ' + formatUTCDate(calculateDayTimestamps(SearchDayDirection.NEXT, getEndTimestamp())[1])}
                            searchNextDay={() => searchDay(SearchDayDirection.NEXT, {timestamp: getEndTimestamp()})}
                            
                            refreshButtonText={`Refresh ${makeDisplayText(type)} Logs`}
                            onRefreshButtonClick={executeSearch}
                        />
                    :
                        <></>
                    }
                </div>
            }


            {(popUpAction === ModelPopUpAction.NEW) && type &&
                <NewLogPopup
                    type={type}
                    setType={(t:LogType) => updateLogType(t, false)}
                    location={location}
                    setLocation={(l:LogLocation) => updateLogLocation(l, false)}
                    onSaveCallback={(item: LogListItem) => { setDisplayList(list => { list.unshift(item); return list; }); updatePopUpAction(ModelPopUpAction.NONE); }}
                    onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />}

            {(popUpAction === ModelPopUpAction.SEARCH) && type &&
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
                    onSearch={(criteria:{ type?:LogType, searchTerm?:string, location?:LogLocation, endTimestamp?:number, cumulativeIndex?:number}) => executeSearch(criteria)}
                    onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />
            }

            {(popUpAction === ModelPopUpAction.EXPORT) && type &&
                <ExportLogPopup
                    propertyMap={new Map<string, SettingsProperty<any>>([
                        [
                            'Type', new SettingsProperty<LogType>(type, updateLogType, Object.values(LogType))
                        ],
                        [
                            'Location', new SettingsProperty<LogLocation>(location, updateLogLocation, Object.values(LogLocation))
                        ]
                    ])}
                    onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />}

            {(popUpAction === ModelPopUpAction.SETTINGS) && type &&
                <SettingsLogPopup
                propertyMap={new Map<string, SettingsProperty<any>>([
                    [
                        'Type', new SettingsProperty<LogType>(type, updateLogType, Object.values(LogType))
                    ],
                    [
                        'Location', new SettingsProperty<LogLocation>(location, updateLogLocation, Object.values(LogLocation))
                    ],
                    [   'Refresh', new SettingsProperty<number>( refreshInterval, (value:number)=>setRefreshInterval(Number(value)),
                            [0, 30000, 60000, 150000, 300000, 900000], 
                            [0, 30000, 60000, 150000, 300000, 900000].map(m => formatIntervalTime(m))
                    )],
                    [
                        'Time', new SettingsProperty<boolean>(showLocalTime, (v) => setShowLocalTime((String(v) === 'true')), [true, false], ['Local Time', 'UTC'])
                    ]
                ])}
                onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
            />
            
            }
        </div>
    );
}

export default LogPage;


/********************
* Log Entry Listing *
*********************/
const LogEntryItem:React.FC<{ LogListItem:LogListItem; showLocalTime?:boolean }> = ({ LogListItem: { timestamp, type, messages, stackTrace, duplicateList, fileKey }, showLocalTime }) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const [expand, setExpand] = useState<boolean>(false);
    const [messageList, setMessageList] = useState<string[]>(messages || []);
    const [stackTraceList, setStackTraceList] = useState<string[]>(stackTrace || []);
    const [additionalDuplicateList, setAdditionalDuplicateList] = useState<string[]>(duplicateList || []);

    const updateDetails = (event:React.MouseEvent<HTMLLabelElement, MouseEvent>) => {
        event.stopPropagation();
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log?key=${fileKey}`, { headers: { jwt } })
            .then((response: { data: LogListItem }) => {
                notify('Acquired full log entry details.');            
                setMessageList(response.data.messages ?? []);
                setStackTraceList(response.data.stackTrace ?? []);
                setAdditionalDuplicateList(response.data.duplicateList ?? []);
            })
            .catch((error) => processAJAXError(error));
    }

    const primaryMessage = useMemo(() => messages && messages[0] ? messages[0] : 'Unknown Error ', [messages]);

    return (
        <div className='log-entry-item'>
            <div className={`log-entry-header ${expand ? 'log-close' : ''}`} onClick={() => setExpand(current => !current)}>
                <label className='log-entry-type' style={{ color: getLogColor(type) }}>{type}</label>
                <label className='log-entry-date'>{formatLogDate(new Date(timestamp), expand, showLocalTime)}</label>
                {(additionalDuplicateList && additionalDuplicateList.length > 0) && <label className='log-entry-indicator'>⎘ {additionalDuplicateList.length + 1}</label>}
                {!expand && <label className='log-entry-primary-message'>{makeDisplayText(primaryMessage)}</label>}
                {expand && fileKey && <label className='log-entry-link' onClick={updateDetails}>More Details</label>}
                <h3 className='log-entry-toggle'>{expand ? '-' : '+'}</h3>
            </div>

            {expand && (
                <div className='log-entry-details'>
                    <div className='log-entry-timestamp'><label className='log-entry-line-icon'>⏱</label>Timestamp: {timestamp} (ms)</div>
                    {messageList.length > 0 &&
                        messageList.map((message, index) => (
                            <div key={index + '-message'} className='log-entry-message'>{message}</div>
                        ))}

                    {duplicateList && duplicateList.length > 0 && (
                        <>
                            <hr />
                            {duplicateList.map((duplicate, index) => (
                                <div key={index + '-duplicate'} className='log-entry-duplicate'>
                                    <label className='log-entry-line-icon'>⎘</label>
                                    <p>{duplicate}</p>
                                </div>
                            ))}
                        </>
                    )}

                    {stackTraceList && stackTraceList.length > 0 && (
                        <>
                            <hr />
                            {stackTraceList.map((trace, index) => (
                                <div key={index + '-stack'} className='log-entry-trace'>
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

const formatLogDate = (date:Date, longForm:boolean = false, showLocalTime:boolean = false):string =>
    (!(date instanceof Date) || isNaN(date.getTime())) ? '[]' :
    '['
    + String(showLocalTime ? date.getMonth() + 1 : date.getUTCMonth() + 1).padStart(2, '0')
    + '-'
    + String(showLocalTime ? date.getDate() : date.getUTCDate()).padStart(2, '0')
    + (longForm ? '-'
        + (showLocalTime ? date.getFullYear() : date.getUTCFullYear()) : '')
    + ' '
    + String(showLocalTime ? date.getHours() : date.getUTCHours()).padStart(2, '0')
    + ':'
    + String(date.getMinutes()).padStart(2, '0')
    + (longForm ? ':'
        + String(showLocalTime ? date.getSeconds() : date.getUTCSeconds()).padStart(2, '0')
        + '.'
        + String(showLocalTime ? date.getMilliseconds() : date.getUTCMilliseconds()).padStart(3, '0') : '')
    + ']';


export function formatUTCDate(timestamp:number):string {
    const date = new Date(timestamp);
    return `${date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${formatNumberOrdinal(date.getUTCDate())}`;
}


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


/* Calculate UTC Day Boundaries for navigation toggles */
enum SearchDayDirection { PREVIOUS, NEXT }
const calculateDayTimestamps = (direction?:SearchDayDirection, timestamp?:number):[number, number] => {
    const currentTimestamp:number = timestamp ?? new Date().getTime();
    const currentDateUTC = new Date(currentTimestamp);
    currentDateUTC.setUTCHours(0, 0, 0, 0); 
    const currentDayMidnight:number = currentDateUTC.getTime();    

    //Current UTC Day Boundaries
    let startTimestamp = currentDayMidnight;
    let endTimestamp = currentDayMidnight + (24 * 60 * 60 * 1000) - 1;

    //Previous UTC Day: yesterday's midnight -> (timestamp or midnight)
    if(direction === SearchDayDirection.PREVIOUS) {
        if(timestamp && (timestamp - currentDayMidnight) > 60000) {//Earlier this Day
            startTimestamp = currentDayMidnight;
            endTimestamp = timestamp;

        } else { //Previous Full Day
            startTimestamp = currentDayMidnight - (24 * 60 * 60 * 1000);
            endTimestamp = currentDayMidnight - 1;
        }

    //Next UTC Day: (timestamp or midnight) -> tomorrow's midnight
    } else if(direction === SearchDayDirection.NEXT) {
        if(timestamp && ((currentDayMidnight + (24 * 60 * 60 * 1000)) - timestamp) > 60000) { //Finish Day
            startTimestamp = timestamp;
            endTimestamp = (currentDayMidnight + (24 * 60 * 60 * 1000) - 1);
        } else { //Next Full Day
            startTimestamp = currentDayMidnight + (24 * 60 * 60 * 1000);
            endTimestamp = currentDayMidnight + (48 * 60 * 60 * 1000) - 1;
        }        
    }

    return [startTimestamp, endTimestamp];
}
