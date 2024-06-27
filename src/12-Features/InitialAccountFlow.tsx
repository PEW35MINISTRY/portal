import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { useAppDispatch, useAppSelector, notify, processAJAXError } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { updateProfileImage } from '../100-App/redux-store';
import { ImageUpload, ImageDefaultEnum } from '../2-Widgets/ImageWidgets';
import { PartnershipContract } from '../2-Widgets/PartnershipWidgets';
import { PartnerListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import WalkLevelQuiz from '../2-Widgets/WalkLevelQuiz';

// import '../index.scss';
import './initialAccountFlow.scss';


const InitialAccountFlow = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const userRoleList:RoleEnum[] = useAppSelector((state) => state.account.userProfile.userRoleList);
    
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [pageList, setPageList] = useState<JSX.Element[]>([]);
    const [newPartner, setNewPartner] = useState<PartnerListItem|undefined>(undefined); 


    useEffect(() => {
        const initialize = async () => {
            const initialFlow:JSX.Element[] = [];

            initialFlow.push(
                <WalkLevelQuiz 
                    key={'initial-account-flow'} 
                    onSelect={nextPage}
                />
            );

            initialFlow.push(
                <WalkLevelQuiz 
                    key={'initial-account-flow'} 
                    onSelect={nextPage}
                />
            );

            initialFlow.push(
                <WalkLevelQuiz 
                    key={'initial-account-flow'} 
                    onSelect={nextPage}
                />
            );

            initialFlow.push(
                <WalkLevelQuiz 
                    key={'initial-account-flow'} 
                    onSelect={nextPage}
                />
            );

            /* Fetch Random Partner */
            if(userRoleList && userRoleList.includes(RoleEnum.USER)) {
                let newPartnerAvailable:boolean = false;
                await axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/new-partner`, { }, { headers: { jwt }})
                    .then((response:{ data:PartnerListItem }) => {
                        setNewPartner(response.data);
                        newPartnerAvailable = true;
                    })
                    .catch((error) => processAJAXError(error));

                //Only prompt if new partner is available | Will notify later to reapply
                if(newPartnerAvailable && newPartner) //TODO has newPartner state updated yet?
                    initialFlow.push(
                        <PartnershipContract
                            key={`User-Edit-Partnership-${userID}-${newPartner.userID}-Contract`}
                            partner={newPartner}
                            onAcceptCallback={() => setNewPartner(undefined)}
                            onDeclineCallback={() => setNewPartner(undefined)}
                        />
                );
            }

            initialFlow.push(
                <ImageUpload
                    key={'initialFlow-image-'+userID}
                    title='Upload Profile Image'
                    imageStyle='profile-image'
                    defaultImage={ ImageDefaultEnum.PROFILE }
                    onUpload={(imageFile: { name: string; type: string; })=> axios.post(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/image/${imageFile.name}`, imageFile, { headers: { 'jwt': jwt, 'Content-Type': imageFile.type }} )
                        .then(response => {
                            nextPage();
                            notify(`Profile Image Uploaded`, ToastStyle.SUCCESS, () => (userID === userID) && dispatch(updateProfileImage(response.data)))})
                        .catch((error) => processAJAXError(error))}
                />
            );

            setPageList(initialFlow);
        };

        initialize();
    }, [userRoleList]);


    /* Utilities */
    const previousPage = (index:number = selectedIndex) => 
        setSelectedIndex(Math.max(0, Math.min(pageList.length - 1, (index - 1))));

    const nextPage = (index:number = selectedIndex) => {
        const newIndex:number = index + 1;
        if(newIndex === pageList.length) 
            navigate('/portal/dashboard/animation');
        else
            setSelectedIndex(Math.max(0, Math.min(pageList.length - 1, newIndex)));
    }


    /* Render Full Page */
    return (
        <div id='initial-account-flow' className='center-absolute-wrapper' >

            {(pageList.length > 0) &&
                pageList[selectedIndex]  
            }

            {(pageList.length > 0) &&
                <div id='flow-control-box'>
                    <div id='flow-control-indicator-box' >
                        <div id='progress-step-box'>
                            {pageList.map((page, index) => 
                                <div key={`flow-control-step-${index}`} onClick={() => setSelectedIndex(index)}
                                className={`step ${(index === selectedIndex) ? 'step-current' : (index < selectedIndex) ? 'step-completed' : ''}`}>                                <label>{index+1}</label>
                                </div>
                            )}
                        </div>
                        <div id='progress-line'></div>
                    </div>
                    <div id='flow-control-button-box' >
                        {(selectedIndex > 0) && <button className='alternative-button'  type='button' onClick={() => previousPage()}>Previous</button> }
                        <button className='submit-button' type='submit' onClick={() => nextPage()}>{((selectedIndex + 1) >= pageList.length) ? 'Complete' : 'Continue'}</button>
                    </div>
                </div> 
            }

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

export default InitialAccountFlow;
