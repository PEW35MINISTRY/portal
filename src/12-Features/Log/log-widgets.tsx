import React, { useRef, useState, useEffect, useMemo } from 'react';
import axios, { AxiosResponse } from 'axios';
import { LogType, LogLocation, LogListItem } from '../../0-Assets/field-sync/api-type-sync/utility-types';
import { getDateDaysFuture } from '../../0-Assets/field-sync/input-config-sync/circle-field-config';
import { getShortDate } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import { useAppSelector, notify, processAJAXError } from '../../1-Utilities/hooks';
import { makeDisplayText } from '../../1-Utilities/utilities';
import { ToastStyle } from '../../100-App/app-types';


/****************
* Filter Search *
*****************/
export const SearchLogPopup = ({ type, location, searchTerm, setSearchTerm, startDate, setStartDate, endDate, setEndDate, combineDuplicates, setCombineDuplicates,
    onSearch, onCancel }: {
        type:LogType, location:LogLocation, searchTerm:string, setSearchTerm:(value: string) => void, startDate?: Date, setStartDate: (value:Date) => void, endDate?:Date, setEndDate:(value:Date) => void, combineDuplicates:boolean, setCombineDuplicates:(value:boolean) => void,
        onSearch: (criteria: { type?:LogType, searchTerm?:string, location?:LogLocation, endTimestamp?:number, cumulativeIndex?:number }) => void, onCancel?:() => void,
    }) => {
    const searchRef = useRef<HTMLInputElement | null>(null);
    const [searchType, setSearchType] = useState<LogType>(type); //Separate to not trigger a search
    const [searchLocation, setSearchLocation] = useState<LogLocation>(location); //Separate to not trigger a search
    const [startIndex, setStartIndex] = useState<number>(0); //Not saved to LogPage & requires endTimestamp to also be set

    //Auto select on load
    useEffect(() => {
        if(searchRef.current) {
            searchRef.current?.focus();
        }
    }, []);

    const onSearchHandler = () => {
        onSearch({
            type: searchType,
            location: searchLocation,
            //searchTerm is provided with LogState.searchTerm
            endTimestamp: endDate?.getTime(),
            cumulativeIndex: startIndex,
        });
    }


    return (
        <div className='center-absolute-wrapper' onClick={() => onCancel && onCancel()}>
            <div id='search-log-pop-up' className='center-absolute-inside' onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => {
                    if(e.key === 'Enter') {
                        onSearchHandler();
                    } else if(e.key === 'Delete') {
                        setSearchTerm('');
                    } else if(e.key === 'Escape') {
                        onCancel && onCancel();
                    }
                }}>
                <h2>Search</h2>

                <input ref={searchRef} type='text' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                <div className='log-option-box'>
                    <label>Start</label>
                    <input type='date' value={getShortDate(startDate?.toISOString() || getDateDaysFuture(-7).toISOString())} onChange={(e) => setStartDate(new Date(e.target.value))} />
    
                    <label>End</label>
                    <input type='date' value={getShortDate(endDate?.toISOString() || new Date().toISOString())} onChange={(e) => setEndDate(new Date(e.target.value))} />

                    <label>Type</label>
                    <select value={searchType} onChange={(e) => setSearchType(LogType[e.target.value as keyof typeof LogType])} autoComplete='off'>
                        {Object.values(LogType).map((t) => (
                            <option key={'type-' + t} value={t}>{makeDisplayText(t)}</option>
                        ))}
                    </select>

                    <label>Source</label>
                    <select value={searchLocation} onChange={(e) => setSearchLocation(LogLocation[e.target.value as keyof typeof LogLocation])} autoComplete='off'>
                        {Object.values(LogLocation).map((l) => (
                            <option key={'location-' + l} value={l}>{makeDisplayText(l)}</option>
                        ))}
                    </select>
                
                    <label>Condense</label>
                    <select value={combineDuplicates ? 'true' : 'false'} onChange={(e) => setCombineDuplicates(e.target.value === 'true')} autoComplete='off'>
                        <option key={'duplicate-yes'} value={'true'}>Yes</option>
                        <option key={'duplicate-no'} value={'false'}>No</option>
                    </select>

                    {(endDate && searchLocation === LogLocation.LOCAL) &&
                        <>
                            <label>Index</label>
                            <input type='number' value={startIndex} onChange={(e) => setStartIndex(Number(e.target.value))} min={0} autoComplete='off'/>
                        </>
                    }
                </div>

                <button className='submit-button' type='button' onClick={() => onSearchHandler()}>SEARCH</button>
                <button className='alternative-button' type='button' onClick={() => onCancel && onCancel()}>Cancel</button>
            </div>
        </div>
    );
};


