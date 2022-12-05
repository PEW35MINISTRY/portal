export enum StageEnum {
    LEARNING = 'LEARNING',
    GROWING = 'GROWING', 
    LIVING = 'LIVING'
}

export enum GenderEnum {
    MALE = 'MALE',
    FEMALE = 'FEMALE'
}

export enum RoleEnum {
    STUDENT = 'STUDENT',
    LEADER = 'LEADER',
    ADMIN = 'ADMIN',
}

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


export interface ProfileResponse extends ProfilePublicResponse  {
    email:string,
    phone: string, 
    zipcode: string, 
    stage: StageEnum, 
    dailyNotificationHour: number
};