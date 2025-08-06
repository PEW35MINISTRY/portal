

/*******************
 * DATE FORMATTING
 *******************/
const DAY_OF_WEEK_SHORT:string[] = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
const DAY_OF_WEEK_LONG:string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT:string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG:string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const getFutureDate = (date:Date = new Date(), days:number = 0, hours:number = 0):Date => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    newDate.setHours(date.getHours() + hours, 0, 0, 0);
    return newDate;
  }
  
export const formatNumberOrdinal = (n:number):string => 
    (n % 10 == 1 && n % 100 != 11) ? n + 'st'
    : (n % 10 == 2 && n % 100 != 12) ? n + 'nd'
    : (n % 10 == 3 && n % 100 != 13) ? n + 'rd'
    : n + 'th';
  
  
  //Relative Date Rules
const formatRelativeDate = (startDate:Date|string, endDate?:Date|string, options?:{shortForm?:boolean, includeHours?:boolean, alwaysIncludeMonth?:boolean, markPassed?:boolean}):string => {
    options = {shortForm:true, includeHours:true, alwaysIncludeMonth:false, markPassed:false, ...options}; //Apply defaults & inputted overrides
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let text = '';

    //Handle Date type validations
    if(startDate === undefined || !((startDate instanceof Date) || (typeof startDate === 'string' && (startDate as string).length > 0))
      || (endDate !== undefined && !((endDate instanceof Date) || (typeof endDate === 'string' && (endDate as string).length > 0))))
          return '';
  
    if(typeof startDate === 'string') startDate = new Date(startDate);
    if(endDate !== undefined && typeof endDate === 'string') endDate = new Date(endDate);  
    if(startDate === endDate) endDate = undefined;

    const isPassed:boolean = (options.markPassed === true) && (endDate !== undefined) && (endDate > today);
  
    //Date is currently onGoing
    let currentlyOnGoing = false;
    if(today > startDate && endDate != undefined && today < endDate) {
      currentlyOnGoing = true;
      text += 'Now';
    }
  
    //Day of the week 
    else if(startDate > getFutureDate(today, -1) && startDate < getFutureDate(today, 1) && (!isPassed || !options.includeHours)) text += 'Today';

    else if(startDate > getFutureDate(today, -2) && startDate < getFutureDate(today, -1)) text += options.shortForm ? 'Ytd' : 'Yesterday';

    else if(startDate > getFutureDate(today, 1) && startDate < getFutureDate(today, 2)) text += options.shortForm ? 'Tom' : 'Tomorrow';

    else if(startDate > getFutureDate(today, -7) && startDate < getFutureDate(today, 7)) text += options.shortForm ? DAY_OF_WEEK_SHORT[startDate.getDay()] : DAY_OF_WEEK_LONG[startDate.getDay()];

    else if(!options.alwaysIncludeMonth && startDate.getMonth() === today.getMonth()) text += formatNumberOrdinal(startDate.getDate());

    else text += options.shortForm ? MONTH_SHORT[startDate.getMonth()] : MONTH_LONG[startDate.getMonth()] + ' ' + formatNumberOrdinal(startDate.getDate());

    text += ' ';
    
    //Hours
    if(options.includeHours && !currentlyOnGoing && !isPassed) {
        if(startDate.getHours() === 0) text += options.shortForm ? 'Mid' : 'Midnight';
        else if(startDate.getHours() === 12) text += 'Noon';
        else text += `${startDate.getHours() % 12} ${(startDate.getHours() < 12) ? 'AM' : 'PM'}`;
    }
  

    //End Date Range
    if(endDate !== undefined && !isPassed) {
      const endText:string = formatRelativeDate(endDate, undefined, options);
      const matchingPrefix:string = Array.from(endText).reduce((result, char, index) => (new RegExp(`^${result+char}`).test(text) ? (result + char) : result), '');
      text += ' - ' + endText.substring(matchingPrefix.length);
    }
    else if(isPassed) text += ' - Past';
  
    return text;
  }

  export default formatRelativeDate;



  export const calculateAge = (date:Date|string):number => {
    if(date === undefined || date === '') date = new Date();
    else if(typeof date === 'string') date = new Date(date);

    return new Date().getFullYear() - date.getFullYear();
  };
  