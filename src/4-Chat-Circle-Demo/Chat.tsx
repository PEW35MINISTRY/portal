import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useAppSelector, useAppDispatch, processAJAXError } from '../hooks';
import axios from 'axios';
import { io, Socket } from "socket.io-client";
import { Contact, SocketMessage } from '../3-Chat-Direct-Demo/chat-types';
import '../3-Chat-Direct-Demo/chat.scss'; 


const CircleChat = () => {
    const dispatch = useAppDispatch();
    
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);

    const [message, setMessage] = useState<string>(''); 

    const [chatSocket, setChatSocket] = useState<Socket>();

    const [circleList, setCircleList] = useState<Contact[]>([]);
    const [circleId, setCircleId] = useState<number>(0);
    const [circleMapLog, setCircleMapLog] = useState<Map<number, Array<string>>>(new Map());

    
    const formatEntry = (entry:string):string => {
        const time = new Date();
        return time.getMinutes() + ":" + time.getSeconds() + ' | ' + entry;
    }

    const addCircleMessage = (id:number, text:string) => { console.log('Updating Map', circleMapLog);
        setCircleMapLog(oldMap => {
            // const newMap:Map<number, Array<string>> = new Map<number, Array<string>>();
            const oldCircle:string[]= [formatEntry(text), ...oldMap.get(id) || []];
            // oldMap.set(id, oldCircle);
            // console.log(oldMap, oldCircle, circleId);
            return new Map(oldMap);
        });
    }

    //Get list of all Contacts Individual
    useEffect(() => {

    /* Socket Communication */
        const socket = io(`${process.env.REACT_APP_SOCKET_PATH}`, {
            path: '/chat',
            auth: {
                JWT: JWT,
                userId: userId
                }
        });  

        setChatSocket(socket);

    /* Fetch Circles */
        axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/circles`, 
            { headers: {
                'user-id': userId,
                'jwt': JWT
            }
        }).then(response => {
            setCircleList(response.data);
            setCircleId(response.data[0].id);
            console.log('Circles List ', response.data);

            //@ts-ignore Join All Circles @ts-ignore
            Array.from(response.data).forEach((circle) => socket.emit('circle-join', circle.id));
            
        }).catch((error) => processAJAXError(error));


    /* Socket Communication */ 

          socket.on("circle-message", (content: SocketMessage) => {
            addCircleMessage(content.recipientId, content.senderName+': '+content.message);
            console.log('New Circle:', content); 
          });

          socket.on("server", (data: string) => {
            addCircleMessage(circleId, 'Server: '+data);
            console.log('Server:', data); 
          });

          socket.on("connection", (socket:Socket) => {
            console.log('Direct Socket Connected:', socket.id); 
          });

          socket.on("connect_error", (error) => { //https://socket.io/docs/v3/emitting-events/
            addCircleMessage(circleId, 'Error: '+error.message);
            console.error(error.message); 
          });

          return () => { //Clean Up
            socket.emit('leave', userId);
            socket.disconnect();
         }

    },[]);


    const sendMessage = (e:any) => {
        e.preventDefault();

        chatSocket?.emit("circle-message", {
            senderId: userId,
            recipientId: circleId,
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
                        <select name="contact" id="contact-select" placeholder='Select Online Contact' defaultValue={(circleId)} >
                            {(circleList).map((contact, i) => 
                                <option key={i} className="entry" onClick={()=>(setCircleId(contact.id))} value={contact.id}>{contact.name}</option>
                            )}
                        </select>
                        
                    </section>

                    <textarea onChange={(e)=>setMessage(e.target.value)} value={message} onKeyDown={(e)=>{if(e.key === 'Enter') {sendMessage(e);}}} placeholder='Enter Message Here...'></textarea>
                    <button onClick={sendMessage} >Send Message</button>
                </div>
            
                <div id="chat-log">
                    <label >Chat History:</label>
                    {(circleMapLog.get(circleId) || []).map((item, i) => 
                        <p key={i} className="entry">{item}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export default CircleChat;