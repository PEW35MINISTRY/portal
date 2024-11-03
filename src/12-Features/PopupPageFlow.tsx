import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { useAppDispatch, useAppSelector, notify, processAJAXError } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { updateProfileImage } from '../100-App/redux-store';
import { ImageUpload, ImageDefaultEnum } from '../2-Widgets/ImageWidgets';
import { PartnershipContract } from '../2-Widgets/PartnershipWidgets';
import { PartnerListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import WalkLevelQuiz from '../2-Widgets/WalkLevelQuiz';

import './popupPageFlow.scss';

//Default Order for Initial Account Setup Flow
export enum FlowPage {
    WALK_LEVEL = 'WALK_LEVEL',
    PARTNER = 'PARTNER',
    IMAGE = 'IMAGE',
}

const PopupPageFlow = ({ flowPages = Object.values(FlowPage), allowEscape = true, redirectRoute = '/portal/dashboard/animation' }: { flowPages?:FlowPage[], allowEscape?:boolean, redirectRoute?:string }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    const userProfileImage:string|undefined = useAppSelector((state) => state.account.userProfile.image);

    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [newPartner, setNewPartner] = useState<PartnerListItem|undefined>(undefined); 


    //NOTE: These are independent and don't hold state
    const pageList: JSX.Element[] = useMemo(() => flowPages.map((pageType) => {
            switch(pageType) {
                    case FlowPage.WALK_LEVEL:
                        return !(userRoleList && userRoleList.includes(RoleEnum.USER)) ? undefined : 
                            <WalkLevelQuiz
                                key='initial-account-flow'
                                onSelect={() => fetchNewPartner()}
                            />
                        
                    case FlowPage.PARTNER:
                        return (newPartner === undefined) ? undefined : //Only prompt if new partner is available | Will notify later to reapply
                            <PartnershipContract
                                key={`User-Edit-Partnership-${userID}-${newPartner.userID}-Contract`}
                                partner={newPartner}
                                onAcceptCallback={() => nextPage()}
                                onDeclineCallback={() => nextPage()}
                            />

                    case FlowPage.IMAGE:
                        return <ImageUpload
                                    key={'initialFlow-image-'+userID}
                                    title='Upload Profile Image'
                                    imageStyle='profile-image'
                                    currentImage={ userProfileImage }
                                    defaultImage={ ImageDefaultEnum.PROFILE }
                                    onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/image/${imageFile.name}`, imageFile, { headers: { 'jwt': jwt, 'Content-Type': imageFile.type }} )
                                        .then(response => {
                                            nextPage();
                                            notify(`Profile Image Uploaded`, ToastStyle.SUCCESS, () => (userID === userID) && dispatch(updateProfileImage(response.data)))})
                                        .catch((error) => processAJAXError(error))}
                                />

                    default:
                        return undefined;
                }

        }).filter((p): p is JSX.Element => p !== undefined && p !== null), [flowPages, userRoleList, newPartner]);    


    /* Utilities */
    const previousPage = () => 
        setSelectedIndex(currentIndex => Math.max(0, Math.min(pageList.length - 1, (currentIndex - 1))));

    const nextPage = (setIndex?:number) => { 
        if(selectedIndex + 1 >= pageList.length) 
            navigate(redirectRoute);
        else
            setSelectedIndex((currentIndex) => Math.max(0, Math.min(pageList.length - 1, currentIndex + 1)));
    }

    /* Fetch Random Partner */
    const fetchNewPartner = async () =>
        await axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/new-partner`, { }, { headers: { jwt }})
            .then((response:{ data:PartnerListItem }) => {
                setNewPartner(response.data);
                setSelectedIndex(currentIndex => currentIndex + 1); //Will cause useEffect to re-evaluate adding partnerContract; nextPage wasn't syncing on first click.
            })
            .catch((error) => { nextPage(); processAJAXError(error, () => notify('Contact support to be eligible for partnerships.')); });


    /* Render Full Page */
    return (
        <div id='popup-page-flow' className='center-absolute-wrapper' onClick={() => allowEscape && navigate(redirectRoute)}>

            {(pageList.length > 0) &&
                pageList[selectedIndex]  
            }

            <div id='flow-control-box' onClick={(event) => event.stopPropagation()}>
                {(pageList.length > 1) &&
                    <div id='flow-control-indicator-box' >
                        <div id='progress-step-box'>
                            {pageList.map((page, index) => 
                                <div key={`flow-control-step-${index}`} className='step-wrapper' onClick={() => setSelectedIndex(index)}>
                                    <div className={`step ${(index === selectedIndex) ? 'step-current' : (index < selectedIndex) ? 'step-completed' : ''}`}>
                                        <label>{index+1}</label>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div id='progress-line'></div>
                    </div>
                }
                <div id='flow-control-button-box' >
                    {(selectedIndex > 0) && <button className='alternative-button'  type='button' onClick={() => previousPage()}>Previous</button> }
                    <button className='submit-button' type='submit' onClick={() => nextPage()}>{((selectedIndex + 1) >= pageList.length) ? 'Complete' : 'Continue'}</button>
                </div>
            </div> 

            {/* Swoop Background */}
            <div id='shape-rectangle'></div>
            <div id='shape-curve'>
                <svg viewBox='0 0 500 150' preserveAspectRatio='none'>
                    <path d='M-2.49,14.31 C274.02,-18.24 292.64,224.51 507.09,115.96 L500.00,0.00 L0.00,0.00 Z'></path>
                </svg>
            </div>
        </div>
    );
}

export default PopupPageFlow;
