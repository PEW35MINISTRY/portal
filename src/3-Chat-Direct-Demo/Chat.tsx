import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { io, Socket } from "socket.io-client";
import { Contact, SocketMessage } from './chat-types';
import './chat.scss'; 
import axios from 'axios';
import { serverErrorResponse } from '../app-types';
import { toast } from 'react-toastify';


const DirectChat = () => {
    const dispatch = useAppDispatch();

    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);

    const [message, setMessage] = useState<string>(''); 

    const [chatSocket, setChatSocket] = useState<Socket>();

    const [contactList, setContactList] = useState<Contact[]>([]);
    const [contactId, setContactId] = useState<number>(0);
    const [directLog, setDirectLog] = useState<Array<string>>([]);
    
    
    const formatEntry = (entry:string):string => {
        const time = new Date();
        return time.getMinutes() + ":" + time.getSeconds() + ' | ' + entry;
    }

    //Get list of all Contacts Individual
    useEffect(() => {
    /* Fetch Contacts */
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/contacts`, 
            { headers: {
                'user-id': userId,
                'jwt': JWT
            }
        }).then(response => {
            setContactList(response.data);
            setContactId(response.data[0].id);
            console.log('Contacts List ', response.data);
            
        }).catch((res) => { 
            dispatch({type: "notify", payload: { response: res }});
        });

    /* Socket Communication */
        const socket = io(`${process.env.REACT_APP_SOCKET_PATH}`, {
            path: '/chat',
            auth: {
                JWT: JWT,
                userId: userId
              }
        });  

        setChatSocket(socket);
   
          socket.on("direct-message", (content: SocketMessage) => {
            setDirectLog(old => [formatEntry(content.senderName?.toString() + ': ' + content.message), ...old]);
            console.log('New Direct:', content); 
          });

          socket.on("server", (data: string) => {
            setDirectLog(old => [formatEntry('Server: '+data), ...old]);
            console.log('Server:', data); 
          });

          socket.on("connection", (socket:Socket) => {
            console.log('Direct Socket Connected:', socket.id); 
          });

          socket.on("connect_error", (error) => { //https://socket.io/docs/v3/emitting-events/
            setDirectLog(old => [formatEntry('Error: '+error.message), ...old]);
            console.error(error.message); 
          });

          return () => { //Clean Up
            socket.emit('leave', userId);
            socket.disconnect();
         }

    },[]);


    const sendMessage = (e:any) => {
        e.preventDefault();

        chatSocket?.emit("direct-message", {
            senderId: userId,
            recipientId: contactId,
            message: message
        });  
        setMessage('');
    }
    


    return (
        <div id="chat">
            <h3>Encouraging Prayer Chat Demo</h3>

            <div id="horizontal">
                <div id="align-left">
                    <div id="chat-header">
                        <label id={'chat-id'} >{chatSocket?.id}</label>
                    </div>

                    <section id='contact-select'>
                        <label >Select Contact:</label>
                        <select name="contact" id="contact-select" placeholder='Select Online Contact' defaultValue={(contactId)} >
                            {(contactList).map((contact, i) => 
                                <option key={i} className="entry" onClick={()=>(setContactId(contact.id))} value={contact.id}>{contact.name}</option>
                            )}
                        </select>
                        
                        {/* <button className={circleMode ? 'join-button' : 'none'}
                            onClick={onJoinCircle}>Join Circle</button> */}
                    </section>

                    <textarea onChange={(e)=>setMessage(e.target.value)} value={message} onKeyDown={(e)=>{if(e.key === 'Enter') {sendMessage(e);}}} placeholder='Enter Message Here...'></textarea>
                    <button onClick={sendMessage} >Send Message</button>
                </div>
            
                <div id="chat-log">
                    <label >Chat History:</label>
                    {(directLog).map((item, i) => 
                        <p key={i} className="entry">{item}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export default DirectChat;