/**************
* Add New Log *
***************/
type NewLogTypeOptions = LogType|'ALERT';
export const NewLogPopup = ({ type, setType, location, setLocation, onSaveCallback, onCancel }: { type:LogType, setType:Function, location:LogLocation, setLocation:Function, onSaveCallback?:(item:LogListItem) => void, onCancel?:Function }) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [newLogType, setNewLogType] = useState<NewLogTypeOptions>(type);

    const updateLogType = (t:string) => {
        setNewLogType(t as NewLogTypeOptions);
        setType((t === 'ALERT') ? LogType.ERROR : LogType[t as keyof typeof LogType]);
    }

    //Auto select on load
    useEffect(() => {
        if(inputRef.current) {
            inputRef.current?.focus();
        }
    }, []);

    const saveLogEntry = () => axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${newLogType}`, messages, { headers: { jwt } })
        .then((response: { data: LogListItem }) => {
            notify(`${makeDisplayText(newLogType)} Entry Saved`, ToastStyle.SUCCESS);
            onSaveCallback && onSaveCallback(response.data);
        })
        .catch((error) => processAJAXError(error));

    const onInputHandler = (index: number, line: string) => {

        setMessages((currentList) => {
            const list = [...currentList]; //Copy for new reference
            if (index === list.length)
                list.push(line);
            else
                list[index] = line;
            return list;
        });
    }

    return (
        <div className='center-absolute-wrapper' onClick={() => onCancel && onCancel()}>
            <div id='new-log-pop-up' className='center-absolute-inside' onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => {
                    if(e.key === 'Enter') {
                        saveLogEntry();
                    } else if(e.key === 'Delete') {
                        setMessages([]);
                    } else if(e.key === 'Escape') {
                        onCancel && onCancel();
                    }
                }}>
                <h2>New Log Entry</h2>

                <div className='log-message-box'>
                    {[...messages, ''].map((message, index) => (
                        <textarea ref={(index === messages.length) ? inputRef : undefined} key={'new-log-' + index} className='log-input-line' value={message} onChange={(e) => onInputHandler(index, e.target.value)} placeholder='Add line...' />
                    ))}
                </div>
                    
                <div className='log-option-box'>
                    <label>Type</label>
                    <select value={newLogType} onChange={(e) => updateLogType(e.target.value)} autoComplete='off'>
                        {['ALERT', ...Object.values(LogType)].map((t) => (
                            <option key={'type-' + t} value={t}>{makeDisplayText(t)}</option>
                        ))}
                    </select>

                    <label>Location</label>
                    <select value={location} onChange={(e) => setLocation(LogLocation[e.target.value as keyof typeof LogLocation])} autoComplete='off'>
                        {Object.values(LogLocation).map((l) => (
                            <option key={'location-' + l} value={l}>{makeDisplayText(l)}</option>
                        ))}
                    </select>
                </div>

                <button className='submit-button' type='button' onClick={saveLogEntry}>SAVE</button>
                <button className='alternative-button' type='button' onClick={() => onCancel && onCancel()}>Cancel</button>
            </div>
        </div>
    );
};


export const ExportLogPopup = ({ propertyMap, onCancel }: { propertyMap: Map<string, SettingsProperty<any>>, onCancel?: () => void }) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const type:string = useMemo(() => String(propertyMap.get('Type')?.value ?? LogType.ERROR), [propertyMap]); //Uses Label Name
    const location:string = useMemo(() => String(propertyMap.get('Location')?.value ?? LogType.ERROR), [propertyMap]); //Uses Label Name

    /* DOWNLOAD LOG FILE | Server initiates file stream */
    const downloadLog = (triggerDownload:boolean = true) => axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${type}/download?location=${location}`, { headers: { jwt }, responseType: 'blob' })
        .then((response: AxiosResponse<Blob>) => {
            const fileBlob = response.data;
            const fileURL = URL.createObjectURL(fileBlob);
            
            if(triggerDownload) {
                notify(`${makeDisplayText(type)} Download Initiated`, ToastStyle.SUCCESS);
                //Server provides filename
                const contentDisposition = response.headers['content-disposition'];
                const matches = /filename='([^']*)'/.exec(contentDisposition ?? '');
                const filename = (matches && matches[1]) || `${type.toLowerCase()}-log.txt`;

                const downloadLink = document.createElement('a');
                downloadLink.href = fileURL;
                downloadLink.download = filename;
                downloadLink.click();
            
            //Open file in new tab
            } else {
                const newTab = window.open(fileURL, '_blank');
                if(newTab) notify(`${makeDisplayText(type)} Opened in New Tab`, ToastStyle.SUCCESS);
                else notify(`Unable to Open ${makeDisplayText(type)} File`, ToastStyle.ERROR);
            }
            onCancel && onCancel();
        })
        .catch((error) => processAJAXError(error));


    return (
        <div className='center-absolute-wrapper' onClick={() => onCancel && onCancel()}>
            <div id='export-log-pop-up' className='center-absolute-inside' onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => {
                    if(e.key === 'Escape') {
                        onCancel && onCancel();
                    }
                }}>
                <h2>Exports</h2>

                <div className='log-option-box'>
                    { Array.from(propertyMap.entries()).map(([key, { value, setValue, optionList, displayList }]) =>
                        <React.Fragment key={key}>
                            <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                            <select value={optionList.includes(value) ? String(value) : undefined} onChange={(e) => setValue(e.target.value)} autoComplete='off'>
                                <option value='' hidden>Select</option>
                                {optionList.map((option:string, index:number) => (
                                    <option key={key + '-' + option} value={String(option)}>{displayList[index]}</option>
                                ))}
                            </select>
                        </React.Fragment>
                    )}
                </div>

                <button className='alternative-button' type='button' onClick={() => downloadLog(false)}>View ⇒</button>

                <button className='alternative-button' type='button' onClick={() => downloadLog(true)}>Download ⭳</button>

                <button className='alternative-button' type='button' onClick={() => 
                    axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${type}/report?location=${location}`, {}, { headers: { jwt } })
                        .then((response: { data: LogListItem }) => {
                            notify(`${makeDisplayText(type)} Report Emailed`, ToastStyle.SUCCESS);
                            onCancel && onCancel();
                        })
                        .catch((error) => processAJAXError(error))
                    }>Send Report 📃</button>

                <button className='alternative-button cancel-button' type='button' onClick={() => onCancel && onCancel()}>Cancel</button>
            </div>
        </div>
    );
};


/***********
* SETTINGS *
************/
export const SettingsLogPopup = ({ propertyMap, onCancel }: { propertyMap: Map<string, SettingsProperty<any>>, onCancel?: () => void }) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const type:LogType = useMemo(() => LogType[propertyMap.get('Type')?.value as keyof typeof LogType] ?? LogType.ERROR, [propertyMap]); //Uses Label Name
    const location:LogLocation = useMemo(() => LogLocation[propertyMap.get('Location')?.value as keyof typeof LogLocation] ?? LogLocation.LOCAL, [propertyMap]); //Uses Label Name

    return (
        <div className='center-absolute-wrapper' onClick={() => onCancel && onCancel()}>
            <div id='settings-log-pop-up' className='center-absolute-inside' onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => {
                    if(e.key === 'Escape') {
                        onCancel && onCancel();
                    }
                }}>
                <h2>Settings</h2>

                <div className='log-option-box'>
                    { Array.from(propertyMap.entries()).map(([key, { value, setValue, optionList, displayList }]) =>
                        <React.Fragment key={key}>
                            <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                            <select value={optionList.includes(value) ? String(value) : undefined} onChange={(e) => setValue(e.target.value)} autoComplete='off'>
                                <option value='' hidden>Select</option>
                                {optionList.map((option:string, index:number) => (
                                    <option key={key + '-' + option} value={String(option)}>{displayList[index]}</option>
                                ))}
                            </select>
                        </React.Fragment>
                    )}
                </div>


                {/* RESET LOG FILE | To latest Entries to reduce Size  */}
                {(location === LogLocation.LOCAL) &&
                    <button className='alternative-button' type='button' onClick={() => 
                        axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${type}/reset?location=${location}`, {}, { headers: { jwt } })
                        .then((response: { data: LogListItem }) => {
                            notify(`${makeDisplayText(type)} Reset`, ToastStyle.SUCCESS);
                            onCancel && onCancel();
                        })
                        .catch((error) => processAJAXError(error))
                        }>Resize & Rewrite File ↺</button>
                }

                {/* Update Athena Partitions for S3 Log Search */}
                {(location === LogLocation.S3) &&
                    <button className='alternative-button' type='button' onClick={() => 
                        axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/log/athena-partition`, {}, { headers: { jwt } })
                        .then((response) => {
                            notify('Athena Partitioned', ToastStyle.SUCCESS);
                            onCancel && onCancel();
                        })
                        .catch((error) => processAJAXError(error))
                        }>Update Search Partitions ↺</button>
                }

                <button className='alternative-button cancel-button' type='button' onClick={() => onCancel && onCancel()}>Cancel</button>
            </div>
        </div>
    );
};


/* Align Properties for Settings Popup */
export class SettingsProperty<T> { 
    value:T; 
    setValue:(value:T) => void; 
    optionList:T[];
    displayList:string[];

    constructor(value:T, setValue:(value: T) => void, optionList:T[], displayList?:string[]) {
        this.value = value;
        this.setValue = setValue;
        this.optionList = optionList;
        this.displayList = displayList ?? optionList.map(o => makeDisplayText(String(o)));

        if(this.optionList.length !== this.displayList.length) {
            console.error('Log Page -> Settings: Unmatched propertyList:', this.optionList, this.displayList);
            this.displayList = optionList.map(o => makeDisplayText(String(o)));
        }
    }
}




/************************
 * Previous/Next Buttons *
 ************************/
export const LogPageLocalNavigationButtons = ({ type, showPreviousIndex, latestTimestamp, cumulativeIndex, refreshButtonText, onRefreshButtonClick, executeSearch }
            : { type: LogType|undefined, showPreviousIndex: boolean, latestTimestamp:number, cumulativeIndex:number,  refreshButtonText:string, onRefreshButtonClick:Function,
        executeSearch:({ type, endTimestamp, cumulativeIndex }: { type:LogType, endTimestamp:number, cumulativeIndex:number }) => void }) => (
    <div id='previous-page-button-box'>
        {showPreviousIndex &&
            <button className='alternative-button previous-page-button' type='button' onClick={() =>
                executeSearch({ type: type ?? LogType.ERROR, endTimestamp: latestTimestamp, cumulativeIndex: cumulativeIndex + 1 })}>
                {`Previous Index | ${cumulativeIndex + 1}`}
            </button>
        }
        {refreshButtonText &&
            <button className='alternative-button previous-page-button' type='button' onClick={() => onRefreshButtonClick()}>{refreshButtonText}</button>
        }
        {cumulativeIndex > 0 &&
            <button className='alternative-button next-page-button' type='button' onClick={() =>
                executeSearch({ cumulativeIndex: cumulativeIndex - 1, endTimestamp: new Date().getTime(), type: type ?? LogType.ERROR })}>
                {`Next Index | ${cumulativeIndex - 1}`}
            </button>
        }
    </div>
);

export const LogPageS3NavigationButtons = ({ previousDayText, searchPreviousDay, nextDayText, showNextDay, searchNextDay, refreshButtonText, onRefreshButtonClick }
    : { previousDayText:String, searchPreviousDay:Function, showNextDay: boolean, nextDayText:String, searchNextDay:Function, refreshButtonText:string, onRefreshButtonClick:Function }) => (
    <div id='previous-page-button-box'>
        <button className='alternative-button previous-page-button' type='button' onClick={() => searchPreviousDay()}>{previousDayText}</button>
        {refreshButtonText && (
            <button className='alternative-button previous-page-button' type='button' onClick={() => onRefreshButtonClick()}>{refreshButtonText}</button>
        )}
        {showNextDay && (
            <button className='alternative-button next-page-button' type='button' onClick={() => searchNextDay()}>{nextDayText}</button>
        )}
    </div>
);
