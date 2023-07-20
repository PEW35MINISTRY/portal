import { GenderEnum, RoleEnum } from "./Fields-Sync/profile-field-config"

/* Sync between Server and Portal "auth-types" */
export interface JwtResponseBody {
    jwt: string, 
    userID: number, 
    userRole: RoleEnum
};

export interface JwtResponse extends Response, JwtResponseBody {};

export interface LoginResponseBody extends JwtResponseBody {
    userProfile: ProfileResponse,
    service:string
};

export interface LoginResponse extends Response, LoginResponseBody {};

/* Sync between Server and Portal "profile-types" */
export interface ProfileListItem {
    userID: number,
    firstName: string,
    displayName: string,
    image: string,
}

/* [TEMPORARY] Credentials fetched for Debugging */
export type CredentialProfile = { 
    userID: number,
    displayName: string,
    userRole: string,
    email: string,
    passwordHash: string,
}

/* Sync between Server and Portal "profile-types" */
export interface ProfilePublicResponse {
    userID: number, 
    userRole: string, 
    firstName: string,
    displayName: string, 
    gender: GenderEnum,
    image: string,
    // circleList: CircleListItem[],
};

/* Sync between Server and Portal "profile-types" */
export interface ProfilePartnerResponse extends ProfilePublicResponse {
    walkLevel: number,
};

/* Sync between Server and Portal "profile-types" */
export interface ProfileResponse extends ProfilePartnerResponse  {
    lastName: string, 
    email:string,
    postalCode: string, 
    dateOfBirth: Date,
    isActive: boolean,
    partnerList: ProfileListItem[],
};

/*[TEMPORARY] For Syncing Types with Server */ //TODO until Features are Implemented
type Message = {texts:string[]}
type PrayerRequest = {requests:string[]}
