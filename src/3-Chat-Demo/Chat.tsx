import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { io, Socket } from "socket.io-client";
import { Contact, SocketMessage } from './chat-types';
import './chat.scss'; 
import axios from 'axios';


const Chat = () => {
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);

    const [circleMode, setCircleMode] = useState<boolean>(false); //local
    const [message, setMessage] = useState<string>(''); 

    const [chatSocket, setChatSocket] = useState<Socket>();

    const [contactList, setContactList] = useState<Contact[]>([]);
    const [contactId, setContactId] = useState<number>(0);
    const [directLog, setDirectLog] = useState<Array<string>>([]);

    const [circleList, setCircleList] = useState<Contact[]>([]);
    const [circleId, setCircleId] = useState<number>(0);
    const [circleMapLog, setCircleMapLog] = useState<Map<number, Array<string>>>(new Map());

    
    const formatEntry = (entry:string):string => {
        const time = new Date();
        return time.getMinutes() + ":" + time.getSeconds() + ' | ' + entry;
    }

    //Get list of all Contacts Individual
    useEffect(() => {
    /* Fetch Contacts */
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/contacts`, 
            { headers: {
                'user-id': userId,
                'jwt': JWT
            }
        }).then(response => {
            setContactList(response.data);
            setContactId(response.data[0].id);
            console.log('Contacts List ', response.data);
            
        }).catch(error => console.log('AXIOS Contacts Error:', error));

    /* Fetch Circles */
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/circles`, 
            { headers: {
                'user-id': userId,
                'jwt': JWT
            }
        }).then(response => {
            setCircleList(response.data);
            setCircleId(response.data[0].id);
            console.log('Circles List ', response.data);
            
        }).catch(error => console.log('AXIOS Contacts Error:', error));


    /* Socket Communication */
        const socket = io(`${process.env.REACT_APP_SOCKET_PATH}`, {
            path: '/chat',
            auth: {
                JWT: JWT,
                userId: userId
              }
        });  

        setChatSocket(socket);
   
        // socket.on("contactMap", (list) => {
        //     console.log('New Direct Contact Map:', list, JSON.parse(list)); 
        //     setContactList(JSON.parse(list));
        //   });

          socket.on("direct-message", (content: SocketMessage) => {
            setDirectLog(old => [formatEntry(content.senderName?.toString() + ': ' + content.message), ...old]);
            console.log('New Direct:', content); 
          });

          socket.on("circle-message", (content: SocketMessage) => {
            const circleId:number = content.recipientId;

            setCircleMapLog(oldMap => {
                const oldCircle:Array<string> = [formatEntry(content.senderName+': '+content.message), ...oldMap.get(circleId) || []];
                oldMap.set(circleId, oldCircle);
                console.log(oldMap, oldCircle, circleId);
                return new Map(oldMap);
            });            
            console.log('New Circle:', content); 
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

        chatSocket?.emit(circleMode ? "circle-message" : "direct-message", {
            senderId: userId,
            recipientId: circleMode ? circleId : contactId,
            message: message
        });     
    }
    


    return (
        <div id="chat">
            <h3>Encouraging Prayer Chat Demo</h3>

            <div id="horizontal">
                <div id="align-left">
                    <div id="chat-header">
                        <label >Select Type:</label>
                        <label className={circleMode ? 'inactive' : 'active'} onClick={()=>setCircleMode(false)}>Partner Message</label>
                        <label className={!circleMode ? 'inactive' : 'active'} onClick={()=>setCircleMode(true)}>Circle Group Chat</label>
                    </div>

                    <section id='contact-select'>
                        <label >Select Contact:</label>
                        <select name="contact" id="contact-select" placeholder='Select Online Contact' defaultValue={(circleMode ? circleId : contactId)} >
                            {(circleMode ? circleList : contactList).map((contact, i) => 
                                <option key={i} className="entry" onClick={()=>(circleMode ? setCircleId(contact.id) : setContactId(contact.id))} value={contact.id}>{contact.name}</option>
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
                    {(circleMode ? (circleMapLog.get(circleId) || []) : directLog).map((item, i) => 
                        <p key={i} className="entry">{item}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export default Chat;