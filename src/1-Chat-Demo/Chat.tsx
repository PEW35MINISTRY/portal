import React, {useState, useEffect, forwardRef, useRef} from 'react';

import './Chat.scss'; 

type contact = {
    id: number;
    name: string;
}

const Chat = () => {
    const [email, setEmail] = useState<string>(''); 
    const [password, setPassword] = useState<string>(''); 
    const [socketId, setSocketID] = useState<number>(0); 

    const [circleMode, setCircleMode] = useState<boolean>(false); //local
    const [message, setMessage] = useState<string>(''); 

    const [contactMap, setContactMap] = useState<Map<number,string>>(new Map());
    const [contactID, setContactId] = useState<number>(0);
    const [directLog, setDirectLog] = useState<Array<string>>([]);

    const [circleMap, setCircleMap] = useState<Map<number,string>>(new Map());
    const [circleID, setCircleId] = useState<number>(0);
    const [circleLog, setCircleLog] = useState<Array<string>>([]);

    
    //Get list of all Contacts Individual

    
    //Get List of Circles and IDs


    const onJoinServer = () => {

    }
    
    const onJoinCircle = () => {

    }

    const sendMessage = () => {
        
    }
    


    return (
        <div id="chat">
            <h2>Encouraging Prayer Chat Demo</h2>

            {socketId == 0 ?
                <div id="chat-login">
                    <label>Please login to the Encouraging Prayer system:</label>
                    <label>Email:</label>
                    <input type='email' onChange={(e)=>setEmail(e.target.value)} value={email}/>
                    <label>Password:</label>
                    <input type='email' onChange={(e)=>setPassword(e.target.value)} value={password}/>
                    <button className='join-button' onClick={onJoinCircle}>Join Server</button>
                </div>
            :
                <div id="chat-body">

                    <div className="chat-header">
                        <label onClick={()=>setCircleMode(false)}>Partner Message</label>
                        <label onClick={()=>setCircleMode(true)}>Circle Group Chat</label>
                    </div>

                    <select name="contact" id="contact-select">
                        {Array.from((circleMode ? circleMap : contactMap).entries()).map((contact, i) => 
                            <p className="entry" onClick={()=>(circleMode ? setCircleId(contact[0]) : setContactId(contact[0]))}>{contact[1]}</p>
                        )}
                    </select>
                    
                    <button className={circleMode ? 'join-button' : 'none'}
                     onClick={onJoinCircle}>Join Circle</button>

                    <textarea onChange={(e)=>setMessage(e.target.value)}></textarea>
                    <button onClick={sendMessage}>Send Message</button>

                    <h4>Chat History:</h4>
                    <div id="chat-log">
                        {(circleMode ? circleLog : directLog).map((item, i) => 
                            <p className="entry">{i+1}: {item}</p>
                        )}
                    </div>
                </div>
            }
        </div>
    );
}
export default Chat;