import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 

type contact = {
    id: number,
    name: string,
}

//temporary for debugging
type CredentialProfile = { 
    user_id: number,
    display_name: string,
    user_role: string,
    email: string,
    password_hash: string,
}

const Login = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const location = useLocation();  
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [email, setEmail] = useState<string>(''); 
    const [password, setPassword] = useState<string>(''); 
    const [credentialList, setCredentialList] = useState<CredentialProfile[]>([]);

    useEffect(() => {if(statusMessage.length > 0) setTimeout(() => setStatusMessage(""), 5000);},[statusMessage]);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_DOMAIN}/login/credentials`)
            .then(response => setCredentialList(response.data))
            .catch(error => {
                console.error('Failed to fetch all user credentials', error);});

            //Failed /signup redirects with email in query parameter
            const queryEmail = new URLSearchParams(location.search).get('email');
            if(queryEmail) 
                setEmail(queryEmail);
    }, []);

    const onCredentialSelect = (e:any) => {
        if(e)
            e.preventDefault();
        const user:CredentialProfile = credentialList[e.target.value];
        makeLoginRequest(user.email, user.password_hash);
        setEmail(user.email);
    }

    const onLogin = (e:any) => {
        if(e)
            e.preventDefault();

        makeLoginRequest(email, password);
    }

    const makeLoginRequest = (userEmail:string, userPassword:string) => (userEmail.length && userPassword.length) &&
    dispatch({
        type: "login",
        payload: {
            email: userEmail,
            password: userPassword
        }
    });    

    //Moved to REDUX

    // axios.post(`${process.env.REACT_APP_DOMAIN}/login`, {
    //         email: userEmail,
    //         password: userPassword

    //     }).then(response => {
    //         dispatch({
    //             type: "login",
    //             payload: {
    //                 JWT: response.data.JWT,
    //                 userId: response.data.userId,
    //                 userProfile: response.data.userProfile,
    //             }
    //         });

        //     setStatusMessage(`Welcome to Encouraging Prayer ${response.data.userProfile.displayName}!`)
        //     console.log('Login Successfully', response.data.userId, response.data.service);
        //     navigate('/dashboard');

        // }).catch(error => {
        //     if(error.response.status === 403)
        //         setStatusMessage(`Account identified, please  verify account to login`);
        //     else            
        //         setStatusMessage(`Login unsuccessfully, please try again`);

        //     setPassword('');
        //     console.log('AXIOS Login Error:', error);
    
    

    //OnStart
    useEffect(() => onLogin(null), []);
    

    return (
        <div id='login'  className='form-page'>
            <form onSubmit={onLogin}>
                {(statusMessage.length > 0) && <h4>{statusMessage}</h4>}
                {(statusMessage.length > 0) && <hr/>}

                <label htmlFor='credentialSelect'>Select User</label>
                <select name="credentialSelect" onChange={onCredentialSelect} defaultValue='default'>
                <option value="default" disabled hidden>Login as:</option>
                    {credentialList?.sort((a,b)=>(a.user_role < b.user_role ? -1 : 1)).map((user,i)=>
                        <option key={`${i}-${user.user_id}`} value={i}>{user.user_id} | {user.display_name} | {user.user_role}</option>
                    )}
                </select>

                <h2>Login</h2>

                <label>Email:</label>
                <input type='email' onChange={(e)=>setEmail(e.target.value)} value={email}/>
                <label>Password:</label>
                <input type='email' onChange={(e)=>setPassword(e.target.value)} value={password} onKeyDown={(e)=>{if(e.key === 'Enter') {onLogin(e);}}}/>
                <button onClick={onLogin}>Login</button>
            </form>
        </div>
    );
}
export default Login;