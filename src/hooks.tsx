import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './redux-store'
import { useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import qs from "qs"

//Typescript Redux Setup: https://react-redux.js.org/tutorials/typescript-quick-start

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;


