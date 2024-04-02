import axios from 'axios';
import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PartnerListItem, ProfileListItem, ProfilePartnerCountListItem } from '../0-Assets/field-sync/api-type-sync/profile-types';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { ProfileItem } from '../2-Widgets/SearchList/SearchListItemCards';
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
    PENDING = 'PENDING', //Dual View
    RECENT = 'RECENT',
    FEWER = 'FEWER'
}

/* ADMIN ACCESS PAGE */
const PartnershipPage = (props:{view:PARTNERSHIP_VIEW}) => {
    const navigate = useNavigate();
    const JWT:string = useAppSelector((state) => state.account.jwt);

    const [defaultDisplayTitleList, setDefaultDisplayTitleList] = useState<string[]>(['Unassigned Users']);
    const [dualPartnerList, setDualPartnerList] = useState<[PartnerListItem, PartnerListItem][]>([]);
    const [statusMap, setStatusMap] = useState<ProfilePartnerCountListItem[]>([]);
    const [unassignedPartnerList, setUnassignedPartnerList] = useState<ProfileListItem[]>([]);
    const [availablePartnerList, setAvailablePartnerList] = useState<ProfileListItem[]>([]);

    const [selectedUser, setSelectedUser] = useState<ProfileListItem|undefined>(undefined); //undefined hides popup
    const [selectedPartner, setSelectedPartner] = useState<ProfileListItem|undefined>(undefined);
    const [showDelete, setShowDelete] = useState<boolean>(false);


    useEffect(() => {
        if(JWT && props.view === PARTNERSHIP_VIEW.PENDING) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/pending-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:[PartnerListItem, PartnerListItem][] }) => {
                    setDualPartnerList(response.data);

                }).catch((error) => { processAJAXError(error); });

        /* Status Maps */
        } else if(JWT && props.view === PARTNERSHIP_VIEW.RECENT || props.view === PARTNERSHIP_VIEW.FEWER) {
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/${(props.view === PARTNERSHIP_VIEW.FEWER) ? 'fewer-status-map' : 'status-map'}`, { headers:{ jwt:JWT } })
                .then((response:{ data:ProfilePartnerCountListItem[] }) => {
                    setStatusMap(response.data);

                }).catch((error) => { processAJAXError(error); });

            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/unassigned-list`, { headers:{ jwt:JWT } })
                .then((response:{ data:ProfileListItem[] }) => {
                    setUnassignedPartnerList(response.data);

                }).catch((error) => { processAJAXError(error); });
        }

    },[JWT, props.view]);

    useEffect(() => {
        if(selectedUser && !showDelete && (props.view === PARTNERSHIP_VIEW.RECENT || props.view === PARTNERSHIP_VIEW.FEWER)) 
            axios.get(`${process.env.REACT_APP_DOMAIN}/api/admin/partnership/client/${selectedUser.userID}/available`, { headers: { jwt: JWT }})
                .then((response:{ data:ProfileListItem[] }) => {
                    setAvailablePartnerList([...response.data]);
                    setDefaultDisplayTitleList((response.data.length > 0) ? ['Available Partners'] : ['Unassigned Users']);
                    notify(`${response.data.length} Available Partners`, ToastStyle.INFO);
                })
                .catch((error) => processAJAXError(error));
    }, [selectedUser]);


    return (
        <div id='partnership-page'>
            <div className='main-content'>
            {(props.view === PARTNERSHIP_VIEW.PENDING) ?
                <div id='dual-view' className='grid-container'>
                    <h1 className='grid-header' style={{ gridColumn: '1 / span 2' }}>Pending Partnerships</h1>
                    {dualPartnerList.map((partnershipPair, index) => (
                        <React.Fragment key={`pending-pair-${index}`}>
                            <ProfileItem
                                key={`pending-user-${index}`}
                                user={partnershipPair[0]}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                                alternativeButtonText={formatRelativeDate(partnershipPair[0].contractDT || '', undefined, { shortForm: false, includeHours: false })}
                                primaryButtonText={makeDisplayText(partnershipPair[0].status)}
                                onPrimaryButtonClick={() => {
                                    setSelectedUser(partnershipPair[0]);
                                    setSelectedPartner(partnershipPair[1]);
                                }}
                            />
                            <ProfileItem
                                key={`pending-partner-${index}`}
                                user={partnershipPair[1]}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                                alternativeButtonText={formatRelativeDate(partnershipPair[1].contractDT || '', undefined, { shortForm: false, includeHours: false })}
                                primaryButtonText={makeDisplayText(partnershipPair[1].status)}
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
                        <h1 >{makeDisplayText(props.view)} Partners</h1>
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
                            <ProfileItem
                                key={`status-profile-${index}-${(selectedUser?.userID === partner.userID) ? 'selected' : ''}`}
                                class={(selectedUser?.userID === partner.userID) ? 'selected' : undefined}
                                user={partner}
                                onClick={(id) => navigate(`/portal/edit/profile/${id}`)}
                                primaryButtonText='New Partner'
                                onPrimaryButtonClick={() => setSelectedUser(partner)}
                                alternativeButtonText='Remove'
                                onAlternativeButtonClick={() => { setSelectedUser(partner); setShowDelete(true); }}
                            />
                            <p key={`status-${index}-max-partners`} >{partner.maxPartners || 0}</p>
                            {[...partner.partnerCountMap].map(([status, count]) => (
                                <p key={`status-${index}-${status}-${count}`} >{count || 0}</p>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            }
        </div>

        {(props.view !== PARTNERSHIP_VIEW.PENDING) &&
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
                                [...unassignedPartnerList].map((profile:ProfileListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                    onClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    primaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onPrimaryButtonCallback: (id:number) => setSelectedPartner(profile),
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

                                [...availablePartnerList].map((profile:ProfileListItem) => new SearchListValue({displayType: ListItemTypesEnum.USER, displayItem: profile, 
                                    onClick: (id:number) => navigate(`/portal/edit/profile/${id}`),
                                    primaryButtonText: (selectedUser) ? 'Assign Partnership' : '', 
                                    onPrimaryButtonCallback: (id:number) => setSelectedPartner(profile),
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
