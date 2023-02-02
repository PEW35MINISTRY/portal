import axios from 'axios';
import { stringify } from 'querystring';
import React, {useState, useEffect, forwardRef, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import './form.scss'; 
import FormProfile from './FormProfile';
import validateInput, {ProfileType, convertDate, convertHour, getAvailableUserRoles, testEmailExists, REQUIRED_FIELDS, Profile_Validation_Mode } from './validateProfile';
import { toast } from 'react-toastify';
import { serverErrorResponse, ToastStyle } from '../app-types';


const Signup = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const JWT:string = useAppSelector((state) => state.account.JWT);

    const [input, setInput] = useState<ProfileType>({
        ['userRole']: 'STUDENT',
        ['dailyNotificationHour']: "09:00",
    });
    const [validation, setValidation] = useState<any>({});
    const [requiredProfileFields, setRequiredProfileFields] = useState<any>({}); //Uses SIGNUP access list

    //Trigger
    // useEffect(() => {setInput({...input, 'displayName': input.firstName})}, [input.firstName]);

    //onStart
    useEffect(() => {   
        if(JWT.length > 0){
            dispatch({type: 'reset-login', payload: {}});
        }

        axios.get(`${process.env.REACT_APP_DOMAIN}/resources/profile-edit-list`) //No headers to get default SIGNUP list
            .then(response => setRequiredProfileFields(response.data || []))
            .catch(response => {
                dispatch({type: "notify", payload: { response: response,
                    message: 'Failed to find required fields.'
                }});
            });
        },[]);

    const onSubmit = async(e:any) => {
        if(e)
            e.preventDefault();

        //Rerun all Validations 
        const validationSet:Set<string> = new Set(requiredProfileFields);
        Object.keys(validation).forEach(field => validationSet.add(field));
        Object.keys(input).forEach(field => validationSet.add(field));

        //@ts-ignore
        const finalValidations = await [...validationSet].reduce(async (result, fieldName) => await validateInput(fieldName, input[fieldName] || '', input, await result, requiredProfileFields, Profile_Validation_Mode.SIGNUP), validation);

        if(Object.keys(finalValidations).length  > 0) {
            dispatch({type: "notify", payload: { message: 'Please fix all validation before creating a new account.' }});
            return;
        } else 

        if(input.email && await testEmailExists(input.email)) {
            dispatch({type: "notify", payload: {
                message: "Account already exists with this email, please login.",
                callback: () => {
                    navigate(`/login?email=${input.email}`);
                }
            }});

            return;
        }

        axios.post(`${process.env.REACT_APP_DOMAIN}/signup`, {
            ...input,
            dob: convertDate(input.dob || '').getTime(),
            dailyNotificationHour: convertHour(input.dailyNotificationHour || ''),
        })
        .then(response => { //AUTO LOGIN
            dispatch({
                type: 'login',
                payload: {
                    JWT: response.data.JWT,
                    userId: response.data.userId,
                    userProfile: response.data.userProfile,
                }
            });
            setInput({});
            dispatch({type: "notify", payload: {
                response: response,
                message: 'Welcome to Encouraging Prayer!',
                callback: () => {
                    navigate('/portal/dashboard');
                }
            }});

        }).catch((res) => { dispatch({type: "notify", payload: { response: res }});
        });
    }


    const onInput = async (event:any) => {
        const {name, value} = event?.target;
        setInput({...input, [name]: value});
        console.log(name, value, {...input, [name]: value});
        
        setValidation(await validateInput(name, value, input, validation, requiredProfileFields, Profile_Validation_Mode.SIGNUP));
    }

    const getInput = (field:string) => {
        //@ts-ignore
        return input[field] || '';
    }

    return (
        <div id='signup' className='form-page'>
            <h2>Create Account</h2>
            <FormProfile
                onInput={onInput}
                getInput={getInput}
                validation={validation}
                footerChildren={<button type='submit' onClick={onSubmit}>Create Account</button>}               
            />
        </div>
    );
}

export default Signup;

