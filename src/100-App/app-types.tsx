import { ServerErrorResponse } from '../0-Assets/field-sync/api-type-sync/utility-types';

export const redColor:string = '#B12020';
export const blueColor:string = '#62D0F5';
export const blueDarkColor:string = '#003f89';
export const grayDarkColor:string = '#303030';
export const grayLightColor:string = '#A9A9A9';

//For Redux Toast Notifications | (lowercase enum exception compatibility with TypeOptions from react-toastify)
export enum ToastStyle {
    INFO = 'info', 
    WARN = 'warning', 
    ERROR = 'error', 
    SUCCESS = 'success'
}

export enum PageState {
  VIEW = 'VIEW',
  LOADING = 'LOADING',
  NEW = 'NEW',
  NOT_FOUND = 'NOT_FOUND',
  HIDE = 'HIDE',
  ERROR = 'ERROR'
}

export enum ModelPopUpAction {
  NONE = '',
  DELETE = 'delete',
  IMAGE = 'image',
  COMMENT = 'comment',
  ANNOUNCEMENT = 'announcement',
  EVENT = 'event',
}

export type AXIOSError = {
    code: string,
    message: string,
    name: string, //'AxiosError'
    request: XMLHttpRequest,
    //Only available if server responds
    response?: {
      data: ServerErrorResponse,
      status: number,
      statusText: string,
    }
  }
