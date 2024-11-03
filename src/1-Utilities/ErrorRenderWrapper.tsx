import React, { ReactNode } from 'react';

interface ErrorRenderWrapperProps { description:string; component:ReactNode; fallbackComponent:ReactNode; }
interface ErrorRenderWrapperState { hasError:boolean; }

/* Functional Components do not support componentDidCatch handling yet. */ 
class ErrorRenderWrapper extends React.Component<ErrorRenderWrapperProps,ErrorRenderWrapperState> {
  constructor(props:ErrorRenderWrapperProps) {
    super(props);
    this.state = { hasError:false };
  }

  //Lifecycle method called on render error
  static getDerivedStateFromError = ():ErrorRenderWrapperState => ({ hasError:true });

  componentDidCatch = (error:Error, errorInfo:React.ErrorInfo):void =>
    console.error('RENDER ERROR', this.props.description, error, errorInfo);

  render():ReactNode {
    if (this.state.hasError)
        return this.props.fallbackComponent;
    else
        return this.props.component;
  }
}

export default ErrorRenderWrapper;
