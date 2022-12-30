import axios from "axios";

//Input Validation
export default  async(name: string, value:any, input:any, validation:any) => {
    let errors:any = validation;

    //Require Input for All
    errors[name] = undefined;
    if(!value.trim()) 
        errors[name] = `${name} is required`;

    if(name === 'email' && !/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(value))
        errors.email = `Invalid email format`;
    else if(name === 'email' && value !== input.emailVerify)
        errors.email = `Email fields do not match`;
    else if(name === 'emailVerify' && input.email !== value)
        errors.email = `Email fields do not match`;

    if(name === 'password' && !/[a-z]{5,}/.test(value))
        errors.password = `Password lowercase only and at least 5 characters`;
    else if(name === 'password' && value !== input.passwordVerify)
        errors.password = `Password fields do not match`;
    else if(name === 'passwordVerify' && input.password !== value)
        errors.password = `Password fields do not match`;

    if(name === 'userRole') {
        const availableUserRoles:string[] = await getAvailableUserRoles();
    
        if(!availableUserRoles.length)
            errors.userRole = `User Roles are unavailable, please contact PEW35`;
        else if(!availableUserRoles.includes(value))
            errors.userRole = `Invalid User Role`;
    }

    if(name === 'phone' && !/^[1]{0,1}-[0-9]{3}-[0-9]{3}-[0-9]{4}$/.test(value))
        errors.phone = `Invalid phone format: X-XXX-XXX-XXXX`;

    if(name === 'zipcode' && !/^[0-9]{5}$/.test(value))
        errors.zipcode = `Invalid Zipcode format, five numbers (US Only)`;

    if(name === 'dob' && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))
        errors.dob = `Invalid Date of Birth format: YYYY-MM-DD`;
    else if(name === 'dob' && convertDate(value) > findDateYears(-13))
        errors.dob = `Must be 13 years old to create an account.`;
    else if(name === 'dob' && input.userRole === 'STUDENT' && convertDate(value) < findDateYears(-18))
        errors.dob = `Must be younger than 18 years old to create a STUDENT account.`;
    else if(name === 'dob' && input.userRole === 'LEADER' && convertDate(value) > findDateYears(-18))
        errors.dob = `Must be 18 years old to create a LEADER account.`;
    else if(name === 'dob' && input.userRole === 'LEADER' && convertDate(value) > findDateYears(-21))
        errors.dob = `Must be 21 years old to create an ADMIN account.`;

    if(name === 'gender' && value !== 'MALE' && value !== 'FEMALE')
        errors.dob = `Invalid Gender.`;

    if(name === 'dailyNotificationHour' && convertHour(value) && convertHour(value) < 0 && convertHour(value) > 23)
        errors.dailyNotificationHour = `Invalid Hour format`;
    
    if(errors.length)
        console.log('VALIDATION ERRORS', errors);

    return errors;
}


export const convertHour = (text:string):number => {
    const hour = text.match(/^[0-9]{1,2}/);
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