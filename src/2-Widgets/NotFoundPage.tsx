import { useNavigate } from 'react-router-dom';

import './notFound.scss';

import EMPTY_TOMB from '../0-Assets/images/404-empty-tomb.png';

const PageNotFound = (props:{primaryButtonText?:string, onPrimaryButtonClick?:()=>void}) => {
    const navigate = useNavigate();
  
    return (
      <div id='page-not-found'>
        <div className='scroll-body'>
          <img id='empty-tomb' src={EMPTY_TOMB} alt='Page Not Found' />
          <h2>The tomb is empty and so is this page.</h2>
            {props.primaryButtonText && <button className='primary-button' onClick={props.onPrimaryButtonClick} >{props.primaryButtonText}</button>}
            <button className='alternative-button' onClick={()=>navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)} >Renew Login</button>
        </div>
      </div>);
  }

  export default PageNotFound;
  