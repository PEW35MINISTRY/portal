import axios from 'axios';
import { Range, getTrackBackground } from 'react-range';
import { IThumbProps, ITrackProps } from 'react-range/lib/types';
import React, { ReactElement, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import InputField, { ENVIRONMENT_TYPE, InputRangeField, InputSelectionField, InputType, makeDisplayList, makeDisplayText } from '../../0-Assets/field-sync/input-config-sync/inputField';
import { RoleEnum, getDOBMaxDate, getDOBMinDate, getDateYearsAgo, getShortDate } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import validateInput, { getValidationLength, InputValidationResult } from '../../0-Assets/field-sync/input-config-sync/inputValidation';
import { notify } from '../../1-Utilities/hooks';
import { PageState, ToastStyle } from '../../100-App/app-types';
import { testAccountAvailable } from './form-utilities';
import { getEnvironment } from '../../1-Utilities/utilities';

import './form.scss';

const FormInput = ({...props}:{key:any, pageViewState?:PageState, getIDField:() => {modelIDField:string, modelID:number}, validateUniqueFields?:boolean, FIELDS:InputField[], getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void, onSubmitText:string, onSubmitCallback:()=>void|Promise<void>,   alternativeButtonList?:{ text:string, onClick:()=>void|Promise<void>}[], headerChildren?:ReactElement[], footerChildren?:ReactElement[]}) => {
    const FIELD_LIST = useMemo(():InputField[] => props.FIELDS?.filter((field:InputField) => !field.hide && field.environmentList.includes(getEnvironment())) ?? [], [props.FIELDS]);
    const [validationMap, setValidationMap] = useState<Map<string, InputValidationResult>>(new Map());

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

                else if(f.required && f.type === InputType.SELECT_LIST && f instanceof InputSelectionField)
                    props.setInputField(f.field, f.selectOptionList[0]);

                else if(f.required && f instanceof InputRangeField) {
                    props.setInputField(f.field, f.minValue);

                    if(f.maxField !== undefined)
                        props.setInputField(f.maxField, f.maxValue);
                    
                }
            }
        });
    }, [FIELD_LIST, props.pageViewState]);

    //Called onBlur of <input>
    const onUniqueField = async(event:React.ChangeEvent<HTMLInputElement>):Promise<void> => {
        const currentValue = event.target.value;
        if(props.validateUniqueFields !== true || currentValue === undefined || uniqueFieldAvailableCache.has(currentValue)) 
            return;
        /* Call Server if valid */
        const field:InputField|undefined = FIELD_LIST.find(f => f['field'] === event.target.name);
        if(!field || !field.unique || !(new RegExp(field.validationRegex).test(currentValue))) 
            return;

        const modelID:{modelIDField:string, modelID:number} = props.getIDField();
        const uniqueFields = new Map([[field.field, currentValue], [modelID.modelIDField, modelID.modelID.toString()]]);

        if(Array.from(uniqueFields.values()).some(v => (v === undefined) || (v.length === 0)))
            return;

        const available:boolean|undefined = await testAccountAvailable(new Map([[field.field, currentValue], [modelID.modelIDField, modelID.modelID.toString()]])); //Bad request is 400=>undefined; inconclusive result
        if(available !== undefined)
            setUniqueFieldAvailableCache(map => new Map(map.set(currentValue, available)));
        if(available === false)
            notify(`Account already exists with: ${currentValue}.`);
    }


    /*********************
     *   EVENT HANDLING 
     * *******************/
    const onSubmit = async(event:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if(event)
            event.preventDefault();

        const modelID:{modelIDField:string, modelID:number} = props.getIDField();
        const uniqueFields:Map<string, string> = new Map([[modelID.modelIDField, modelID.modelID.toString()]]);
        FIELD_LIST.forEach(f => {
            //Add all fields to list (force validations)
            if(props.getInputField(f.field) === undefined && f.required) {
                if((f instanceof InputSelectionField) && (f.type === InputType.SELECT_LIST))
                    props.setInputField(f.field, f.selectOptionList[0]);

                else if(f.type === InputType.DATE)
                    props.setInputField(f.field, getDateYearsAgo(Number(f.value) || 0).toISOString());

                else
                    props.setInputField(f.field, f.value || '');
            }

            //Test all unique fields as combination
            if(props.validateUniqueFields === true && f.unique)
                uniqueFields.set(f.field, props.getInputField(f.field) || '');
        });

        //Re-validate input prior to Submit | (Also updates validation messages)
        const failedValidations:InputValidationResult[] = FIELD_LIST.filter(field => !field.hide).map(field => validate(field, false)).filter(result => !result.passed);

        //Re-test unique fields as combination
        if(failedValidations.length === 0 && props.validateUniqueFields && uniqueFields.size > 1) {
            for(const [field, value] of uniqueFields.entries()) {
                if(value === undefined || value.length === 0) {
                    const validation:InputValidationResult = {passed: false, message: 'Unique value is incomplete.', 
                                                              description: `Unique ${value} value is incomplete and prevent unique validation network call.`};
                    setValidationMap(previous => new Map(previous).set(field, validation));
                    failedValidations.push(validation);

                    [ENVIRONMENT_TYPE.LOCAL, ENVIRONMENT_TYPE.DEVELOPMENT].includes(getEnvironment()) && console.error(validation.description, field, value, uniqueFields);
                }
            }

            if(failedValidations.length === 0 && await testAccountAvailable(uniqueFields) === false) {
                //Update Validations, But don't add combination to uniqueFieldAvailableCache; because we're not sure which field is invalid
                 uniqueFields.forEach((value, field) => {
                    const validation:InputValidationResult = {passed: false, message: 'Unique value already exists, may depend on related fields.', 
                                                              description: `${value} value existing in database for ${field}, belong to ${modelID.modelIDField} = ${modelID.modelID}`};
                    setValidationMap(previous => new Map(previous).set(field, validation));
                    failedValidations.push(validation);
            });

                if([ENVIRONMENT_TYPE.LOCAL, ENVIRONMENT_TYPE.DEVELOPMENT].includes(getEnvironment())) console.error(`Account combination already exists:`, uniqueFields);

                notify(`Already Exists`, ToastStyle.ERROR);
                return;
            }
        }

        //Assembled above, NOT from validationMap state
        if(failedValidations.length > 0) 
            notify(`Fix ${failedValidations.length} Validations`, ToastStyle.ERROR);
        else
            props.onSubmitCallback();
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

            if(validationMap.has(fieldName))
                validate(field);
        
        } else if([ENVIRONMENT_TYPE.LOCAL, ENVIRONMENT_TYPE.DEVELOPMENT].includes(getEnvironment()))
            console.error('Invalid Field Name: ', fieldName, FIELD_LIST);
    }
    
    /* Manage Validations */
    const validate = (field:InputField, simpleValidationOnly:boolean = true):InputValidationResult => {
        const result:InputValidationResult = validateInput({field, value: props.getInputField(field.field), getInputField:props.getInputField, simpleValidationOnly: simpleValidationOnly});

        setValidationMap(previous => {
            const newMap = new Map(previous);
            if(!result.passed) {
                newMap.set(field.field, result);

                if([ENVIRONMENT_TYPE.LOCAL, ENVIRONMENT_TYPE.DEVELOPMENT].includes(getEnvironment()))
                    console.error('Invalid Input:', field.field, props.getInputField(field.field), result.description)

            } else
                newMap.delete(field.field);

            return newMap;
        });
        return result;
    }

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <form key={props.key} id={props.onSubmitText} >
            {props.headerChildren ?? <></>}

            {FIELD_LIST.map((f, index) => 
                    <div id={f.field} key={f.field} className='inputWrapper' onBlurCapture={(e) => { if(!e.currentTarget.contains(e.relatedTarget)) validate(f); }}>
                        <label htmlFor={f.field} style={[InputType.TOKEN].includes(f.type) ? { textAlign: 'left' } : undefined}>{f.required  && <span className='required'>* </span>}{f.title}</label>

                        {(f.field === 'userRoleTokenList' && (f instanceof InputSelectionField)) 
                            ? <FormEditRole
                                    field={f}
                                    getInputField={props.getInputField}
                                    setInputField={props.setInputField}
                                />    
                                
                        : (f.field === 'dateOfBirth' && (f instanceof InputRangeField)) 
                            ? <input name={f.field} type={'date'} onChange={onInput}  
                                value={getShortDate(props.getInputField(f.field) ?? getDOBMaxDate(props.getInputField('userRole') as RoleEnum).toISOString())} 
                                min={f.minValue ? getDOBMinDate(props.getInputField('userRole') as RoleEnum).getTime() : undefined} 
                                max={f.maxValue ? getDOBMaxDate(props.getInputField('userRole') as RoleEnum).getTime() : undefined}
                              />

                        : (f.type === InputType.TEXT 
                            || f.type === InputType.NUMBER 
                            || f.type === InputType.EMAIL 
                            || f.type === InputType.PASSWORD)
                                ? <input name={f.field} type={f.type} onChange={onInput} value={props.getInputField(f.field)?.toString() || ''} onBlur={onUniqueField} maxLength={f.length?.max}/>

                            : (f.type === InputType.DATE) 
                                ? <input name={f.field} type={'date'} onChange={onInput}  
                                    value={getShortDate(props.getInputField(f.field) ?? new Date().toISOString())} 
                                />

                            : (f.type === InputType.PARAGRAPH) 
                                ? <textarea name={f.field} onChange={onInput}  value={props.getInputField(f.field)?.toString() || ''} maxLength={f.length?.max}/>

                            : (f.type === InputType.SELECT_LIST && (f instanceof InputSelectionField)) 
                                ? <select name={f.field} onChange={onInput} value={props.getInputField(f.field) ?? 'defaultValue'}>
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

                            : (f.type === InputType.TOKEN)
                                ? <FormTokenInput 
                                    field={f}
                                    getInputField={props.getInputField}
                                    setInputField={props.setInputField}
                                    setValidationText={(validation:InputValidationResult) => setValidationMap(previous => new Map(previous.set(f.field, validation)))}
                                    charType='NUMERIC'
                                />

                            : (f.type === InputType.READ_ONLY) 
                                ? <p className='detail custom-field' >{makeDisplayText(props.getInputField(f.field) ?? '')}</p>

                            : <p className='validation' ></p>
                        }

                        {f.customField && (props.getInputField(f.field) === 'CUSTOM') &&
                             <input className='custom-field' name={f.field} type={f.type} onChange={(e)=>props.setInputField(f.customField || 'customField', e.target.value)} value={props.getInputField(f.customField)?.toString() || ''} placeholder={'Custom '+f.title} maxLength={f.length?.max}/>}

                        {(f.type !== InputType.READ_ONLY) &&
                            <p className='validation'>
                                { validationMap.get(f.field)?.message ?? '\u00A0' /* non‑breaking space to hold the line */ }
                                { (f.length && props.getInputField(f.field)) &&
                                    (() => {
                                        const length = getValidationLength(props.getInputField(f.field));
                                        const { min, max } = f.length;
                                        return ((length < min) || (length > (max - (max * 0.2)))) &&
                                            <span className='length-counter'>
                                                {(length < min) ? `${min}/${length}` : `${length}/${max}`}
                                            </span>;
                                    })()
                                }
                            </p>}                      
                    </div>
                )
            }

            {props.footerChildren ?? <></>}
            
            <button className='submit-button' type='submit' onClick={onSubmit}>{props.onSubmitText}</button>
            {props.alternativeButtonList?.length &&
                <div className='alternative-button-list'>
                    {props.alternativeButtonList.map((button, index) => (
                        <button key={`alternative-button-${index}`} className='alternative-button' type='button' onClick={button.onClick}>{button.text}</button>
                    ))}
                </div>}
        </form>
    );
}

