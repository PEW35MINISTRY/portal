/************* ONLY DEPENDENCIES FROM DIRECTORY: /field-sync/ *************/

import { GenderEnum, PartnerStatusEnum, RoleEnum } from '../input-config-sync/profile-field-config.js'
import { CircleListItem } from './circle-types.js'
import { PrayerRequestListItem } from './prayer-request-types.js'

/**************************************************************************
*                   PROFILE TYPES                                         *
* Sync across all repositories: server, portal, mobile                    *
* Server: Additional Types Declared in: 1-api/3-profile/profile-types.mts *
* Portal:                                                                 *
* Mobile:                                                                 *
***************************************************************************/


/* [TEMPORARY] Credentials fetched for Debugging */
export type CredentialProfile = { 
    userID: number,
    displayName: string,
    userRole: RoleEnum,
    email: string,
    passwordHash: string,
}

export interface ProfileListItem {
    userID: number,
    firstName: string,
    displayName: string,
    image?: string,
}

export interface PartnerListItem extends ProfileListItem {
    status: PartnerStatusEnum, //Transformed in reference to requesting userID
    contractDT?: Date|string,
    partnershipDT?: Date|string,
}

export interface NewPartnerListItem extends PartnerListItem {
    maxPartners: number,
    gender: GenderEnum,
    dateOfBirth: Date|string,
    walkLevel: number,
    postalCode: string,
}

export interface PartnerCountListItem extends NewPartnerListItem {
    partnerCountMap: Map<PartnerStatusEnum, number> | [PartnerStatusEnum, number][]
}

export interface ProfilePublicResponse {
    userID: number, 
    userRole: RoleEnum, 
    firstName: string,
    displayName: string, 
    gender: GenderEnum,
    image?: string,
    circleList?: CircleListItem[],
};


export interface ProfileResponse extends ProfilePublicResponse  {
    lastName: string, 
    email:string,
    postalCode: string, 
    dateOfBirth: string,
    isActive: boolean,
    maxPartners: number,
    walkLevel: number,
    notes?: string,
    userRoleList: RoleEnum[],
    circleInviteList?: CircleListItem[],
    circleRequestList?: CircleListItem[],
    partnerList?: PartnerListItem[],
    partnerPendingUserList?: PartnerListItem[],
    partnerPendingPartnerList?: PartnerListItem[],
    prayerRequestList?: PrayerRequestListItem[],
    contactList?: ProfileListItem[],
    profileAccessList?: ProfileListItem[], //Leaders
};

export interface ProfileEditRequestBody {
    firstName?: string, 
    lastName?: string, 
    displayName?: string, 
    email?: string,
    password?: string,
    passwordVerify?: string,
    postalCode?: string, 
    dateOfBirth?: string, 
    gender?: GenderEnum,
    isActive?: boolean,
    maxPartners?: number,
    walkLevel?: number,
    image?: string,
    notes?: string,
    userRoleTokenList?: [{role: RoleEnum, token: string}]
}
