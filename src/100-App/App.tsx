import { Provider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import store from './redux-store';
import { Slide, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import packageJson from '../../package.json'; 

import './App.scss';

//Components
import Login from '../4-Auth/Login';
import SignUpPage from '../11-Models/UserSignUpPage';
import PopupPageFlow from '../12-Features/PopupPageFlow';
import AppContent from './AppContent';
import FullImagePage from '../12-Features/Utility-Pages/FullImagePage';
import PasswordForgot from '../4-Auth/PasswordForgotPage';
import PasswordReset from '../4-Auth/PasswordResetPage';
import EmailVerify from '../4-Auth/EmailVerify';


const App = () => {
  const version:string = packageJson.version ?? '0.0.0';
  const environment:string = process.env.REACT_APP_ENVIRONMENT ?? 'ENVIRONMENT';
  const gitBranch:string = process.env.REACT_APP_GIT_BUILD_BRANCH ?? 'BRANCH';
  const gitCommit:string = process.env.REACT_APP_GIT_BUILD_COMMIT ?? 'COMMIT';

  return (
    <BrowserRouter>
        <Provider store={store}>
        <Routes>
            <Route path='/login/*' element={<Login/>}/>
            <Route path='/signup/initial-account-flow/*' element={<PopupPageFlow allowEscape={false} />}/>
            <Route path='/signup/*' element={<SignUpPage/>}/>
            <Route path='/email-verify' element={<EmailVerify/>}/>
            <Route path='/password-forgot' element={<PasswordForgot/>}/>
            <Route path='/password-reset' element={<PasswordReset/>}/>
            <Route path='/portal/version' element={<FullImagePage fullPage={true} alternativeButtonText={`Version: ${version} | ${environment} | ${gitBranch}@${gitCommit}`}/>}/>
            <Route path='/portal/' element={ <Navigate to='/portal/dashboard' /> }/>
            <Route path='/portal/*' element={<AppContent/>}/>
            <Route path='*' element={ <Navigate to='/login' /> }/>
        </Routes>
        <ToastContainer
            position='top-right'
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={true}
            pauseOnHover={true}
            transition={Slide}
            limit={3}
            theme='light'
            />
      </Provider>
    </BrowserRouter>
  );
}

export default App;
