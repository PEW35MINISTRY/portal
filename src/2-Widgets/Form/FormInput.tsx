import axios from 'axios';
import { Range, getTrackBackground } from 'react-range';
import { IThumbProps, ITrackProps } from 'react-range/lib/types';
import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from 'react';
import InputField, { ENVIRONMENT_TYPE, InputRangeField, InputSelectionField, InputType, makeDisplayList } from '../../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum, getDOBMaxDate, getDOBMinDate, getDateYearsAgo, getShortDate } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify } from '../../1-Utilities/hooks';
import { ToastStyle } from '../../100-App/app-types';
import { getInputHighestRole, testAccountAvailable } from './form-utilities';

import './form.scss';

const FormInput = ({...props}:{key:any, getIDField:() => {modelIDField:string, modelID:number}, validateUniqueFields?:boolean, FIELDS:InputField[], getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void, onSubmitText:string, onSubmitCallback:()=>void|Promise<void>, onAlternativeText?:string, onAlternativeCallback?:()=>void|Promise<void>, headerChildren?:ReactElement[], footerChildren?:ReactElement[]}) => {
    const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);

    const FIELD_LIST = useMemo(():InputField[] => props.FIELDS?.filter((field:InputField) => field.environmentList.includes(ENVIRONMENT_TYPE[(process.env.REACT_APP_ENVIRONMENT ?? '') as ENVIRONMENT_TYPE])) ?? [], [props.FIELDS]);

    /***************************
     *   UNIQUE FIELD HANDLING
     * *************************/
    //Note: Not filtered by field; purpose is to limit server requests
    const [uniqueFieldAvailableCache, setUniqueFieldAvailableCache] = useState<Map<string, boolean>>(new Map());

    useEffect(() => {
        FIELD_LIST.forEach(f => {
            const currentValue = props.getInputField(f.field);
            //Assume current values are unique and cache immediately
            if(f.unique && currentValue !== undefined) 
                setUniqueFieldAvailableCache(map => new Map(map.set(currentValue, true)));

            // Assign Default Values | Selection Types must show a value
            if(currentValue === undefined) {
                if(f.value !== undefined)
                    props.setInputField(f.field, f.value);

                else if(f.required && f instanceof InputSelectionField)
                    props.setInputField(f.field, f.selectOptionList[0]);

                else if(f.required && f instanceof InputRangeField) {
                    props.setInputField(f.field, f.minValue);

                    if(f.maxField !== undefined)
                        props.setInputField(f.maxField, f.maxValue);
                    
                }
            }
        });
    }, [FIELD_LIST]);

    //Called onBlur of <input>
    const onUniqueField = async(event:React.ChangeEvent<HTMLInputElement>):Promise<void> => {
        const currentValue = event.target.value;
        if(props.validateUniqueFields !== true || currentValue === undefined || uniqueFieldAvailableCache.has(currentValue)) 
            return;
        /* Call Server if valid */
        const field:InputField|undefined = FIELD_LIST.find(f => f['field'] === event.target.name);
        if(field !== undefined && field.unique && new RegExp(field.validationRegex).test(currentValue)) {
            const modelID:{modelIDField:string, modelID:number} = props.getIDField();
            const available:boolean|undefined = await testAccountAvailable(new Map([[field.field, currentValue], [modelID.modelIDField, modelID.modelID.toString()]])); //Bad request is 400=>undefined; inconclusive result
            if(available !== undefined)
                setUniqueFieldAvailableCache(map => new Map(map.set(currentValue, available)));
            if(available === false)
                notify(`Account already exists with: ${currentValue}.`);
        }
    }

    /***************************
     *    VALIDATION HANDLING 
     * *************************/
    const validateInput = (field:InputField, value?:any, validateRequired?:boolean):boolean => {
        const currentValue:string|number|undefined = value || props.getInputField(field.field);

        /* Required Fields */
        if(currentValue === undefined && field.required && (submitAttempted || validateRequired)) {
            return false;

         /* Password Matching */ 
        } else if(field.field === 'passwordVerify' && currentValue !== props.getInputField('password')) {
            return false;

        /* Custom Fields */
        } else if(currentValue === 'CUSTOM' && field.customField !== undefined && !(new RegExp(field.validationRegex).test(props.getInputField(field.customField)))) {
            return false;

        /* Non-required fields with no input are excluded from post body */
        } else if(currentValue === undefined){
            return true;

        /* CUSTOM_STRING_LIST */
        } else if(field.type === InputType.CUSTOM_STRING_LIST) {
            return !Array.isArray(currentValue) || currentValue.some((v:string) => !(new RegExp(field.validationRegex).test(v)));

        /* Validate general validationRegex from config */
        } else if(!(new RegExp(field.validationRegex).test(String(currentValue)))){
            return false;

        /* SELECT_LIST */
        } else if((field instanceof InputSelectionField) && (field.type === InputType.SELECT_LIST) && !field.selectOptionList.includes(`${currentValue}`)) {
            return false;

        /* DATES | dateOfBirth */
        } else if(field.type === InputType.DATE && field.field === 'dateOfBirth') {
            const currentDate:Date = new Date(currentValue);

            if(isNaN(currentDate.valueOf()))
                return false;

            const currentRole:RoleEnum = getInputHighestRole(props.getInputField);

            if(currentDate > getDOBMaxDate(currentRole)) {
                notify(`Must be older than ${getAgeFromDate(getDOBMaxDate(currentRole))} for a ${getSelectDisplayValue('userRoleTokenList', currentRole)} account`);
                return false;

            } else if(currentDate < getDOBMinDate(currentRole)) {
                notify(`Must be younger than ${getAgeFromDate(getDOBMinDate(currentRole))} for a ${getSelectDisplayValue('userRoleTokenList', currentRole)} account.`);
                return false
            }

        /* RANGE_SLIDER */
        } else if((field instanceof InputRangeField) && (field.type === InputType.RANGE_SLIDER) && (isNaN(Number(currentValue)) || Number(currentValue) < Number(field.minValue) || Number(currentValue) > Number(field.maxValue))) {
            return false;

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

        const modelID:{modelIDField:string, modelID:number} = props.getIDField();
        const uniqueFields:Map<string, string> = new Map([[modelID.modelIDField, modelID.modelID.toString()]]);
        FIELD_LIST.forEach(f => {
            //Add all fields to list (force validations)
            if(props.getInputField(f.field) === undefined && f.required) {
                if((f instanceof InputSelectionField) && (f.type === InputType.SELECT_LIST))
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
        if(props.validateUniqueFields === true && uniqueFields.size > 1 && await testAccountAvailable(uniqueFields) === false)
            notify(`Account already exists with: ${Array.from(uniqueFields.values()).map(v=>v).join(', ')}.`);

        //Re-validate input prior to Submit    
        else if(FIELD_LIST.every(f => validateInput(f, undefined, true) || (console.error('Invalid Input:', f.field, props.getInputField(f.field)), false)))
            props.onSubmitCallback();

        else  
            notify(`Please fix all validations before ${props.onSubmitText}.`, ToastStyle.ERROR);
    }

    const onInput = (event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => {
        if(event)
            event.preventDefault();

        //Only add touched fields to list (makes validations more natural)
        const fieldName = event.target.name;
        const field = FIELD_LIST.find(f => f['field'] === fieldName);
        let currentValue:any = event.target.value;

        //Exception date is ISO format and HTML input is 'YYYY-MM-DD'
        if(field?.type === InputType.DATE)
            currentValue = new Date(currentValue).toISOString();

        else if(field?.type === InputType.MULTI_SELECTION_LIST) {
            const currentList:(string|number)[] = Array.from(props.getInputField(fieldName) || []);
            if(currentList.includes(currentValue)) currentValue = currentList.filter(item => item !== currentValue); //Remove
            else currentValue = [...currentList, currentValue]; //Add
        }

        if(fieldName && field) {
            props.setInputField(fieldName, currentValue);
        
        } else {
            console.error('Invalid Field Name: ', fieldName, FIELD_LIST);
        }
    }
    
    /***********************
     *    UTILITY METHODS 
     * *********************/
    const getAgeFromDate = (date: Date):number => Math.floor((new Date().getTime() - date.getTime()+(25*60*60*1000)) / 31557600000);  //Reverse offset one day for delay
    const getDateInputDefaultValue = (field:InputField):Date => (field.field === 'dateOfBirth') 
                                        ? ((props.getInputField('userRole') as RoleEnum === RoleEnum.USER) 
                                            ? getDateYearsAgo(15) : getDateYearsAgo(30))
                                        : new Date();

    //Finds matching displayOptionList value from selectOptionList input
    const getSelectDisplayValue = (fieldField:string, value:string):string => {
        const field:InputSelectionField|undefined = FIELD_LIST.find(f => (f.field === fieldField) && (f instanceof InputSelectionField)) as InputSelectionField;
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
        <form key={props.key} id={props.onSubmitText} >
            {props.headerChildren ?? <></>}

            {FIELD_LIST.filter(field => !field.hide).map((f, index) => 
                    <div id={f.field} key={f.field} className='inputWrapper'>
                        <label htmlFor={f.field}>{f.title}</label>

                        {(f.field === 'userRoleTokenList' && (f instanceof InputSelectionField)) 
                            ? <FormEditRole
                                    field={f}
                                    getInputField={props.getInputField}
                                    setInputField={props.setInputField}
                                />    
                                
                        : (f.field === 'dateOfBirth' && (f instanceof InputRangeField)) 
                            ? <input name={f.field} type={'date'} onChange={onInput}  
                                value={getShortDate(props.getInputField(f.field) as string || getDateInputDefaultValue(f).toISOString())} 
                                min={f.minValue ? getDOBMinDate(props.getInputField('userRole') as RoleEnum).getTime() : undefined} 
                                max={f.maxValue ? getDOBMaxDate(props.getInputField('userRole') as RoleEnum).getTime() : undefined}
                              />

                        : (f.type === InputType.TEXT 
                            || f.type === InputType.NUMBER 
                            || f.type === InputType.EMAIL 
                            || f.type === InputType.PASSWORD)
                                ? <input name={f.field} type={f.type} onChange={onInput} value={props.getInputField(f.field)?.toString() || ''} onBlur={onUniqueField}/>

                            : (f.type === InputType.DATE) 
                                ? <input name={f.field} type={'date'} onChange={onInput}  
                                    value={getShortDate(props.getInputField(f.field) as string || getDateInputDefaultValue(f).toISOString())} 
                                />

                            : (f.type === InputType.PARAGRAPH) 
                                ? <textarea name={f.field} onChange={onInput}  value={props.getInputField(f.field)?.toString() || ''}/>

                            : (f.type === InputType.SELECT_LIST && (f instanceof InputSelectionField)) 
                                ? <select name={f.field} onChange={onInput} value={`${props.getInputField(f.field)}` || 'defaultValue'}>
                                    <option value={'defaultValue'} disabled hidden>Select:</option>
                                    {f.selectOptionList?.map((item, i)=>
                                        <option key={`${f.field}-${item}`} value={`${item}`}>{f.displayOptionList[i]}</option>
                                    )}
                                </select>

                            : (f.type === InputType.RANGE_SLIDER && (f instanceof InputRangeField)) 
                                ? <FormEditRangeSlider
                                        field={f}
                                        getInputField={props.getInputField}
                                        setInputField={props.setInputField}
                                    />
                                
                            : (f.type === InputType.MULTI_SELECTION_LIST && (f instanceof InputSelectionField)) 
                                ? <select name={f.field} onChange={onInput} value={(props.getInputField(f.field) == undefined) ? 'defaultValue' : 'combinedValue'}>
                                    <option value={'defaultValue'} disabled hidden>Select:</option>
                                    <option value={'combinedValue'} disabled hidden>{makeDisplayList(Array.from(props.getInputField(f.field) || [])).join(' | ')}</option>
                                    {f.selectOptionList?.map((item, i)=>
                                        <option key={`${f.field}-${item}`} value={`${item}`}>{f.displayOptionList[i]}</option>
                                    )}
                                </select>

                            : (f.type === InputType.CUSTOM_STRING_LIST) 
                                ? <FormEditCustomStringList 
                                    field={f}
                                    getInputField={props.getInputField}
                                    setInputField={props.setInputField}
                                    getDisplayValue={(item:string = '')=>item.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                    getCleanValue={(item:string = '')=>item.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/ /g, '_').toUpperCase()}
                                />

                            : <p className='validation' ></p>
                        }

                        {f.customField && (props.getInputField(f.field) === 'CUSTOM') &&
                             <input className='custom-field' name={f.field} type={f.type} onChange={(e)=>props.setInputField(f.customField || 'customField', e.target.value)} value={props.getInputField(f.customField)?.toString() || ''} placeholder={'Custom '+f.title}/>}

                        {!validateInput(f) && <p className='validation' >{f.validationMessage}</p>}
                        
                    </div>
                )
            }

            {props.footerChildren ?? <></>}
            
            <button className='submit-button' type='submit' onClick={onSubmit}>{props.onSubmitText}</button>
            { props.onAlternativeText && <button className='alternative-button'  type='button' onClick={props.onAlternativeCallback}>{props.onAlternativeText}</button> }

        </form>
    );
}

export default FormInput;

const FormEditRole = (props:{ field:InputSelectionField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void }) => {
    const [roleSelected, setRoleSelected] = useState<string>('defaultValue');
    const [tokenInput, setTokenInput] = useState<string>('');
    const [showValidation, setShowValidation] = useState<boolean>(false);

    const onAdd = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if(event)
            event.preventDefault();
        //Token required for all user roles; except USER Role
        if((roleSelected !== 'defaultValue' && tokenInput.length > 0) || roleSelected === 'USER') {
            props.setInputField('userRoleTokenList', new Map(props.getInputField(props.field.field)).set(roleSelected, tokenInput));
            setRoleSelected('defaultValue');
            setTokenInput('');
            setShowValidation(false);
        } else
            setShowValidation(true);
    }

    const onRemove = (item:string) => {
        props.setInputField('userRoleTokenList', 
            new Map(Array.from((props.getInputField(props.field.field) as Map<string, string>).entries())
            .filter(([role, token]) => (role !== item))));
    }

    const getDisplayOption = (item:string):string => {
        const index = props.field.selectOptionList.findIndex((option) => option === item);
        if(index >= 0) return props.field.displayOptionList[index];
        else return item;
    }

    return (
        <div id='edit-role-section'>
            { Array.from((props.getInputField(props.field.field) as Map<RoleEnum, string>)?.keys() || []).map((item, i)=>
                    <span key={item} id='role-listing'>
                        <h5>{getDisplayOption(item)}</h5>
                        <button  type='button' onClick={()=>onRemove(item)} >X</button>
                    </span>
            )}
            <select id='role-select' name={props.field.field} onChange={(e)=>setRoleSelected(e.target.value)} value={roleSelected}>
                <option value={'defaultValue'} disabled hidden>Select New Role:</option>
                { Array.from(props.field.selectOptionList)?.map((item, i)=>
                    <option key={`role-selection-${item}`} value={item}>{props.field.displayOptionList[i]}</option>
                )}
            </select>
            {(roleSelected !== 'defaultValue') &&
                <section className='custom-input-box'>
                    <input type='password' value={tokenInput} onChange={(e)=>setTokenInput(e.target.value)} placeholder='Authorization Token' style={{visibility: (roleSelected === 'USER') ? 'hidden' : 'visible'}}/>
                    <button type='button' onClick={onAdd} >ADD</button>
                </section>
            }
            {showValidation && <p className='validation' >{props.field.validationMessage}</p>}
        </div>
    );
}


const FormEditCustomStringList = (props:{ field:InputField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void, getCleanValue:(item:string) => string, getDisplayValue:(item:string) => string }) => {
    const [list, setList] = useState<string[]>([]); 
    const [newValue, setNewValue] = useState<string>('');
    const [showValidation, setShowValidation] = useState<boolean>(false);

    //Local list copy synced with props
    useEffect(()=>setList(Array.from(props.getInputField(props.field.field) || [])), [props]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();

        const value:string = props.getCleanValue(event.target.value || '');
        setNewValue(value);
        setShowValidation((value.length === 0) || (new RegExp(props.field.validationRegex).test(value)));
    }

    const onAdd = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();

        const value:string = props.getCleanValue(newValue);
        const currentList:string[] = Array.from(props.getInputField(props.field.field) || [])

        if(value.length > 0 && !currentList.includes(value)) {
            props.setInputField(props.field.field, [...currentList, value]);
            setShowValidation(false);

        } else
            setShowValidation(true);

        setNewValue('');
    }

    const onRemove = (item:string) => {
        const newList:string[] = [...(Array.from(props.getInputField(props.field.field) || []) as string[]).filter(i => (i !== item))];
        setList(newList);
        props.setInputField(props.field.field, [...newList]);
    }

    return (
        <div id='custom-string-list'>
            {(list.length > 0) &&
                <section className='list-left-align-box'>
                    {list.map((item, i)=>
                        <label className='list-value' key={`${props.field.field}-${item}`} onClick={()=>onRemove(item)}>{props.getDisplayValue(item)}</label>
                    )}
                </section>
            }
            <section className='custom-input-box'>
                <input type='text' value={props.getDisplayValue(newValue)} onChange={onChange} onKeyDown={(event)=>{ if(event.key === 'Enter') onAdd(event);}} placeholder={'New Term'} />
                <button type='button' onClick={onAdd} >ADD</button>
            </section>
            {showValidation && <p className='validation' >{props.field.validationMessage}</p>}
        </div>
    );
}


const FormEditRangeSlider = (props:{ field:InputRangeField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void }) => {
    //Declare local references | component gets rebuilt on state change: props.setInputField
    const minimum = (typeof props.field.minValue === 'number') ? props.field.minValue : 0;
    const maximum = (typeof props.field.maxValue === 'number') ? props.field.maxValue : (minimum + 1);
    const minValue = props.getInputField(props.field.field) || minimum;
    const maxValue = props.getInputField(props.field.maxField || '') || maximum;
    const dualSlider:boolean = props.field.maxField !== undefined;

    const onChange = (values:number[]) => {
        if(values.length >= 1) {
            props.setInputField(props.field.field, values[0]);
        }
        if(dualSlider && (values.length === 2)) {
            props.setInputField(props.field.maxField || '', values[1]);
        }
    }

    return (
        <Range
            step={1}
            min={minimum}
            max={maximum}
            values={dualSlider ? [minValue, maxValue] : [minValue]}
            onChange={onChange}
            renderTrack={({ props: trackProps, children }:{props:ITrackProps, children:ReactNode}) =>
                <div className='slider-track' {...trackProps} 
                    style={{
                        background: getTrackBackground({
                            values: dualSlider ? [minValue, maxValue] : [minValue],
                            colors: dualSlider ? ['white', '#62D0F5', 'white'] : ['#62D0F5', 'white'],
                            min: minimum,
                            max: maximum,
                            })
                    }}
                >{children}</div>
            }
            renderThumb={({ props: thumbProps }:{props:IThumbProps}) => 
                <div className='slider-thumb' {...thumbProps} >                                        
                    <label className='slider-thumb-label'>{ (thumbProps['aria-valuenow'] === minValue) ? minValue : maxValue || '-'}</label>
                </div>
            }
        />
    );
}
