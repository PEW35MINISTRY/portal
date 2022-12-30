import axios from 'axios';
import { error } from 'console';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from '../hooks';
import './log.scss'; 


const LOG_TYPES = new Map();
    LOG_TYPES.set("error", "Error");
    LOG_TYPES.set("warn", "Warning");
    LOG_TYPES.set("auth", "Authorization");
    LOG_TYPES.set("db", "Database");
    LOG_TYPES.set("event", "Event");

const Log = () => {
    const navigate = useNavigate();
    const userId:number = useAppSelector((state) => state.account.userId);
    const JWT:string = useAppSelector((state) => state.account.JWT);

    const [type, setType] = useState<string>("error");
    const [logEntries, setLogEntries] = useState<string[]>(["Log Data"]);
    const [expandAll, setExpandAll] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [showAdd, setShowAdd] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');


    useEffect(() => {setLoading(true);
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${type}`, { 
            headers: {
                'user-id': userId,
                'jwt': JWT
        }
        }).then(response => {
                setLogEntries(response.data.split(/(?=\[\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2}:\d{1,2}])/g).reverse());
                // console.log('Log Retrieved', response.data);
                setLoading(false);
            }).catch(error => {
                console.log('AXIOS Log Error:', error);
                //@ts-ignore
                if(error.response.status === 400 || error.response.status === 401) navigate('/login');
            });
    }, [type]);

    const saveLog = (event:any) => {
        event.preventDefault();

        axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/log/${type}`, message.toString(), { 
            headers: {
                'Content-Type': 'text/plain',
                'user-id': userId,
                'jwt': JWT
        }
        }).then(response => {
                setMessage("");
            }).catch(error => {
                console.log('AXIOS Log Error:', error);
            });
    }
    
    return (
        <div id="log">
            <div id='log-type-box'>
                <button key={'add'} id='add' onClick={()=>setShowAdd(old => !old)}>
                    <label>{loading ? '*' : `[${logEntries.length}]`}&nbsp;+</label>
                </button>
                {Array.from(LOG_TYPES.entries()).map(([key, name]) => 
                    <button key={key} className={key == type ? 'log-type selected' : 'log-type'} onClick={()=>setType(key)}>
                        <label>{name}</label>
                    </button>
                )}
                <button key={'Expand All'} id='expand-all-button' onClick={()=>setExpandAll(old => !old)}>
                    <label>{expandAll ? 'Collapse' : 'Expand'}</label>
                </button>
            </div>

            <div className={showAdd ? 'add-box' : 'hide'}>
                <input type='text' value={message} onChange={(e)=>{setMessage(e.target.value)}} onKeyDown={(e)=>{if(e.key === 'Enter') {saveLog(e);}}} placeholder={`Enter new ${LOG_TYPES.get(type)} Log Entry...`}/>
            </div>

            <div id="log-display" className={loading ? "hide" : ""}>
                {logEntries
                    .map((entry, index)=><LogEntry key={`${index}+${expandAll}+${type}`}
                            count={index+1}
                            lines={entry.split(/\n/g).filter(line => line !== "")}
                            expand={expandAll}             
                        />)}
            </div>
        </div>
    );
}

const LogEntry = (props:{lines:string[], expand:boolean, count:number}) => {
    const [expand, setExpand] = useState<boolean>(props.expand || true);
    const [trace, setTrace] = useState<boolean>(false);

    const handleClick = (event: any) => {
        if(!expand) setExpand(true);
        else if(!trace) setTrace(true);
        else {
            setExpand(false);
            setTrace(false);
        }
    }

    //Text Log Message Type Per Line
    const isHeader = (line:string) => (/\[\d{1,2}-\d{1,2}-\d{4} \d{1,2}:\d{1,2}:\d{1,2}]/.test(line));
    const isTrace = (line:string) => (/^\s*\>{1}/.test(line));
    const includesTrace = (lines:string[]) => isTrace(lines[lines.length-1]);

    return <section key={'section'+props.count} className='log-entry' onClick={handleClick}>
        <label>{props.count}
            <label className={includesTrace(props.lines) ? 'trace-star' : 'hide'}>&nbsp;*</label>
        </label>
        {props.lines.map((line, k) => 
            <p key={k} className={(isHeader(line) ? 'header'
                            : !expand ? 'hide'
                            : isTrace(line) ? (trace ? 'trace' : 'hide')
                            : '')}
            >{line}</p>)
        }
    </section>;
}

export default Log;