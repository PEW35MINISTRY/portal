import React, { useState, useRef, DragEvent } from 'react';
import { SUPPORTED_IMAGE_EXTENSION_LIST } from '../0-Assets/field-sync/input-config-sync/inputField';


/***********************************************
 *   IMAGE UPLOAD POP-UP PAGE COMPONENT
 * *********************************************/
export default ({...props}:{key:string, title:string, imageStyle?:string, currentImage?:string, defaultImage:string, onUpload:(file:any) => void, onClear:() => void, onCancel:() => void}) => {
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
                            src={((file === undefined) ? props.currentImage : URL.createObjectURL(file)) || props.defaultImage} alt='Please upload an Image'
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
