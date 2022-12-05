import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { io, Socket } from "socket.io-client";
import { Contact, SocketMessage } from './chat-types';
import './chat.scss'; 


const Chat = () => {
    const JWT:string = useAppSelector((state) => state.account.JWT);
    const userId:number = useAppSelector((state) => state.account.userId);

    const [email, setEmail] = useState<string>(''); 
    const [password, setPassword] = useState<string>(''); 
    const [socketId, setSocketId] = useState<number>(0); 

    const [circleMode, setCircleMode] = useState<boolean>(false); //local
    const [message, setMessage] = useState<string>(''); 

    const [directChatSocket, setDirectChatSocket] = useState<Socket>();
    const [contactList, setContactList] = useState<Contact[]>([]);
    const [contactId, setContactId] = useState<number>(0);
    const [directLog, setDirectLog] = useState<Array<string>>([]);

    const [circleList, setCircleList] = useState<Contact[]>([]);
    const [circleId, setCircleId] = useState<number>(0);
    const [circleLog, setCircleLog] = useState<Array<string>>([]);

    
    // const circleChat = io(`${process.env.REACT_APP_SOCKET_PATH}/circle`, {
    //     path: '/chat/'
    // });  

    const formatEntry = (entry:string) => {
        const time = new Date();
        return time.getMinutes() + ":" + time.getSeconds() + ' | ' + entry;
    }

    //Get list of all Contacts Individual
    useEffect(() => {
        const directChatSocket = io(`${process.env.REACT_APP_SOCKET_PATH}`, {
            path: '/chat',
            auth: {
                JWT: JWT,
                userId: userId
              }
        });  

        setDirectChatSocket(directChatSocket);
   
        directChatSocket.on("contactMap", (list) => {
            console.log('New Direct Contact Map:', list, JSON.parse(list)); 
            setContactList(JSON.parse(list));
          });

          directChatSocket.on("message", (context: SocketMessage) => {
            setDirectLog(old => [formatEntry(context.senderName+': '+context.message), ...old]);
            console.log('New Message:', context); 
          });

          directChatSocket.on("server", (data: string) => {
            setDirectLog(old => [formatEntry('Server: '+data), ...old]);
            console.log('Server Message:', data); 
          });

          directChatSocket.on("connection", (socket:Socket) => {
            console.log('Direct Socket Connected:', socket.id); 
          });

          directChatSocket.on("connect_error", (error) => { //https://socket.io/docs/v3/emitting-events/
            setDirectLog(old => [formatEntry('Error: '+error.message), ...old]);
            console.error(error.message); 
          });

          return () => { //Clean Up
            directChatSocket.emit('leave', userId);
            directChatSocket.disconnect();
         }

    },[]);

    
    //Get List of Circles and Ids

    // circleChat.on("circleList", (response) => {
    //     setCircleMap(response.data);
    //     console.log('Circle List Updated:', response.data)
    //   });


    const onJoinServer = () => {
        // directChat.on("connect", () => {
        //     console.log('Direct Socket Connected', socket.id); // x8WIv7-mJelg7on_ALbx
        //   });
          
        //   circleChat.on("connect", () => {
        //     console.log('Circle Socket Connected', socket.id); // x8WIv7-mJelg7on_ALbx
        //   });
    }
    
    const onJoinCircle = () => {
        // circleChat.on("connect", () => {
        //     console.log('Circle Socket Connected', socket.id); // x8WIv7-mJelg7on_ALbx
        //   });
    }

    const sendMessage = () => {
        directChatSocket?.emit("message", {
            senderId: userId,
            recipientId: contactId,
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
                        <select name="contact" id="contact-select" placeholder='Select Online Contact'>
                            {(circleMode ? circleList : contactList).map((contact, i) => 
                                <option key={i} className="entry" onClick={()=>(circleMode ? setCircleId(contact.id) : setContactId(contact.id))} value={contact.id}>{contact.name}</option>
                            )}
                        </select>
                        
                        {/* <button className={circleMode ? 'join-button' : 'none'}
                            onClick={onJoinCircle}>Join Circle</button> */}
                    </section>

                    <textarea onChange={(e)=>setMessage(e.target.value)} value={message} onKeyDown={(e)=>{if(e.key === 'Enter') {e.preventDefault(); sendMessage();}}} placeholder='Enter Message Here...'></textarea>
                    <button onClick={sendMessage} >Send Message</button>
                </div>
            
                <div id="chat-log">
                    <label >Chat History:</label>
                    {(circleMode ? circleLog : directLog).map((item, i) => 
                        <p key={i} className="entry">{item}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export default Chat;