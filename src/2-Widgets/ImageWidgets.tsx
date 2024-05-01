import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { SUPPORTED_IMAGE_EXTENSION_LIST } from '../0-Assets/field-sync/input-config-sync/inputField';
import { useAppSelector } from '../1-Utilities/hooks';

/* Default Images */
import LOGO from '../0-Assets/brand/logo.png';
import PROFILE_DEFAULT from '../0-Assets/default-images/profile-default.png';
import CIRCLE_DEFAULT from '../0-Assets/default-images/circle-default.png';
import NOT_FOUND from '../0-Assets/icons/404-icon-black.png';

export enum ImageDefaultEnum {
    LOGO = 'LOGO',
    PROFILE = 'PROFILE',
    CIRCLE = 'CIRCLE',
    NOT_FOUND = 'NOT_FOUND'
}

export const getDefaultImage = (type?:ImageDefaultEnum):string|undefined => {
    switch (type) {
        case ImageDefaultEnum.LOGO:
            return LOGO;
        case ImageDefaultEnum.PROFILE:
            return PROFILE_DEFAULT;
        case ImageDefaultEnum.CIRCLE:
            return CIRCLE_DEFAULT;
        default:
            return NOT_FOUND;
    }
}


/***********************************************************
 * General Image Render | Handles Defaults                 *
 * src can be either: URL, Base64, imported (not raw path) *
 ***********************************************************/
export const ImageWidget = (props:{defaultImage?:ImageDefaultEnum, src?:string, defaultSrc?:string, className?:string, style?:React.CSSProperties}):JSX.Element => {
    const defaultImage = props.defaultSrc || getDefaultImage(props.defaultImage);
    const [currentSource, setCurrentSource] = useState<string|undefined>(props.src || defaultImage);
  
    useEffect(() => setCurrentSource(props.src || defaultImage), [props.src]);  

    const handleError = () => setCurrentSource(defaultImage);
  
    return ( <img className={`${props.className || ''}`} style={props.style} src={currentSource} onError={handleError} alt='Image' />);
  };


/***********************************************************
 * Profile Image Render | Handles Defaults                 *
 * src can be either: URL, Base64, imported (not raw path) *
 ***********************************************************/
export const ProfileImage = (props:{defaultUser?:boolean, src?:string, defaultSrc?:string, className?:string, style?:React.CSSProperties}):JSX.Element => {
    const defaultProfile = props.defaultSrc || PROFILE_DEFAULT;
    const profileImageURL = useAppSelector(state => state.account.userProfile.image);  
    const [currentSource, setCurrentSource] = useState<string|undefined>(props.src || (props.defaultUser && profileImageURL) || defaultProfile);

    useEffect(() => {
        setCurrentSource(props.src || (props.defaultUser && profileImageURL) || defaultProfile);
    }, [props.src, props.defaultUser, profileImageURL, props.defaultSrc]);

    //Priority Fallback Sequence
    const handleError = () => {
        if (currentSource === props.src) {
            setCurrentSource(props.defaultUser && profileImageURL ? profileImageURL : defaultProfile);
        } else if (currentSource === profileImageURL) {
            setCurrentSource(defaultProfile);
        } else {
            setCurrentSource(defaultProfile);
        }
    };
  
    return ( <img className={`profile-image ${props.className || ''}`} style={props.style} src={currentSource} onError={handleError} alt='Profile Image' />);
  };


/***********************************************************
 * Circle Image Render | Handles Defaults                  *
 * src can be either: URL, Base64, imported (not raw path) *
 ***********************************************************/
export const CircleImage = (props:{src?:string, defaultSrc?:string, className?:string, style?:React.CSSProperties}):JSX.Element => {
    const defaultCircle = props.defaultSrc || CIRCLE_DEFAULT;
    const [currentSource, setCurrentSource] = useState<string|undefined>(props.src || defaultCircle);

    useEffect(() => setCurrentSource(props.src || defaultCircle), [props.src]);

    const handleError = () => setCurrentSource(defaultCircle);
  
    return ( <img className={`circle-image ${props.className || ''}`} style={props.style} src={currentSource} onError={handleError} alt='Circle Image' />);
  };


/***********************************************
 *   IMAGE UPLOAD POP-UP PAGE COMPONENT
 * *********************************************/
export const ImageUpload = ({...props}:{key:string, title:string, imageStyle?:string, currentImage?:string, defaultImage:ImageDefaultEnum, onUpload:(file:any) => void, onClear:() => void, onCancel:() => void}) => {
    const [file, setFile] = useState<File|undefined>(undefined);
    const [dragActive, setDragActive] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const onDrag = (event:DragEvent<HTMLElement>):void => {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === 'dragenter' || event.type === 'dragover') {
            setDragActive(true);
        } else if (event.type === 'dragleave') {
            setDragActive(false);
        }
    };
    
    const onDrop = (event:DragEvent<HTMLDivElement>):void => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        if (event.dataTransfer?.files !== null && event.dataTransfer?.files !== undefined && event.dataTransfer?.files.length > 0) {
            setFile(event.dataTransfer.files[0]);
        }
    };

    return (
        <div key={'Image-Uploader'+props.key} id='image-upload' className='center-absolute-wrapper' onClick={()=>props.onCancel()} >

            <div className='form-page-block center-absolute-inside' onDragEnter={onDrag} onClick={(e)=>e.stopPropagation()}>
                <div className='form-header-detail-box'>
                    <h1 className='name'>{props.title}</h1>
                </div>

                <h3 >Supported File Types:
                    <label className='detail' style={{marginLeft: '1.0rem'}}>{SUPPORTED_IMAGE_EXTENSION_LIST.join(' | ').toUpperCase()}</label>
                </h3>

                <div className={`text-area image-upload-drag-area ${dragActive ? 'drag-active' : ''}`} >
                    <img className={`form-header-image ${props.imageStyle}`}
                            src={((file === undefined) ? props.currentImage : URL.createObjectURL(file)) || getDefaultImage(props.defaultImage)} alt='Please upload an Image'
                    />
                    
                    {/* HTML Input is Hidden and called by Button or Drag */}
                    <input ref={inputRef} className='none'
                        type='file' name='img'
                        accept={`${SUPPORTED_IMAGE_EXTENSION_LIST.map(type => `image/${type.toLowerCase()}`).join(', ')}`}
                        onChange={(event:React.ChangeEvent<HTMLInputElement>) => {
                            event.preventDefault();
                            setFile(event.target.files ? event.target.files[0] : undefined);
                        }}
                    />

                    {(file === undefined) && <button className='submit-button image-upload-drag-button' onClick={() => (inputRef.current !== null) && inputRef.current.click()}>Drag or Select a File</button>}
                </div>

                { dragActive && <div className='image-upload-drag-active' onDragEnter={onDrag} onDragLeave={onDrag} onDragOver={onDrag} onDrop={onDrop}></div> }

                {(file !== undefined) && <button className='submit-button submit-button' type='button' onClick={() => props.onUpload(file)}>Upload</button>}
                {(file === undefined && props.currentImage !== undefined) && <button className='submit-button secondary-button'  type='button' onClick={()=>props.onClear()}>Clear Image</button>}
                <button className='submit-button alternative-button'  type='button' onClick={()=>props.onCancel()}>Cancel</button>

            </div>
        </div>
    );
}
