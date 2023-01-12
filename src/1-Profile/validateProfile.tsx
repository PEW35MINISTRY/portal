import axios from "axios";

export type ProfileType = {
    email?: string,
    emailVerify?: string,
    password?: string,
    passwordVerify?: string,
    userRole?: string,
    displayName?: string,
    firstName?: string,
    lastName?: string,
    phone?: string,
    zipcode?: string,
    dob?: string,
    gender?: string,
    dailyNotificationHour?: string,
    profileImage?: string,

    verified?: boolean,
    notes?: string

    // circleList?: string[],
    // partnerList?: string[]
}

//Input Validation
export default  async(field: any, value:any, input:any, validation:any) => {
    let errors:any = validation;
    // console.log('VALIDATING', field, value, input, validation);

    //Require Input for All
    delete errors[field];
    if(value == undefined || !value.toString().trim().length) {
        errors[field] = `${field} is required`;
        return errors;
    }

    if((field === 'email' || field === 'emailVerify') && !/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(value))
        errors.email = `Invalid email format`;
    else if(field === 'email' && value !== input.emailVerify)
        errors.email = `Email fields do not match`;
    else if(field === 'emailVerify' && input.email !== value)
        errors.email = `Email fields do not match`;
    else if(field === 'emailVerify')
        delete errors['email'];

    if((field === 'password' || field === 'passwordVerify') && !/[a-z]{5,}/.test(value))
        errors.password = `Password lowercase only and at least 5 characters`;
    else if(field === 'password' && value !== input.passwordVerify)
        errors.password = `Password fields do not match`;
    else if(field === 'passwordVerify' && input.password !== value)
        errors.password = `Password fields do not match`;
    else if(field === 'passwordVerify')
        delete errors['password'];

    if(field === 'userRole') {
        const availableUserRoles:string[] = await getAvailableUserRoles();
    
        if(!availableUserRoles.length)
            errors.userRole = `User Roles are unavailable, please contact PEW35`;
        else if(!availableUserRoles.includes(value))
            errors.userRole = `Invalid User Role`;
    }

    if(field === 'phone' && !/^[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}$/.test(value))
        errors.phone = `Invalid phone format: X-XXX-XXX-XXXX`;

    if(field === 'zipcode' && !/^[0-9]{5}$/.test(value))
        errors.zipcode = `Invalid Zipcode format, five numbers (US Only)`;

    if(field === 'dob' && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))
        errors.dob = `Invalid Date of Birth format: YYYY-MM-DD`;
    else if(field === 'dob' && convertDate(value) > findDateYears(-13))
        errors.dob = `Must be 13 years old to create an account.`;
    else if(field === 'dob' && input.userRole === 'STUDENT' && convertDate(value) < findDateYears(-18))
        errors.dob = `Must be younger than 18 years old to create a STUDENT account.`;
    else if(field === 'dob' && input.userRole === 'LEADER' && convertDate(value) > findDateYears(-18))
        errors.dob = `Must be 18 years old to create a LEADER account.`;
    else if(field === 'dob' && input.userRole === 'LEADER' && convertDate(value) > findDateYears(-21))
        errors.dob = `Must be 21 years old to create an ADMIN account.`;

    if(field === 'gender' && value !== 'MALE' && value !== 'FEMALE')
        errors.dob = `Invalid Gender.`;

    if(field === 'dailyNotificationHour' && convertHour(value) && convertHour(value) < 0 && convertHour(value) > 23)
        errors.dailyNotificationHour = `Invalid Hour format`;
    
    if(Object.keys(errors).length > 0)
        console.log('VALIDATION ERRORS', errors);
    else
        console.log('Valid Input:', input, 'No Errors:', errors);

    return errors;
}


export const convertHour = (text:string):number => {
    const hour = String(text || "").match(/^[0-9]{1,2}/);
    if(hour && Number(hour[0]))
        return Number(hour[0]);
    return -1;
}

export const convertDate = (text:string):Date => {
    return new Date(text);
}

export const findDateYears = (years:number):Date => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    return date;
}

export const getAvailableUserRoles = async():Promise<string[]> => new Promise((resolve, reject) => 
    axios.get(`${process.env.REACT_APP_DOMAIN}/resources/role-list`)
        .then(response => resolve(response.data))
        .catch(error => {console.log('AXIOS Fetch User Roles Failed:', error); resolve([]); })
    );

    export const testEmailExists = async(email:string):Promise<boolean> => new Promise((resolve, reject) => 
    axios.post(`${process.env.REACT_APP_DOMAIN}/resources/account-exists`,{email: email})
        .then(response => resolve(true))
        .catch(error => {console.log('AXIOS Sign-up account already exists:', error); resolve(false); })
    );