import { TypeOptions } from "react-toastify";

//For Redux Toast Notifications | (lowercase enum exception compatibility with TypeOptions from react-toastify)
export enum ToastStyle {
    INFO = 'info', 
    WARN = 'warning', 
    ERROR = 'error', 
    SUCCESS = 'success'
}

//Sync with Server server.mts
export type ServerErrorResponse = {
    status: number, 
    notification: string,
    message: string,
    action: string,
    type: string,
    url: string,
    params: string,
    query: string,
    header: string | object,
    body: string | object
};

export type AXIOSError = {
    code: string,
    message: string,
    name: string, //"AxiosError"
    request: XMLHttpRequest,
    //Only available if server responds
    response?: {
      data: ServerErrorResponse,
      status: number,
      statusText: string,
    }
  }
