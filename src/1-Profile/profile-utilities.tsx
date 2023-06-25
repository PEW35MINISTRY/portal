import axios from 'axios';
import { notify } from '../hooks';

export const testAccountAvailable = async(fields:Map<string, string>):Promise<boolean|undefined> => new Promise((resolve, reject) => {
    const fieldQuery:string = Array.from(fields.entries()).map(([key, value]) => `${key}=${value}`).join('&');
    console.log("query", fieldQuery);

    axios.get(`${process.env.REACT_APP_DOMAIN}/resources/available-account?${fieldQuery}`)
        .then(response => resolve(true)) //notification handled in FormProfile.tsx
        .catch(error => {
            if(error.response.status === 403) {
                resolve(false); 
            } else {
                console.error('Bad request; unable to test account available', fields, error);
                resolve(undefined); 
            }
        });
    });