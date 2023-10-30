import React, { ReactElement, forwardRef, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../1-Utilities/hooks';

import './dashboard.scss';

//Assets
import SAMPLE from '../0-Assets/dashboard-sample.png';

const Dashboard = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    /*********************
     *   RENDER DISPLAY 
     * *******************/
    return (
        <div id='dashboard-page'>
            <img src={SAMPLE} alt='sample-dashboard' />
        </div>
    );
}
export default Dashboard;
