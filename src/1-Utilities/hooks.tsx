import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
			}, interval);
        };

        /* Initiate/Stop Interval */
        if(interval > 0)
			startInterval();
        else if(timer) {
        	clearInterval(timer);
        	timer = undefined;
        }

        return () => { timer && clearInterval(timer); }
    }, [interval, cancelInterval]);
};


export const useStatusInterval = ({interval, callback, statusInterval, statusCallback, cancelInterval}: {interval:number, callback:() => void, statusInterval:number, statusCallback:(timeLeft:number) => void, cancelInterval?:() => boolean}) => {
	const nextCompletionTimestamp = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout|undefined>(undefined);

    useEffect(() => {
        if(interval <= 0 || statusInterval <= 0 || interval < statusInterval) return;

		nextCompletionTimestamp.current = new Date().getTime() + interval;

        timerRef.current = setInterval(() => {
            const now:number = new Date().getTime();
            const timeLeft:number = nextCompletionTimestamp.current - now;

            //Main Callback
            if(timeLeft <= statusInterval) {
                callback();
                nextCompletionTimestamp.current = now + interval;
            } else
            	statusCallback(timeLeft);

            if(cancelInterval?.()) {
                clearInterval(timerRef.current!);
                timerRef.current = undefined;
            }
        }, statusInterval);

        return () => {
            if(timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = undefined;
            }
        };
    }, [interval, statusInterval, cancelInterval]);
};
