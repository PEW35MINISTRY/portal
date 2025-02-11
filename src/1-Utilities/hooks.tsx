import { useCallback, useEffect, useMemo, useState } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AXIOSError, ToastStyle } from '../100-App/app-types';
import type { AppDispatch, RootState } from '../100-App/redux-store';

//Assets
import LOGO_ICON from '../0-Assets/brand/logo-icon.png';


// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useStateFromProp(initialValue: unknown) {
    const [value, setValue] = useState(initialValue);
  
    useEffect(() => setValue(initialValue), [initialValue]);
  
    return [value, setValue];
  }

/******************************
 * TOAST NOTIFICATION HANDLING
 ******************************/

export const notify = (text:string, type:ToastStyle = ToastStyle.INFO, callback?:Function) => {
  //toastId prevents duplicates: https://fkhadra.github.io/react-toastify/prevent-duplicate/
  if(text != undefined && text.length) {
    toast(text, {
      toastId: text,
      type: type,
      icon: ({theme, type}) =>  <img src={LOGO_ICON} style={{marginLeft: '-10px'}}/>,
    });

    if(callback) {
      toast.onChange(v => {
        if(v.id === text && v.status === 'removed'){
          console.error('Executing Toast callback for', text);
          callback();
        }
      })
    }
    console.warn(`TOAST: ${text}`);
  }
}


export const processAJAXError = (error:AXIOSError, callback?:Function) => {
  const status:number = error?.response?.status || 500;
  if(error?.response?.data && 'action' in error?.response?.data)
    console.error(error.message, error?.response?.data.action);
  else
    console.error(error.message, error?.response?.data.notification);

  notify(error?.response?.data.notification || 'Server is Offline', 
      (status < 300) ? ToastStyle.SUCCESS
      : (status < 400) ? ToastStyle.INFO
      : (status < 500) ? ToastStyle.WARN
      : ToastStyle.ERROR,
    (status === 401 && callback === undefined && !window.location.pathname.includes('redirect')) 
      ? ()=>window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`) : callback);
}

// Parses Query Parameters
export const useQuery = () => {
  const { search } = useLocation();

  return useMemo(() => new URLSearchParams(search), [search]);
}


/*************************************
 *         INTERVAL HOOK             *
 * * Restart on Interval Change      *
 * * Optional cancelInterval() check *
 *************************************/
export const useInterval = ({ interval, callback, cancelInterval }:{interval:number, callback:() => void, cancelInterval?:() => boolean}) => {
    const [currentInterval, setCurrentInterval] = useState<number>(interval);

    useEffect(() => {
        let timer:NodeJS.Timeout|undefined = undefined;

        const startInterval = () => {
            timer = setInterval(() => {
                if(cancelInterval?.()) {
                    if(timer) {
                        clearInterval(timer);
                        timer = undefined;
                    }
                } else {
                    callback();
                }
            }, currentInterval);
        };

        /* Restart Interval */
        if(interval > 0)
          startInterval();
        else if(timer) {
          clearInterval(timer);
          timer = undefined;
        }

        return () => { timer && clearInterval(timer); }
    }, [currentInterval, callback, cancelInterval]);

    // Update interval duration
    useEffect(() => {
        setCurrentInterval(interval);
    }, [interval]);
};
