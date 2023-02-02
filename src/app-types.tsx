//For Redux Toast Notifications
export enum ToastStyle {
    INFO = 'INFO', 
    WARN = 'WARNING', 
    ERROR = 'ERROR', 
    SUCCESS = 'SUCCESS'
}

//Sync with Server server.mts
export type serverErrorResponse = {
    status: number, 
    message: string,
    action: string,
    type: string,
    url: string,
    params: string,
    query: string,
    header: string | object,
    body: string | object
};

//Sync with Server profile-types.mts
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
    firstName: string, 
    lastName: string, 
    email:string,
    phone: string, 
    zipcode: string, 
    stage: any, 
    dailyNotificationHour: number
};