import axios from 'axios';
import { RoleEnum } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify } from '../../1-Utilities/hooks';
import { ToastStyle } from '../../100-App/app-types';

export const testAccountAvailable = async(fields:Map<string, string>):Promise<boolean|undefined> => new Promise((resolve, reject) => {
    const fieldQuery:string = Array.from(fields.entries()).map(([key, value]) => `${key}=${value}`).join('&');

    axios.get(`${process.env.REACT_APP_DOMAIN}/resources/available-account?${fieldQuery}`)
        .then(response => resolve(true)) //notification handled in FormProfile.tsx
        .catch(error => {
            if(error.response.status === 403) {
                resolve(false); 
            } else {
                notify(`Unable to verify account availability.`, ToastStyle.ERROR);
                console.error('Bad request; unable to test account available', fields, error);
                resolve(undefined); 
            }
        });
    });

