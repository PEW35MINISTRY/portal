import axios from 'axios';
import React, {useState, useEffect, forwardRef, useRef, FormEventHandler, ReactElement} from 'react';
import { notify } from '../hooks';
import './form.scss'; 
import { InputField, InputType, RoleEnum, getDOBMaxDate, getDOBMinDate, getDateYearsAgo, getShortDate } from './Fields-Sync/profile-field-config';
import { ToastStyle } from '../app-types';
import { testAccountAvailable } from './profile-utilities';

const FormProfile = ({...props}:{validateUniqueFields?:boolean, PROFILE_FIELDS:InputField[], getInputField:(field:string) => string|undefined, setInputField:(field:string, value:string) => void, onSubmitText:string, onSubmitCallback:()=>void|Promise<void>, headerChildren?:ReactElement, footerChildren?:ReactElement}) => {
    const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

    /***************************
     *   UNIQUE FIELD HANDLING
     * *************************/
    //Note: Not filtered by field; purpose is to limit server requests
    const [uniqueFieldAvailableCache, setUniqueFieldAvailableCache] = useState<Map<string, boolean>>(new Map());

    useEffect(() => {
        //Assume current values are unique and cache immediately
        props.PROFILE_FIELDS.forEach(f => {
            const currentValue = props.getInputField(f.field);
            if(f.unique && currentValue !== undefined) 
                setUniqueFieldAvailableCache(map => new Map(map.set(currentValue, true)))
        });
    }, []);

    //Called onBlur of <input>
    const onUniqueField = async(event:React.ChangeEvent<HTMLInputElement>):Promise<void> => {
        const currentValue = event.target.value;
        if(props.validateUniqueFields !== true || currentValue === undefined || uniqueFieldAvailableCache.has(currentValue)) 
            return;
        /* Call Server if valid */
        const field:InputField|undefined = props.PROFILE_FIELDS.find(f => f["field"] === event.target.name);
        if(field !== undefined && field.unique && new RegExp(field.validationRegex).test(currentValue)) {
            const available:boolean|undefined = await testAccountAvailable(new Map([[field.field, currentValue]])); //Bad request is 400=>undefined; inconclusive result
            if(available !== undefined)
                setUniqueFieldAvailableCache(map => new Map(map.set(currentValue, available)));
            if(available === false)
                notify(`Account already exists with: ${currentValue}.`);
        }
    }

    /***************************
     *    VALIDATION HANDLING 
     * *************************/
    const validateInput = (field:InputField, value?:string, validateRequired?:boolean):boolean => {
        const currentValue:string|undefined = value || props.getInputField(field.field);

        /* Required Fields */
        if(currentValue === undefined && field.required && (submitAttempted || validateRequired)) {
            return false;

         /* Password Matching */ 
        } else if(field.field === 'passwordVerify' && currentValue !== props.getInputField('password')) {
            return false;

        /* Non-required fields with no input are excluded from post body */
        } else if(currentValue === undefined){
            return true;

        /* Validate general validationRegex from config */
        } else if(!(new RegExp(field.validationRegex).test(currentValue))){
            return false;

        /* SELECT_LIST */
        } else if(field.type === InputType.SELECT_LIST && !field.selectOptionList.includes(currentValue)) {
            console.error(`Resetting invalid list Input: >${currentValue}< for ${field.field}`, field.selectOptionList);
            props.setInputField(field.field, field.selectOptionList[0]);
            return false;

        /* DATES | dateOfBirth */
        } else if(field.type === InputType.DATE && field.field === 'dateOfBirth') {
            const currentRole:RoleEnum = props.getInputField('userRole') as RoleEnum;
            const currentDate:Date = new Date(currentValue);

            if(currentDate < getDOBMinDate(currentRole)) {
                notify(`Must be younger than ${getAgeFromDate(getDOBMinDate(currentRole))} for a ${getSelectDisplayValue('userRole', currentRole)} account`);
                return false;

            } else if(currentDate > getDOBMaxDate(currentRole)) {
                notify(`Must be older than ${getAgeFromDate(getDOBMaxDate(currentRole))} for a ${getSelectDisplayValue('userRole', currentRole)} account.`);
                return false
            }

        /* UNIQUE FIELDS */ 
        } else if(props.validateUniqueFields === true && field.unique && (uniqueFieldAvailableCache.get(field.field) === false)) {
            return false;
        }

        return true;
    }
  
    /*********************
     *   EVENT HANDLING 
     * *******************/
    const onSubmit = async(event:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if(event)
            event.preventDefault();

        setSubmitAttempted(true); //enforces undefined and required validations

        const uniqueFields = new Map([['userId', props.getInputField("userId") || '-1']]);
        props.PROFILE_FIELDS.forEach(f => {
            //Add all fields to list (force validations)
            if(props.getInputField(f.field) === undefined && f.required) {
                if(f.type === InputType.SELECT_LIST)
                    props.setInputField(f.field, f.selectOptionList[0]);

                else if(f.type === InputType.DATE)
                    props.setInputField(f.field, getDateInputDefaultValue(f).toISOString());

                else
                    props.setInputField(f.field, f.value || '');
            }

            //Test all unique fields as combination
            if(props.validateUniqueFields === true && f.unique)
                uniqueFields.set(f.field, props.getInputField(f.field) || '');
        });

        //Re-test unique fields as combination
        if(props.validateUniqueFields === true && await testAccountAvailable(uniqueFields) === false)
            notify(`Account already exists with: ${Array.from(uniqueFields.values()).map(v=>v).join(', ')}.`);

        //Re-validate input prior to Submit    
        else if(props.PROFILE_FIELDS.every(f => validateInput(f, undefined, true)))
            props.onSubmitCallback();

        else  
            notify(`Please fix all validations before ${props.onSubmitText}.`, ToastStyle.ERROR);
    }

    const onInput = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
        if(event)
            event.preventDefault();

        //Only add touched fields to list (makes validations more natural)
        const fieldName = event.target.name;
        const field = props.PROFILE_FIELDS.find(f => f["field"] === fieldName);
        let currentValue = event.target.value;

        //Exception date is ISO format and HTML input is 'YYYY-MM-DD'
        if(field?.type === InputType.DATE)
            currentValue = new Date(currentValue).toISOString();

        if(fieldName && field) {
            props.setInputField(fieldName, currentValue);
        
        } else {
            console.error("Invalid Field Name: ", fieldName, props.PROFILE_FIELDS);
        }
    }
    
    /***********************
     *    UTILITY METHODS 
     * *********************/
    const getAgeFromDate = (date: Date):number => Math.floor((new Date().getTime() - date.getTime()+(25*60*60*1000)) / 31557600000);  //Reverse offset one day for delay
    const getDateInputMinValue = (field:InputField):Date => (field.field === 'dateOfBirth') ? getDOBMinDate(props.getInputField('userRole') as RoleEnum) : new Date(); //Default within next year
    const getDateInputMaxValue = (field:InputField):Date => (field.field === 'dateOfBirth') ? getDOBMinDate(props.getInputField('userRole') as RoleEnum) : new Date(new Date().getTime() + (365*24*60*60*1000));
    const getDateInputDefaultValue = (field:InputField):Date => (field.field === 'dateOfBirth') 
                                        ? ((props.getInputField('userRole') as RoleEnum === RoleEnum.STUDENT) 
                                            ? getDateYearsAgo(15) : getDateYearsAgo(30))
                                        : new Date();

    //Finds matching displayOptionList value from selectOptionList input
    const getSelectDisplayValue = (fieldField:string, value:string):string => {
        const field:InputField|undefined = props.PROFILE_FIELDS.find(f => f.field === fieldField);
        const index:number = (field?.selectOptionList || []).indexOf(value);
        if(field !== undefined && index >= 0 && field.selectOptionList.length === field.displayOptionList.length) 
            return field.displayOptionList[index];
        else {
            console.error(`Failed to identify display list value: ${value} from ${fieldField} lists.`, field, index)
            return value;
        }
    }

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <form id={props.onSubmitText} >
            {props.headerChildren}

            {
                props.PROFILE_FIELDS.map((f) => 
                    <div id={f.field} key={f.field} className='inputWrapper'>
                        <label htmlFor={f.field}>{f.title}</label>

                        {(f.type === InputType.TEXT 
                            || f.type === InputType.NUMBER 
                            || f.type === InputType.EMAIL 
                            || f.type === InputType.PASSWORD)
                                ? <input name={f.field} type={f.type} onChange={onInput} value={props.getInputField(f.field)?.toString() || ''} onBlur={onUniqueField}/>

                            : (f.type === InputType.DATE) 
                                ? <input name={f.field} type={'date'} onChange={onInput}  
                                    value={getShortDate(props.getInputField(f.field) as string || getDateInputDefaultValue(f).toISOString())} 
                                    // min={getDateInputMinValue(f).getTime()} 
                                    // max={getDateInputMaxValue(f).getTime()}
                                />

                            : (f.type === InputType.PARAGRAPH) 
                                ? <textarea name={f.field} onChange={onInput}  value={props.getInputField(f.field)?.toString() || ''}/>

                            : (f.type === InputType.SELECT_LIST) 
                                ? <select name={f.field} onChange={onInput} value={props.getInputField(f.field) || 'defaultValue'}>
                                    <option value={'defaultValue'} disabled hidden>Select:</option>
                                    {f.selectOptionList?.map((item, i)=>
                                        <option key={`${f.field}-${item}`} value={item}>{f.displayOptionList[i]}</option>
                                    )}
                                </select>

                            : <p className='validation' ></p>
                        }

                        {!validateInput(f) && <p className='validation' >{f.validationMessage}</p>}
                        
                    </div>
                )
            }
            
            <button type='submit' onClick={onSubmit}>{props.onSubmitText}</button>

            {props.footerChildren}
        </form>
    );
}

export default FormProfile;
