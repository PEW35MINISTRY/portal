import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { ProfileListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import InputField, { ENVIRONMENT_TYPE, InputType } from '../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';



/* Parse Environment | (Don't default to PRODUCTION for security) */
export const getEnvironment = ():ENVIRONMENT_TYPE => ENVIRONMENT_TYPE[process.env.REACT_APP_ENVIRONMENT as keyof typeof ENVIRONMENT_TYPE] || ENVIRONMENT_TYPE.DEVELOPMENT;


/* Filter Unique List Items by Type */
export const userFilterUnique = (list:ProfileListItem[]):ProfileListItem[] => 
    list.filter((profile, index) => 
        list.indexOf(
            list.find(p => p.userID === profile.userID) 
            || {userID: -1, displayName: '', firstName: ''})
        === index);

export const circleFilterUnique = (list:CircleListItem[]):CircleListItem[] => 
    list.filter((profile, index) => 
        list.indexOf(
            list.find(c => c.circleID === profile.circleID) 
            || {circleID: -1, name: '', description: ''})
        === index);


/* Transform inputMap to Simple JavaScript Object */
export const assembleRequestBody = (EDIT_FIELDS:InputField[], inputMap:Map<string,any>):Object => {
    //Assemble Request Body (Simple JavaScript Object)
    const requestBody = {};
    inputMap.forEach((value, field) => {
        const inputField:InputField|undefined = EDIT_FIELDS.find(f => f.field === field);

        if(inputField && inputField.type === InputType.READ_ONLY)
            return;
        
        else if(field === 'userRoleTokenList') { //@ts-ignore
            requestBody[field] = Array.from((inputMap.get('userRoleTokenList') as Map<string,string>).entries())
                                    .map(([role, token]) => ({role: role, token: token || ''}));
        } else {
            if(value === '') value = null; //Valid for clearing fields in database
            //@ts-ignore
            requestBody[field] = value;
        }
    });
    return requestBody;
}

//Highest Role based on RoleEnum order | (Needed for DOB verification) | Independent from Redux
export const getHighestRole = (roleList:RoleEnum[]):RoleEnum => Object.values(RoleEnum).reverse()
                     .find((userRole) => (roleList.includes(userRole)))
                     || RoleEnum.USER; //default
