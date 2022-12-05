import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import './login.scss'; 

type contact = {
    id: number;
    name: string;
}

const Login = () => {
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState<string>('email@email.com'); 
    const [password, setPassword] = useState<string>('abc'); 

    const onLogin = (e:any) => {
        e.preventDefault();

        axios.post(`${process.env.REACT_APP_DOMAIN}/login`, {
            email: email,
            password: password

        }).then(response => {
            dispatch({
                type: "login",
                payload: {
                    JWT: response.data.JWT,
                    userId: response.data.userId,
                    userProfile: response.data.userProfile,
                }
            });

            console.log('Login Successfully', response.data.userId, response.data.service);

        }).catch(error => console.log('AXIOS Login Error:', error));
    }
    

    return (
        <div id="login">
            <h4>Please login to the Encouraging Prayer system:</h4>
            <label>Email:</label>
            <input type='email' onChange={(e)=>setEmail(e.target.value)} value={email}/>
            <label>Password:</label>
            <input type='email' onChange={(e)=>setPassword(e.target.value)} value={password}/>
            <button onClick={onLogin}>Login</button>
        </div>
    );
}
export default Login;