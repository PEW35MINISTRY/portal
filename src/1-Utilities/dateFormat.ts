

/*******************
 * DATE FORMATTING
 *******************/
const DAY_OF_WEEK_SHORT:string[] = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
const DAY_OF_WEEK_LONG:string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_SHORT:string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG:string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const getFutureDate = (date:Date = new Date(), days:number = 0, hours:number = 0):Date => {
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() + hours);
    return date;
  }
  
export const formatNumberOrdinal = (n:number):string => 
    (n % 10 == 1 && n % 100 != 11) ? n + 'st'
    : (n % 10 == 2 && n % 100 != 12) ? n + 'nd'
    : (n % 10 == 3 && n % 100 != 13) ? n + 'rd'
    : n + 'th';
  
  
  //Relative Date Rules
const formatRelativeDate = (startDate?:Date|string, endDate?:Date, options?:{shortForm?:boolean, includeHours?:boolean, markPassed?:boolean}):string => {
    options = {shortForm:true, includeHours:true, markPassed:false, ...options}; //Apply defaults & inputted overrides
    const today = new Date();
    today.setHours(0);
    let text = '';
  
    //Handle Date type validations
    if(startDate === undefined || typeof startDate !== 'object' || (typeof startDate === 'string' && (startDate as string).length === 0) || (endDate !== undefined && typeof endDate !== 'object')) return '';
  
    if(typeof startDate === 'string') startDate = new Date(startDate);
    if(endDate !== undefined && typeof endDate === 'string') endDate = new Date(endDate);  
    if(startDate === endDate) endDate = undefined;

    const isPassed:boolean = (options.markPassed === true) && startDate < today;
  
    //Date is currently ongoing
    if(today > startDate && endDate != undefined && today < endDate) text += 'Now';
  
    //Day of the week 
    if(startDate > today  && startDate < getFutureDate(today, 1) && (!isPassed || !options.includeHours)) text += 'Today';

    else if(startDate > getFutureDate(today, -1)) text += options.shortForm ? 'Ytd' : 'Yesterday';

    else if(startDate < getFutureDate(today, 2)) text += options.shortForm ? 'Tom' : 'Tomorrow';

    else if(startDate < getFutureDate(today, 7)) text += options.shortForm ? DAY_OF_WEEK_SHORT[startDate.getDay()] : DAY_OF_WEEK_LONG[startDate.getDay()];

    else if(startDate.getMonth() === today.getMonth()) text += formatNumberOrdinal(startDate.getDate());

    else text += options.shortForm ? MONTH_SHORT[startDate.getMonth()] : MONTH_LONG[startDate.getMonth()] + formatNumberOrdinal(startDate.getDate());

    text += ' ';
  
    //Hours
    if(options.includeHours && !isPassed) {
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
  