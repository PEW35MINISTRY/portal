import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../1-Utilities/hooks';

import './animation.scss';

//Assets
import ANIMATED_LOGO from '../0-Assets/brand/logo-animation-1000.gif';
import ANIMATED_LOGO_MOBILE from '../0-Assets/brand/logo-animation-600.gif';

const AnimationPage = () => {
    const navigate = useNavigate();
    const skipAnimation:boolean = useAppSelector((state) => state.settings.skipAnimation);

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/portal/dashboard');
        }, skipAnimation ? 0 : 7000); //Animation 5.6 seconds, then 5 seconds persisting logo = 10.1 seconds

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div id='animation-page' onClick={()=>navigate('/portal/dashboard')}>
            {(window.innerHeight < 1100) ?
                <img id='animation-logo-mobile' src={ANIMATED_LOGO_MOBILE} alt='Animated Logo'></img>
                : <img id='animation-logo' src={ANIMATED_LOGO} alt='Animated Logo'></img>
            }
        </div>
    );
}

export default AnimationPage;