export default FormInput;

const FormEditRole = (props:{ field:InputSelectionField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void }) => {
    const [roleSelected, setRoleSelected] = useState<string>('defaultValue');
    const [tokenInput, setTokenInput] = useState<string>('');

    const onAdd = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if(event)
            event.preventDefault();
        //Token required for all user roles; except USER Role
        if((roleSelected !== 'defaultValue' && tokenInput.length > 0) || roleSelected === 'USER') {
            props.setInputField('userRoleTokenList', new Map(props.getInputField(props.field.field)).set(roleSelected, tokenInput));
            setRoleSelected('defaultValue');
            setTokenInput('');
        }
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
                    <input type='password' value={tokenInput} onChange={(e)=>setTokenInput(e.target.value)} placeholder='Authorization Token' style={{visibility: (roleSelected === 'USER') ? 'hidden' : 'visible'}} autoComplete="authorization-token"/>
                    <button type='button' onClick={onAdd} >ADD</button>
                </section>
            }

        </div>
    );
}


const FormEditCustomStringList = (props:{ field:InputField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void, getCleanValue:(item:string) => string, getDisplayValue:(item:string) => string }) => {
    const [list, setList] = useState<string[]>([]); 
    const [newValue, setNewValue] = useState<string>('');
    const [validation, setValidation] = useState<InputValidationResult>({passed: true, message: '', description: ''});

    //Local list copy synced with props
    useEffect(()=>setList(Array.from(props.getInputField(props.field.field) || [])), [props]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();

        const value:string = props.getCleanValue(event.target.value || '');
        setNewValue(value);
    }

    const onAdd = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();

        const value:string = props.getCleanValue(newValue);
        const currentList:string[] = Array.from(props.getInputField(props.field.field) || [])

        if(value.length > 0 && !currentList.includes(value)) {
            props.setInputField(props.field.field, [...currentList, value]);
            setValidation(validateInput({field:props.field, value: props.getInputField(props.field.field), getInputField:props.getInputField, simpleValidationOnly:true}));
        }

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
        
            <p className='validation'>{ validation.passed ? '\u00A0' : validation.message }</p>        
      </div>
    );
}


