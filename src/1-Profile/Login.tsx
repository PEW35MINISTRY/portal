import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import validateInput, {ProfileType, convertDate, convertHour, getAvailableUserRoles, testEmailExists, emailRegex } from './validateProfile';
import { toast } from 'react-toastify';
import './form.scss'; 
import { serverErrorResponse } from '../app-types';

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
    const [input, setInput] = useState<ProfileType>({});

    //TODO Temporary for Debugging
    const [credentialList, setCredentialList] = useState<CredentialProfile[]>([]);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_DOMAIN}/login/credentials`)
            .then(response => setCredentialList(response.data))
            .catch((res) => { 
                dispatch({type: "notify", payload: { response: res,
                    message: 'Failed to fetch all user credentials.'
                }});
            });

            //Failed /signup redirects with email in query parameter
            if(new URLSearchParams(location.search).get('email')) 
                setInput({...input, 'email': input.email});
            if(new URLSearchParams(location.search).get('displayName')) 
                setInput({...input, 'displayName': input.displayName});
    }, []);

    const onCredentialSelect = (e:any) => {
        if(e)
            e.preventDefault();
        const user:CredentialProfile = credentialList[e.target.value];
        makeLoginRequest(user.email, user.display_name, user.password_hash);
        setInput({...input, 'email': user.email, 'displayName': user.display_name, 'password': user.password_hash});
    }

    const onLogin = (e:any) => {
        if(e)
            e.preventDefault();

        makeLoginRequest(input.email, input.displayName, input.password);
    }

    const makeLoginRequest = (email:string = '', displayName:string = '', password:string = '') => ((email.length || displayName.length) && password.length) &&
        dispatch({
            type: "login",
            payload: {
                email: email,
                displayName: displayName,
                password: password
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
        //     navigate('/portal/dashboard');

        // }).catch(error => {
        //     if(error.response.status === 403)
        //         setStatusMessage(`Account identified, please  verify account to login`);
        //     else            
        //         setStatusMessage(`Login unsuccessfully, please try again`);

        //     setPassword('');
        //     console.log('AXIOS Login Error:', error);
    

    const onInput = async (event:any) => {
        let {name, value} = event?.target;
        
        if(name === 'emailUsername') {
            name = emailRegex.test(value) ? 'email' : 'username';
        }
        setInput({...input, [name]: value});
        console.log(name, value, {...input, [name]: value});
    }
    

    return (
        <div id='login'  className='form-page'>
            <form onSubmit={onLogin}>

                <label htmlFor='credentialSelect'>Select User</label>
                <select name="credentialSelect" onChange={onCredentialSelect} defaultValue='default'>
                <option value="default" disabled hidden>Login as:</option>
                    {credentialList?.sort((a,b)=>(a.user_role < b.user_role ? -1 : 1)).map((user,i)=>
                        <option key={`${i}-${user.user_id}`} value={i}>{user.user_id} | {user.display_name} | {user.user_role}</option>
                    )}
                </select>

                <h2>Login</h2>

                <label htmlFor='emailUsername'>Email address</label>
                <input name='emailUsername' type='email' onChange={onInput}  value={input.email || ''}/>

                <label htmlFor='password'>Password</label>
                <input name='password' type='password' onChange={onInput}  value={input.password || ''}/>

                <button onClick={onLogin}>Login</button>
            </form>
        </div>
    );
}
export default Login;