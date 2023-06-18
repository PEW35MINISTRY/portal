import { RoleEnum } from "./Fields-Sync/profile-field-config"

export interface JWTResponseBody {
    JWT: string, 
    userId: number, 
    userRole: RoleEnum
};

export interface JWTResponse extends Response, JWTResponseBody {};

export interface LoginResponseBody extends JWTResponseBody {
    userProfile: ProfileResponse,
    service:string
};

export interface LoginResponse extends Response, LoginResponseBody {};

/* Sync between Server and Portal "profile-types" */
export interface ProfilePublicResponse {
    userId: number, 
    userRole: string, 
    displayName: string, 
    profileImage: string, 
    gender:string,
    dob:number,
    proximity?:number,
    circleList: {
        circleId: string,
        title: string,
        image: string,
        sameMembership: boolean
    }[],
};

/*[TEMPORARY] For Syncing Types with Server */ //TODO until Features are Implemented
type Message = {texts:string[]}
type PrayerRequest = {requests:string[]}

enum StageEnum {
    LEARNING = 'LEARNING',
    GROWING = 'GROWING', 
    LIVING = 'LIVING'
}

/* Sync between Server and Portal "profile-types" */
export interface ProfileResponse extends ProfilePublicResponse  {
    firstName: string, 
    lastName: string, 
    email:string,
    phone: string, 
    zipcode: string, 
    stage: StageEnum, 
    dailyNotificationHour: number
};

/* Sync between Server and Portal "profile-types" */
export interface ProfilePartnerResponse extends ProfilePublicResponse  {
    zipcode: string, 
    stage: StageEnum, 
    dailyNotificationHour: number,
    pendingPrayerRequestList: PrayerRequest[],
    answeredPrayerRequestList: PrayerRequest[],
    messageList: Message[],
};
