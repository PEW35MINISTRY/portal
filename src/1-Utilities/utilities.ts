import { CircleListItem } from '../0-Assets/field-sync/api-type-sync/circle-types';
import { ProfileListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';



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
            || {circleID: -1, name: ''})
        === index);


//Converts underscores to spaces and capitalizes each word
export const makeDisplayText = (text:string = ''):string => text.toLowerCase().split('_'||' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
