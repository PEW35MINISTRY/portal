import React from 'react';
import axios from 'axios';
import { EDIT_PROFILE_FIELDS_ADMIN, walkLevelMultiplier, walkLevelOptions } from '../0-Assets/field-sync/input-config-sync/profile-field-config';
import { notify, processAJAXError, useAppSelector } from '../1-Utilities/hooks';
import { ToastStyle } from '../100-App/app-types';
import { InputRangeField } from '../0-Assets/field-sync/input-config-sync/inputField';

import './walkLevelQuiz.scss';

/************************************
 * WALK LEVEL POP-UP PAGE COMPONENT *
 ************************************/
export default ({...props}:{key:string, onSelect:() => void, onCancel?:() => void}) => {
    const jwt:string = useAppSelector((state) => state.account.jwt);
    const userID:number = useAppSelector((state) => state.account.userID);

    const onSaveWalkLevel = async (value:number) => {
        const walkLevelConfig:InputRangeField = EDIT_PROFILE_FIELDS_ADMIN.find(field => field.field === 'walkLevel') as InputRangeField;
        const walkLevel = value * walkLevelMultiplier;

        if(walkLevelConfig === undefined || isNaN(walkLevel) || !walkLevelConfig.validationRegex.test(String(walkLevel))
            || walkLevel < (walkLevelConfig.minValue as number)
            || walkLevel > (walkLevelConfig.maxValue as number))
                notify('Walk Level Invalid', ToastStyle.ERROR);

        else await axios.patch(`${process.env.REACT_APP_DOMAIN}/api/user/${userID}/walk-level`, { walkLevel }, { headers: { jwt:jwt }})
                .then((response:{ data:string }) => {
                    props.onSelect();
                })
                .catch((error) => processAJAXError(error, () => props.onCancel && props.onCancel()));
    }

    return (
        <div key={'Walk-Level-Quiz-'+props.key} id='walk-level-quiz' className='center-absolute-wrapper' onClick={() => props.onCancel && props.onCancel()} >

            <div className='form-page-block center-absolute-inside' onClick={(e)=>e.stopPropagation()}>
                <div className='form-header-detail-box'>
                    <h2 className='name'>How do you see your relationship with God?</h2>
                </div>

                <div id='walk-level-selection'>
                    {Array.from(walkLevelOptions.entries()).map(([value, [emoji, description]], index) => (
                        <React.Fragment key={`walk-level-option-${index}`} >
                            <label className='walk-level-icon' onClick={() => onSaveWalkLevel(value)}>{emoji}</label>
                            <label className='walk-level-description' onClick={() => onSaveWalkLevel(value)}>{description}</label>
                        </React.Fragment>
                    ))}
                </div>

                {(props.onCancel) &&
                    <div className='button-box' >
                        <button className='submit-button alternative-button'  type='button' onClick={() => props.onCancel && props.onCancel()}>Cancel</button>
                    </div>
                }
            </div>
        </div>
    );
}
