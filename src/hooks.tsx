import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './redux-store'
import { useCallback, useEffect, useState } from "react"
import { toast } from "react-toastify";
import { AXIOSError, ToastStyle } from './app-types';

import LOGO_ICON from './0-Assets/logo-icon.png';


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
      icon: ({theme, type}) =>  <img src={LOGO_ICON} style={{marginLeft: "-10px"}}/>,
    });

    if(callback) {
      toast.onChange(v => {
        if(v.id === text && v.status === "removed"){
          console.error("Executing Toast callback for", text);
          callback();
        }
      })
    }
    console.warn(`TOAST: ${text}`);
  }
}


export const processAJAXError = (error: AXIOSError, callback?:Function) => {
  const status:number = error?.response?.status || 500;
  console.error(error.message, error.response?.data.action);

  notify(error.response?.data.notification || '', 
      (status < 300) ? ToastStyle.SUCCESS
      : (status < 400) ? ToastStyle.INFO
      : (status < 500) ? ToastStyle.WARN
      : ToastStyle.ERROR,
    (status === 401 && callback === undefined) 
      ? ()=>window.location.assign('/login') : callback);
}
