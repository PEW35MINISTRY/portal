import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PartnerListItem, ProfileListItem, PartnerCountListItem, NewPartnerListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { PartnerItem } from '../2-Widgets/SearchList/SearchListItemCards';
import { makeAbbreviatedText, makeDisplayText } from '../1-Utilities/utilities';
import { PartnerStatusEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { PartnershipDeleteAllADMIN, PartnershipStatusADMIN } from '../2-Widgets/PartnershipWidgets';
import { SearchType, ListItemTypesEnum, DisplayItemType } from '../0-Assets/field-sync/input-config-sync/search-config';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { blueColor, ModelPopUpAction, PageState, ToastStyle } from '../100-App/app-types';
import FullImagePage from './Utility-Pages/FullImagePage';
import { ImageDefaultEnum } from '../2-Widgets/ImageWidgets';

import './partnership.scss';

export enum PARTNERSHIP_VIEW {
    PENDING_PARTNERSHIPS = 'PENDING_PARTNERSHIPS', //Dual View
    NEW_USERS = 'NEW_USERS',
    FEWER_PARTNERSHIPS = 'FEWER_PARTNERSHIPS'
}

/* ADMIN ACCESS PAGE */
const PartnershipPage = (props:{view:PARTNERSHIP_VIEW}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const JWT:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);
    const { action } = useParams();
    
    const [viewState, setViewState] = useState<PageState>(PageState.LOADING);
    const [defaultDisplayTitleList, setDefaultDisplayTitleList] = useState<string[]>(['Unassigned Users']);
    const [dualPartnerList, setDualPartnerList] = useState<[NewPartnerListItem, NewPartnerListItem][]>([]);
    const [statusMap, setStatusMap] = useState<PartnerCountListItem[]>([]);
    const [unassignedPartnerList, setUnassignedPartnerList] = useState<NewPartnerListItem[]>([]);
    const [availablePartnerList, setAvailablePartnerList] = useState<NewPartnerListItem[]>([]);

    /* Select & Modify Partnership Status */
    const [selectedUser, setSelectedUser] = useState<ProfileListItem|undefined>(undefined); //undefined hides popup
    const [selectedPartner, setSelectedPartner] = useState<ProfileListItem|undefined>(undefined);
    const [popUpAction, setPopUpAction] = useState<ModelPopUpAction>(ModelPopUpAction.NONE);
    const SUPPORTED_POP_UP_ACTIONS:ModelPopUpAction[] = [ModelPopUpAction.EDIT, ModelPopUpAction.DELETE, ModelPopUpAction.NONE];

    const viewRoute: string = useMemo(() => (props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS) ? 'fewer' 
                                            : (props.view === PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) ? 'pending'
                                            : 'recent', [props.view]);
    

    const updatePopUpAction = (newAction:ModelPopUpAction) => {
        if(SUPPORTED_POP_UP_ACTIONS.includes(newAction) && popUpAction !== newAction) {
            navigate(`/portal/partnership/${viewRoute}${newAction.length > 0 ? `/${newAction}` : ''}`, {replace: true});
            setPopUpAction(newAction);

            if(newAction === ModelPopUpAction.NONE) setSelectedPartner(undefined);
        }
    }

    /* Trigger PopUp when partner is selected */
    useEffect(() => { if(selectedUser !== undefined && selectedPartner !== undefined && popUpAction === ModelPopUpAction.NONE) 
        updatePopUpAction(ModelPopUpAction.EDIT)}, [selectedPartner]);

    /* Update state to reflect URL as source of truth */
    useEffect(() => {
        if(userID <= 0 || JWT.length === 0) return;

        let targetPath:string = location.pathname;
        let targetAction:ModelPopUpAction = popUpAction;
        
        //Match popUpAction in URL
        if(action !== undefined) {
            //DELETE is not supported, because we don't have a userID in the URL
            const APPLICABLE_SUPPORTED_POP_UP_ACTIONS:ModelPopUpAction[] = SUPPORTED_POP_UP_ACTIONS.filter(p => p !== ModelPopUpAction.DELETE)
            targetAction = APPLICABLE_SUPPORTED_POP_UP_ACTIONS.includes(action.toLowerCase() as ModelPopUpAction)
                ? (action?.toLowerCase() as ModelPopUpAction)
                : ModelPopUpAction.NONE;
            targetPath = `/portal/partnership/${viewRoute}${targetAction.length > 0 ? `/${targetAction}` : ''}`;
        }

        //Limit State Updates
        if(targetPath !== location.pathname) navigate(targetPath);
        if(targetAction !== popUpAction) setPopUpAction(targetAction);

    }, [JWT, location.pathname.includes('edit')]);

    /* Fetch relevant data for props.view (Component gets reused) */
    useEffect(() => {
        if(JWT && props.view === PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/pending-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:[NewPartnerListItem, NewPartnerListItem][] }) => {
                    setDualPartnerList(response.data);
                    setViewState(PageState.VIEW);

                }).catch((error) => { processAJAXError(error); setViewState(PageState.ERROR); });

        /* Status Maps */
        } else if(JWT && props.view === PARTNERSHIP_VIEW.NEW_USERS || props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/${(props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS) ? 'fewer-status-map' : 'status-map'}`, { headers:{ jwt:JWT } })
                .then((response:{ data:PartnerCountListItem[] }) => {
                    setStatusMap(response.data);
                    setViewState(PageState.VIEW);

                }).catch((error) => { processAJAXError(error); setViewState(PageState.ERROR); });

            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/unassigned-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:NewPartnerListItem[] }) => {
                    setUnassignedPartnerList(response.data);

                }).catch((error) => { processAJAXError(error); });
        }

    },[JWT, props.view]);

    /* Fetch Available & Eligible Partners for selectedUser */
    useEffect(() => {
        if(selectedUser && (popUpAction === ModelPopUpAction.NONE) && (props.view === PARTNERSHIP_VIEW.NEW_USERS || props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS)) 
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/client/${selectedUser.userID}/available`, { headers: { jwt: JWT }})
                .then((response:{ data:NewPartnerListItem[] }) => {
                    setAvailablePartnerList([...response.data]);
                    setDefaultDisplayTitleList((response.data.length > 0) ? ['Available Partners'] : ['Unassigned Users']);
                    notify(`${response.data.length} Available Partners`, ToastStyle.INFO);
                })
                .catch((error) => processAJAXError(error));
    }, [selectedUser]);


    return (
        <div id='partnership-page'>

            {(viewState === PageState.LOADING) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} backgroundColor='transparent' message='Loading...' messageColor={blueColor}
                                                            alternativeButtonText={'View Profile'} onAlternativeButtonClick={()=>navigate(`/portal/edit/profile/${userID}`)} />

                : (viewState === PageState.ERROR) ? <FullImagePage imageType={ImageDefaultEnum.LOGO} message='Currently Unavailable'
                                                            alternativeButtonText={'View Profile'} onAlternativeButtonClick={()=>navigate(`/portal/edit/profile/${userID}`)} />
                : <></>
            }

            {(viewState === PageState.VIEW) &&
            <div className='main-content'>
            {(props.view === PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) ?
                <div id='dual-view' className='grid-container'>
                    <h1 className='grid-header' style={{ gridColumn: '1 / span 2' }}>Pending Partnerships</h1>
                    {dualPartnerList.map((partnershipPair, index) => (
                        <React.Fragment key={`pending-pair-${index}`}>
                            <PartnerItem
                                key={`pending-user-${index}`}
                                partner={partnershipPair[0]}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                            />
                            <PartnerItem
                                key={`pending-partner-${index}`}
                                partner={partnershipPair[1]}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                                primaryButtonText='Assign Partnership'
                                onPrimaryButtonClick={() => {
                                    setSelectedUser(partnershipPair[0]);
                                    setSelectedPartner(partnershipPair[1]);
                                }}
                            />
                        </React.Fragment>
                    ))}
                </div>
            : 
                <div id='status-view' className='grid-container' style={{gridTemplateColumns: `auto repeat(${Object.values(PartnerStatusEnum).length + 1}, 1fr)`}} >
                    <span key={`status-header-profile`} className='grid-header grid-profile-header' >
                        <h1 >{makeDisplayText(props.view)}</h1>
                    </span>
                    <span key={`status-header-max-partners`} className='grid-header grid-header-rotate' >
                        <h3>Max</h3>
                    </span>

                    {Object.values(PartnerStatusEnum).map((status, index) =>
                        <span key={`status-header-${status}-${index}`} className='grid-header grid-header-rotate' >
                            <h3>{makeAbbreviatedText(status, false)}</h3>
                        </span>
                    )}

                    {statusMap.map((partner, index) => (
                        <React.Fragment key={`status-${index}`}>
                            <PartnerItem
                                key={`status-profile-${index}-${(selectedUser?.userID === partner.userID) ? 'selected' : ''}`}
                                class={(selectedUser?.userID === partner.userID) ? 'selected' : undefined}
                                partner={partner}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                                primaryButtonText='New Partner'
                                onPrimaryButtonClick={() => setSelectedUser(partner)}
                                alternativeButtonText='Clear Status'
                                onAlternativeButtonClick={() => { setSelectedUser(partner); updatePopUpAction(ModelPopUpAction.DELETE); }}
                            />
                            <p key={`status-${index}-max-partners`} className='status-count' >{partner.maxPartners || 0}</p>
                            {[...partner.partnerCountMap].map(([status, count]) => (
                                <p key={`status-${index}-${status}-${count}`} className='status-count' >{count || 0}</p>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            }
        </div>}

        {(viewState === PageState.VIEW) && (props.view !== PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) &&
            <SearchList
                    key={'Partnership'}
                    defaultDisplayTitleList={defaultDisplayTitleList}
                    displayMap={new Map([
                            [
                                new SearchListKey({displayTitle:'Unassigned Users', searchType: SearchType.USER,
                                    onSearchClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    searchPrimaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => setSelectedPartner(item as ProfileListItem),
                                    searchAlternativeButtonText: 'Remove',
                                    onSearchAlternativeButtonCallback: (id:number, item:DisplayItemType) => { setSelectedUser(item as ProfileListItem); updatePopUpAction(ModelPopUpAction.DELETE); }
                                }),
                                [...unassignedPartnerList].map((partner:NewPartnerListItem) => new SearchListValue({displayType: ListItemTypesEnum.PARTNER, displayItem: partner, 
                                    onClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    primaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onPrimaryButtonCallback: (id:number) => setSelectedPartner(partner),
                                }))
                            ], 
                            [ /* Only ADMIN can Choose or Search Partners */
                                new SearchListKey({displayTitle:'Available Partners', searchType: SearchType.USER, 
                                    onSearchClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    searchPrimaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onSearchPrimaryButtonCallback: (id:number, item:DisplayItemType) => setSelectedPartner(item as ProfileListItem),
                                    searchAlternativeButtonText: 'Remove',
                                    onSearchAlternativeButtonCallback: (id:number, item:DisplayItemType) => { setSelectedUser(item as ProfileListItem); updatePopUpAction(ModelPopUpAction.DELETE); }
                                }),

                                [...availablePartnerList].map((partner:NewPartnerListItem) => new SearchListValue({displayType: ListItemTypesEnum.PARTNER, displayItem: partner, 
                                    onClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    primaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onPrimaryButtonCallback: (id:number) => setSelectedPartner(partner),
                                }))
                            ], 
                    ])}
                />
            }

            {/* Accessible through '+' in Menu, in which case selectedUser and selectedPartner may be undefined */}
            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.EDIT) &&
                <PartnershipStatusADMIN
                    key={`Partnership-${selectedUser}-${selectedPartner}-ADMIN`}
                    userID={selectedUser?.userID}
                    partnerID={selectedPartner?.userID}
                    currentStatus={(selectedUser && 'status' in selectedUser) ? (selectedUser as PartnerListItem).status : undefined}
                    onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />
            }

            {(viewState === PageState.VIEW) && (popUpAction === ModelPopUpAction.DELETE) && (selectedUser !== undefined) &&
                <PartnershipDeleteAllADMIN
                    key={`Partnership-${selectedUser}-ADMIN`}
                    user={selectedUser}
                    statusMap={new Map(statusMap.filter(profile => profile.userID === selectedUser.userID)[0].partnerCountMap)}
                    onCancel={() => updatePopUpAction(ModelPopUpAction.NONE)}
                />
            }
            
        </div>
    );
}

export default PartnershipPage;
