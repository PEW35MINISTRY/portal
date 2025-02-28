import { useEffect, useState } from 'react';
import axios from 'axios';
import { PARTNERSHIP_CONTRACT, PartnerStatusEnum, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppDispatch, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { makeDisplayText } from '../1-Utilities/utilities';
import { PartnerListItem, ProfileListItem, ProfilePublicResponse } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { addPartner, addPartnerPendingPartner, removePartnerPendingUser } from '../100-App/redux-store';
import { ProfileItem } from './SearchList/SearchListItemCards';


/*****************************************************
 *  ADMIN | Partnership Status POP-UP PAGE COMPONENT *
 * ***************************************************/
export const PartnershipStatusADMIN = ({...props}:{key:string, userID?:number, partnerID?:number, currentStatus?:PartnerStatusEnum, onCancel:() => void}) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const jwtUserID:number = useAppSelector((state) => state.account.userID);
    const jwtUserRole:RoleEnum = useAppSelector((state) => state.account.userRole);

    //At this point user/partner just refer to order they came in as props, props.currentStatus is in the perspective of props.userID 
    const [userID, setUserID] = useState<number>(props.userID ?? jwtUserID ?? -1);
    const [userProfile, setUserProfile] = useState<ProfileListItem|undefined>(undefined);
    const [partnerID, setPartnerID] = useState<number>(props.partnerID ?? -1);
    const [partnerProfile, setPartnerProfile] = useState<ProfileListItem|undefined>(undefined);
    const [status, setStatus] = useState<PartnerStatusEnum>(props.currentStatus ?? PartnerStatusEnum.PENDING_CONTRACT_BOTH);

    useEffect(() => {
        if(jwtUserRole !== RoleEnum.ADMIN)
            notify('Admin restricted: partnership management', ToastStyle.ERROR, props.onCancel);
    }, []);

    
    const assignPartnership = () => {
        const smallerUserID:number = Math.min(userID, partnerID);
        const largerPartnerID:number = Math.max(userID, partnerID);
        let newPartnerStatus:PartnerStatusEnum = status;

        /* If partnerID < userID, swap before submitting */
        if(partnerID < userID && newPartnerStatus === PartnerStatusEnum.PENDING_CONTRACT_USER)
            newPartnerStatus = PartnerStatusEnum.PENDING_CONTRACT_PARTNER;
        else if(partnerID < userID && status === PartnerStatusEnum.PENDING_CONTRACT_PARTNER)
            newPartnerStatus = PartnerStatusEnum.PENDING_CONTRACT_USER;

        axios.post(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/client/${smallerUserID}/partner/${largerPartnerID}/status/${newPartnerStatus}`, { }, { headers: { jwt }})
            .then((response:{ data:string }) => {
                notify(`${makeDisplayText(status)} Partnership Assigned`, ToastStyle.SUCCESS);
                props.onCancel();
            })
            .catch((error) => processAJAXError(error, () => props.onCancel()));
    }

    /* Fetch Public Profiles to get Display Name and Profile Image */
    useEffect(() => {
        if(userID > 0)
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/public`, { headers: { jwt }})
                .then((response:{data:ProfilePublicResponse}) => setUserProfile(response.data)) //ProfilePublicResponse extends ProfileListItem
                .catch((error) => processAJAXError(error));
    }, [userID]);

    useEffect(() => {
        if(partnerID > 0)
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/user/${partnerID}/public`, { headers: { jwt }})
                .then((response:{data:ProfilePublicResponse}) => setPartnerProfile(response.data))
                .catch((error) => processAJAXError(error));
    }, [partnerID]);


    return (
        <div key={'partnership-status-selector'+props.key} id='partnership-status' className='center-absolute-wrapper' onClick={()=>props.onCancel()} >
            <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()} >
                <h1 className='name'>Update Partnership</h1>

                <div className='matching-profile-box' >
                    {(userProfile) &&
                        <ProfileItem key={'profile-user'} user={userProfile} />
                    }

                    {(partnerProfile) &&
                        <ProfileItem key={'profile-partner'} user={partnerProfile} />
                    }
                </div>

                <div className='update-partnership-inputs' >
                    <label>User ID</label>
                    <label>Status</label>
                    <label>Partner ID</label>

                    <input type='number' value={userID} onChange={(event) => setUserID(parseInt(event.target.value))} />
                    <select value={status} onChange={(e) => setStatus(e.target.value as PartnerStatusEnum)}>
                        {Object.values(PartnerStatusEnum).map(status => (
                            <option key={status} value={status}>
                                {makeDisplayText(status)}
                            </option>
                        ))}
                    </select>
                    <input type='number' value={partnerID} onChange={(event) => setPartnerID(parseInt(event.target.value))} />
                </div>

                {<button className='submit-button' type='button' onClick={() => assignPartnership()}>Assign</button>}
                <button className='submit-button alternative-button'  type='button' onClick={()=>props.onCancel()}>Cancel</button>

            </div>
        </div>
    );
}



/*******************************************************************
 *  ADMIN | Delete All Partnership by Status POP-UP PAGE COMPONENT *
 * *****************************************************************/
export const PartnershipDeleteAllADMIN = ({...props}:{key:string, user:ProfileListItem, statusMap?:Map<PartnerStatusEnum, number>, selectedStatus?:PartnerStatusEnum, onCancel:() => void}) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    const [status, setStatus] = useState<PartnerStatusEnum>(props.selectedStatus || PartnerStatusEnum.FAILED);

    useEffect(() => {
        if(userRole !== RoleEnum.ADMIN)
            notify('Admin restricted: partnership management', ToastStyle.ERROR, props.onCancel);
    }, []);

    const deleteAllPartnerships = () => axios.delete(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/client/${props.user.userID}/status/${status}`, { headers: { jwt:jwt }})
        .then((response:{ data:string }) => {
            notify(`All ${makeDisplayText(status)} Partnership Cleared`, ToastStyle.SUCCESS);
        })
        .catch((error) => processAJAXError(error, () => props.onCancel()));


        return (
            <div key={'partnership-delete-all-selector'+props.key} id='partnership-delete-all' className='center-absolute-wrapper' onClick={()=>props.onCancel()} >
                <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()} >
                    <h1 className='name'>Delete Partnership</h1>

                    <ProfileItem key={'profile-user'} user={props.user} />

                    <div className='update-partnership-inputs' >
                        <label>Status</label>

                        <select value={status} onChange={(e) => setStatus(e.target.value as PartnerStatusEnum)}>
                            {Object.values(PartnerStatusEnum).map(status => (
                                <option key={status} value={status}>
                                    {makeDisplayText(status)}
                                </option>
                            ))}
                        </select>

                        <p className='id'>{props.statusMap?.get(status) || 0}</p>
                    </div>

                    {<button className='submit-button' type='button' onClick={() => deleteAllPartnerships()}>Delete All</button>}
                    <button className='submit-button alternative-button'  type='button' onClick={()=>props.onCancel()}>Cancel</button>

                </div>
            </div>
        );
}



