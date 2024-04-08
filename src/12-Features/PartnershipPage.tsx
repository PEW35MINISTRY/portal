import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PartnerListItem, ProfileListItem, PartnerCountListItem, NewPartnerListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { PartnerItem, ProfileItem } from '../2-Widgets/SearchList/SearchListItemCards';
import formatRelativeDate from '../1-Utilities/dateFormat';
import { useNavigate } from 'react-router-dom';
import { makeAbbreviatedText, makeDisplayText } from '../1-Utilities/utilities';


import './partnership.scss';
import { PartnerStatusEnum, RoleEnum } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { PartnershipDeleteAllADMIN, PartnershipStatusADMIN } from '../2-Widgets/PartnershipWidgets';
import { SearchType, ListItemTypesEnum, DisplayItemType } from '../0-Assets/field-sync/input-config-sync/search-config';
import SearchList from '../2-Widgets/SearchList/SearchList';
import { SearchListKey, SearchListValue } from '../2-Widgets/SearchList/searchList-types';
import { ToastStyle } from '../100-App/app-types';


export enum PARTNERSHIP_VIEW {
    PENDING_PARTNERSHIPS = 'PENDING_PARTNERSHIPS', //Dual View
    NEW_USERS = 'NEW_USERS',
    FEWER_PARTNERSHIPS = 'FEWER_PARTNERSHIPS'
}

/* ADMIN ACCESS PAGE */
const PartnershipPage = (props:{view:PARTNERSHIP_VIEW}) => {
    const navigate = useNavigate();
    const JWT:string = useAppSelector((state) => state.account.jwt);

    const [defaultDisplayTitleList, setDefaultDisplayTitleList] = useState<string[]>(['Unassigned Users']);
    const [dualPartnerList, setDualPartnerList] = useState<[NewPartnerListItem, NewPartnerListItem][]>([]);
    const [statusMap, setStatusMap] = useState<PartnerCountListItem[]>([]);
    const [unassignedPartnerList, setUnassignedPartnerList] = useState<NewPartnerListItem[]>([]);
    const [availablePartnerList, setAvailablePartnerList] = useState<NewPartnerListItem[]>([]);

    const [selectedUser, setSelectedUser] = useState<ProfileListItem|undefined>(undefined); //undefined hides popup
    const [selectedPartner, setSelectedPartner] = useState<ProfileListItem|undefined>(undefined);
    const [showDelete, setShowDelete] = useState<boolean>(false);


    useEffect(() => {
        if(JWT && props.view === PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/pending-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:[NewPartnerListItem, NewPartnerListItem][] }) => {
                    setDualPartnerList(response.data);

                }).catch((error) => { processAJAXError(error); });

        /* Status Maps */
        } else if(JWT && props.view === PARTNERSHIP_VIEW.NEW_USERS || props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/${(props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS) ? 'fewer-status-map' : 'status-map'}`, { headers:{ jwt:JWT } })
                .then((response:{ data:PartnerCountListItem[] }) => {
                    setStatusMap(response.data);

                }).catch((error) => { processAJAXError(error); });

            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/unassigned-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:NewPartnerListItem[] }) => {
                    setUnassignedPartnerList(response.data);

                }).catch((error) => { processAJAXError(error); });
        }

    },[JWT, props.view]);

    useEffect(() => {
        if(selectedUser && !showDelete && (props.view === PARTNERSHIP_VIEW.NEW_USERS || props.view === PARTNERSHIP_VIEW.FEWER_PARTNERSHIPS)) 
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
                                onAlternativeButtonClick={() => { setSelectedUser(partner); setShowDelete(true); }}
                            />
                            <p key={`status-${index}-max-partners`} className='status-count' >{partner.maxPartners || 0}</p>
                            {[...partner.partnerCountMap].map(([status, count]) => (
                                <p key={`status-${index}-${status}-${count}`} className='status-count' >{count || 0}</p>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            }
        </div>

        {(props.view !== PARTNERSHIP_VIEW.PENDING_PARTNERSHIPS) &&
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
                                    onSearchAlternativeButtonCallback: (id:number, item:DisplayItemType) => { setSelectedUser(item as ProfileListItem); setShowDelete(true); }
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
                                    onSearchAlternativeButtonCallback: (id:number, item:DisplayItemType) => { setSelectedUser(item as ProfileListItem); setShowDelete(true); }
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

            {(selectedUser !== undefined && selectedPartner !== undefined) &&
                <PartnershipStatusADMIN
                    key={`Partnership-${selectedUser}-${selectedPartner}-ADMIN`}
                    user={selectedUser}
                    partner={selectedPartner}
                    currentStatus={('status' in selectedUser) ? (selectedUser as PartnerListItem).status : PartnerStatusEnum.PENDING_CONTRACT_BOTH}
                    onCancel={() => setSelectedPartner(undefined)}
                />
            }

            {(selectedUser !== undefined && showDelete) &&
                <PartnershipDeleteAllADMIN
                    key={`Partnership-${selectedUser}-ADMIN`}
                    user={selectedUser}
                    statusMap={new Map(statusMap.filter(profile => profile.userID === selectedUser.userID)[0].partnerCountMap)}
                    onCancel={() => setShowDelete(false)}
                />
            }
            
        </div>
    );
}

export default PartnershipPage;
