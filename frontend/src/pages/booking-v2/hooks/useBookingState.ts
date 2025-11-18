/**
 * Centralized state management for booking flow
 */

import { useReducer, useEffect } from 'react';
import type { BookingState, BookingAction } from '../types';

const initialState: BookingState = {
  phase: 'discover',
  bookingType: 'individual',
  selectedDate: null,
  selectedSlot: null,
  displayMonth: new Date(),
  timeFormat: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale: 'en-US',
  formData: {
    userName: '',
    userEmail: '',
    userPhone: '',
    notes: '',
  },
  requiresPayment: false,
  loading: false,
  error: null,
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    
    case 'SET_ORGANIZATION':
      return {
        ...state,
        organization: action.payload,
        bookingType: 'organization',
      };
    
    case 'SET_SERVICE':
      return {
        ...state,
        service: action.payload,
        phase: 'select',
      };
    
    case 'SET_DATE':
      return {
        ...state,
        selectedDate: action.payload,
        selectedSlot: null, // Reset slot when date changes
      };
    
    case 'SET_SLOT':
      return {
        ...state,
        selectedSlot: action.payload,
        phase: 'confirm',
      };
    
    case 'SET_DISPLAY_MONTH':
      return {
        ...state,
        displayMonth: action.payload,
      };
    
    case 'SET_TIME_FORMAT':
      return {
        ...state,
        timeFormat: action.payload,
      };
    
    case 'SET_TIMEZONE':
      return {
        ...state,
        timezone: action.payload,
      };
    
    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
      };
    
    case 'SET_PAYMENT_DATA':
      return {
        ...state,
        paymentData: action.payload,
      };
    
    case 'SET_REQUIRES_PAYMENT':
      return {
        ...state,
        requiresPayment: action.payload,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case 'SET_BOOKING_RESPONSE':
      return {
        ...state,
        bookingResponse: action.payload,
        phase: 'complete',
        loading: false,
      };
    
    case 'SET_PAYMENT_RESPONSE':
      return {
        ...state,
        paymentResponse: action.payload,
        loading: false,
      };
    
    case 'RESET_BOOKING':
      return {
        ...initialState,
        timeFormat: state.timeFormat, // Preserve user preferences
        timezone: state.timezone,
        locale: state.locale,
        requiresPayment: false,
      };
    
    default:
      return state;
  }
}

export function useBookingState() {
  const [state, dispatch] = useReducer(bookingReducer, initialState);
  
  // Load saved preferences from localStorage
  useEffect(() => {
    const savedTimeFormat = localStorage.getItem('timeFormat') as '12h' | '24h' | 'ethiopian';
    const savedTimezone = localStorage.getItem('timezone');
    
    if (savedTimeFormat) {
      dispatch({ type: 'SET_TIME_FORMAT', payload: savedTimeFormat });
    }
    if (savedTimezone) {
      dispatch({ type: 'SET_TIMEZONE', payload: savedTimezone });
    }
  }, []);
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('timeFormat', state.timeFormat);
  }, [state.timeFormat]);
  
  useEffect(() => {
    localStorage.setItem('timezone', state.timezone);
  }, [state.timezone]);
  
  // Helper functions
  const setOrganization = (org: BookingState['organization']) => {
    if (org) dispatch({ type: 'SET_ORGANIZATION', payload: org });
  };
  
  const setService = (service: BookingState['service']) => {
    if (service) dispatch({ type: 'SET_SERVICE', payload: service });
  };
  
  const setDate = (date: Date) => {
    dispatch({ type: 'SET_DATE', payload: date });
  };
  
  const setSlot = (slot: BookingState['selectedSlot']) => {
    if (slot) dispatch({ type: 'SET_SLOT', payload: slot });
  };
  
  const setTimeFormat = (format: '12h' | '24h' | 'ethiopian') => {
    dispatch({ type: 'SET_TIME_FORMAT', payload: format });
  };
  
  const setTimezone = (timezone: string) => {
    dispatch({ type: 'SET_TIMEZONE', payload: timezone });
  };
  
  const setFormData = (data: Partial<BookingState['formData']>) => {
    dispatch({ type: 'SET_FORM_DATA', payload: data });
  };
  
  const setPaymentData = (data: BookingState['paymentData']) => {
    if (data) dispatch({ type: 'SET_PAYMENT_DATA', payload: data });
  };
  
  const setRequiresPayment = (requires: boolean) => {
    dispatch({ type: 'SET_REQUIRES_PAYMENT', payload: requires });
  };
  
  const goToPhase = (phase: BookingState['phase']) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };
  
  const resetBooking = () => {
    dispatch({ type: 'RESET_BOOKING' });
  };
  
  return {
    state,
    dispatch,
    // Helper functions
    setOrganization,
    setService,
    setDate,
    setSlot,
    setTimeFormat,
    setTimezone,
    setFormData,
    setPaymentData,
    setRequiresPayment,
    goToPhase,
    resetBooking,
  };
}