const FormEditRangeSlider = (props:{ field:InputRangeField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void }) => {
    //Declare local references | component gets rebuilt on state change: props.setInputField
    const minimum = (typeof props.field.minValue === 'number') ? props.field.minValue : 0;
    const maximum = (typeof props.field.maxValue === 'number') ? props.field.maxValue : (minimum + 1);
    const minValue = Math.min(Math.max(props.getInputField(props.field.field) || minimum, minimum), maximum);
    const maxValue = Math.min(Math.max(props.getInputField(props.field.maxField || '') || maximum, minimum), maximum);
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


//Makes a second row in FormInput for character boxes to span both columns
export const FormTokenInput = (props: {field:InputField, getInputField:(field:string) => any|undefined, setInputField:(field:string, value:any) => void, setValidationText:(validation:InputValidationResult) => void, charType:'NUMERIC'|'LETTERS'|'ALPHANUMERIC'|'TEXT', }) => {
    const refList = useRef<Array<HTMLInputElement | null>>([]);
    const MAX_LENGTH:number = props.field.length?.max ?? 0;
   
    const filter = (text:string) => {
        const value: string = String(text ?? '');

        switch(props.charType) {
            case 'NUMERIC':
                return value.replace(/\D/g, '');

            case 'LETTERS':
                return value.replace(/[^A-Za-z]/g, '').toUpperCase();

            case 'ALPHANUMERIC':
                return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

            case 'TEXT':
            default:
                return value;
        }
    }

    const token:string = filter(String(props.getInputField(props.field.field) ?? '')).slice(0, MAX_LENGTH);



    /* INPUT HANDLERS */
    const onChange = (index:number) => (event:React.ChangeEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();
        applyInput(String(event.target.value ?? ''), index);
    }

    const onPaste = (event:React.ClipboardEvent<HTMLInputElement>) => {
        if(event) event.preventDefault();
        props.setInputField(props.field.field, ''); //Clear existing input
        applyInput(String(event.clipboardData.getData('text') ?? ''), 0);
    }

    const applyInput = (raw:string, startIndex:number) => {
        const filtered:string = filter(raw);

        if(!filtered.length) {
            updateChar(startIndex, '');
            return;
        }

        if(raw.length && filtered.length !== raw.length)
            props.setValidationText({ passed:false, message:`${makeDisplayText(props.charType)} only`, description:`Some characters were removed because token allows ${props.charType} only.` });

        const spread:string = filtered.slice(0, MAX_LENGTH - startIndex);
        const list:any[] = Array.from({ length:MAX_LENGTH }, (_,i) => token[i] ?? '');

        for(let k=0;k<spread.length;k++)
            list[startIndex + k] = spread[k];

        props.setInputField(props.field.field, filter(String(list.join(''))).slice(0, MAX_LENGTH));
        focusIndex(Math.min(startIndex + spread.length, MAX_LENGTH - 1));
    }

    const updateChar = (index:number, char:string) => {
        const list:any[] = Array.from({ length:MAX_LENGTH }, (_,i) => token[i] ?? '');
        list[index] = char;
        props.setInputField(props.field.field, filter(String(list.join(''))).slice(0, MAX_LENGTH));
    }



    /* NAVIGATION */
    const onKeyDownAtIndex = (index:number) => (event:React.KeyboardEvent<HTMLInputElement>) => {
        if(event.key === 'Backspace') {
            if(token[index]) {
                updateChar(index, '');
                return;
            }

            if(index > 0) {
                event.preventDefault();
                updateChar(index - 1, '');
                focusIndex(index - 1);
            }

        } else if(event.key === 'ArrowLeft') {
            event.preventDefault();
            if(index > 0) focusIndex(index - 1);
            
        } else if(event.key === 'ArrowRight') {
            event.preventDefault();
            if(index < MAX_LENGTH - 1) focusIndex(index + 1);
        }
    }

    const focusIndex = (index:number) => {
        const clamped:number = Math.max(0, Math.min(MAX_LENGTH - 1, index));
        refList.current[clamped]?.focus();
        refList.current[clamped]?.select?.();
    }

    return(
        <div className='token-input-wrapper'>
            <div className='token-box-row' role='group' aria-label='Token input'>
                {Array.from({ length:MAX_LENGTH }, (_, index) => (
                    <input
                        key={`token-input-${index}`}
                        ref={(el) => { refList.current[index] = el; }}
                        className='token-box-input'
                        name={`${props.field.field}-${index}`}
                        value={token[index] ?? ''}
                        onChange={onChange(index)}
                        onKeyDown={onKeyDownAtIndex(index)}
                        onPaste={onPaste}
                        inputMode={props.charType === 'NUMERIC' ? 'numeric' : 'text'}
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={MAX_LENGTH}
                    />
                ))}
            </div>
        </div>
    );
}
