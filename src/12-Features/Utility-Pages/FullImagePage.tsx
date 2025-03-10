import { useNavigate } from 'react-router-dom';
import { getDefaultImage, ImageDefaultEnum } from '../../2-Widgets/ImageWidgets';

import './fullImagePage.scss';

const FullImagePage = (props:{imageType?:ImageDefaultEnum, fullPage?:boolean, backgroundColor?:string, message?:string, messageColor?:string, primaryButtonText?:string, onPrimaryButtonClick?:()=>void, alternativeButtonText?:string, onAlternativeButtonClick?:()=>void, footer?:JSX.Element}) => { 

  return (
      <div id='full-image-page' className={props.fullPage ? 'full-page' : ''} style={{backgroundColor:props.backgroundColor}}>
        {(props.imageType !== ImageDefaultEnum.NONE) &&
          <div className={`scroll-body${props.fullPage ? ' full-page-body' : ''}`}>
            <img id='image' src={getDefaultImage(props.imageType ?? ImageDefaultEnum.LOGO)} alt={props.imageType ?? ImageDefaultEnum.LOGO} />
            {props.message && <h2 style={{color:props.messageColor}} >{props.message}</h2>}
            {props.primaryButtonText && <button className='primary-button' onClick={props.onPrimaryButtonClick} >{props.primaryButtonText}</button>}
            {props.alternativeButtonText && <button className='alternative-button' onClick={props.onAlternativeButtonClick} >{props.alternativeButtonText}</button>}
            {props.footer}
        </div>}
      </div>);
  }

export default FullImagePage;


/* 404 Missing Page */
export const PageNotFound = (props:{primaryButtonText?:string, onPrimaryButtonClick?:()=>void}) => {
    const navigate = useNavigate();
  
    return (
      <FullImagePage
        imageType={ImageDefaultEnum.EMPTY_TOMB}
        fullPage = {false}
        message='The tomb is empty and so is this page.'
        primaryButtonText={props.primaryButtonText}
        onPrimaryButtonClick={props.onPrimaryButtonClick}
        alternativeButtonText='Renew Login'
        onAlternativeButtonClick={()=>navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
      />
    );
  }