/*********************************
 *    New Partnership Contract   *
 * Assumed logged in User acting *
 * *******************************/
export const PartnershipContract = ({...props}:{key:string, partner:PartnerListItem, onAcceptCallback:() => void, onDeclineCallback:() => void}) => {
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userName:string =useAppSelector((state) => state.account.userProfile.displayName);

    const onAcceptPartnership = () => axios.post(`${process.env.REACT_APP_DOMAIN}/api/partner-pending/${props.partner.userID}/accept`, { }, { headers: { jwt: jwt }} )
        .then((response:{ data:string }) => {
            props.onAcceptCallback() ;
            notify(`Accepted Partnership with ${props.partner.displayName}`, ToastStyle.SUCCESS, () => {
                
                if(props.partner.status === PartnerStatusEnum.PENDING_CONTRACT_USER) {
                    props.partner.status = PartnerStatusEnum.PARTNER;
                    notify(`Confirmed Partnership with ${props.partner.displayName}`, ToastStyle.SUCCESS, () => { dispatch(addPartner(props.partner)); dispatch(removePartnerPendingUser(props.partner.userID)); });

                } else if(props.partner.status === PartnerStatusEnum.PENDING_CONTRACT_BOTH) {
                    props.partner.status = PartnerStatusEnum.PENDING_CONTRACT_PARTNER;
                    notify(`Pending ${props.partner.displayName} Acceptance`, ToastStyle.INFO, () => { dispatch(addPartnerPendingPartner(props.partner)); dispatch(removePartnerPendingUser(props.partner.userID)); });
                }
            });})
        .catch((error) => processAJAXError(error, props.onDeclineCallback));

        const onDeclinePartnership = () => axios.delete(`${process.env.REACT_APP_DOMAIN}/api/partner-pending/${props.partner.userID}/decline`, { headers: { jwt: jwt }} )
            .then(response => {props.onDeclineCallback(); notify(`Declined Partnership`, ToastStyle.SUCCESS, () => dispatch(removePartnerPendingUser(props.partner.userID)));})
            .catch((error) => processAJAXError(error, props.onDeclineCallback));


        return (
            <div key={'partnership-contract'+props.key} id='partnership-contract' className='center-absolute-wrapper' onClick={() => props.onDeclineCallback()} >
                <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()} >
                    <h1 className='name'>New Partner</h1>
                       
                    <p className='contract' >{PARTNERSHIP_CONTRACT(userName, props.partner.displayName)}</p>
    
                    <button className='submit-button' type='button' onClick={onAcceptPartnership}>Accept Partnership</button>
                    <button className='alternative-button'  type='button' onClick={onDeclinePartnership}>Decline</button>

                </div>
            </div>
        );
}
