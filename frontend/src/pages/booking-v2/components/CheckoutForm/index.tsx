/**
 * CheckoutForm - Payment/Checkout Phase
 * Support for Telebirr and Chapa with partial/full payment options
 */

import { useState } from "react";
import { ArrowLeft, CreditCard, Wallet, CheckCircle2, AlertCircle, DollarSign, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { formatDate, formatTime } from "../../utils/dateHelpers";
import type { Service, TimeSlot, PaymentGateway, PaymentType, PaymentOption, PaymentData } from "../../types";

interface CheckoutFormProps {
  // Booking details
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  userName: string;
  userEmail: string;
  
  // Payment handling
  onSubmit: (paymentData: PaymentData) => Promise<void>;
  onBack: () => void;
  
  // State
  loading?: boolean;
  className?: string;
}

export function CheckoutForm({
  service,
  selectedDate,
  selectedSlot,
  timeFormat,
  timezone,
  userName,
  userEmail,
  onSubmit,
  onBack,
  loading = false,
  className,
}: CheckoutFormProps) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>('full');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({});

  // Calculate payment amounts
  const totalPrice = service.price || 0;
  const reservationFee = Math.round(totalPrice * 0.3); // 30% reservation fee
  const balanceDue = totalPrice - reservationFee;

  const paymentOptions: PaymentOption[] = [
    {
      type: 'full',
      label: 'Pay Full Amount',
      description: 'Pay the complete amount now',
      amount: totalPrice,
    },
    {
      type: 'partial',
      label: 'Pay Reservation Fee',
      description: 'Pay 30% now, rest on-site',
      amount: reservationFee,
      reservationFee: reservationFee,
      balanceDue: balanceDue,
    },
  ];

  const paymentGateways: Array<{ id: PaymentGateway; name: string; icon: any; description: string; color: string }> = [
    {
      id: 'telebirr',
      name: 'TeleBirr',
      icon: Wallet,
      description: 'Pay with TeleBirr mobile wallet',
      color: 'from-orange-500 to-orange-600',
    },
    {
      id: 'chapa',
      name: 'Chapa',
      icon: CreditCard,
      description: 'Pay with card or mobile money',
      color: 'from-blue-500 to-blue-600',
    },
  ];

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) {
      setErrors({ phoneNumber: 'Phone number is required' });
      return false;
    }
    
    // Ethiopian phone number validation
    const phoneRegex = /^(\+251|251|0)?[97]\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setErrors({ phoneNumber: 'Please enter a valid Ethiopian phone number' });
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedGateway) {
      return;
    }

    // Validate phone number for Telebirr
    if (selectedGateway === 'telebirr' && !validatePhoneNumber(phoneNumber)) {
      return;
    }

    const paymentData: PaymentData = {
      gateway: selectedGateway,
      paymentType: selectedPaymentType,
      amount: selectedPaymentType === 'full' ? totalPrice : reservationFee,
      phoneNumber: selectedGateway === 'telebirr' ? phoneNumber : undefined,
    };

    await onSubmit(paymentData);
  };

  const startTime = new Date(selectedSlot.start_time);
  const formattedTime = timeFormat === '24h' 
    ? formatTime(startTime, '24h', timezone)
    : formatTime(startTime, '12h', timezone);

  const selectedOption = paymentOptions.find(opt => opt.type === selectedPaymentType);

  // If service is free, skip payment
  if (!totalPrice || totalPrice <= 0) {
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
          <Info className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Payment Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This service is free. Click continue to complete your booking.
          </p>
          <Button
            onClick={() => onSubmit({ gateway: 'chapa', paymentType: 'full', amount: 0 })}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Continue to Booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-6xl mx-auto", className)}>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        disabled={loading}
        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 -ml-2 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Form
      </Button>

      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        {/* Payment Section */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Payment & Checkout
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Complete your booking by making a payment
            </p>
          </div>

          {/* Payment Type Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Choose Payment Option
            </h3>
            <div className="grid gap-4">
              {paymentOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedPaymentType(option.type)}
                  disabled={loading}
                  className={cn(
                    "relative p-6 rounded-xl border-2 transition-all duration-200 text-left",
                    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
                    selectedPaymentType === option.type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                  )}
                >
                  {/* Selected Indicator */}
                  {selectedPaymentType === option.type && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}

                  <div className="flex items-start gap-4 pr-10">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
                        {option.label}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {option.description}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {option.amount} {service.currency || 'ETB'}
                          </span>
                          {option.type === 'partial' && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              now
                            </span>
                          )}
                        </div>
                        {option.balanceDue && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            + {option.balanceDue} {service.currency || 'ETB'} on-site
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Info Banner */}
            {selectedPaymentType === 'partial' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    The remaining balance ({balanceDue} {service.currency || 'ETB'}) must be paid at the clinic before your appointment.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Gateway Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Select Payment Method
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {paymentGateways.map((gateway) => (
                <button
                  key={gateway.id}
                  onClick={() => setSelectedGateway(gateway.id)}
                  disabled={loading}
                  className={cn(
                    "relative p-6 rounded-xl border-2 transition-all duration-200",
                    "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
                    selectedGateway === gateway.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                  )}
                >
                  {/* Selected Indicator */}
                  {selectedGateway === gateway.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3",
                      gateway.color
                    )}>
                      <gateway.icon className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1">
                      {gateway.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {gateway.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Telebirr Phone Number Input */}
            {selectedGateway === 'telebirr' && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Label htmlFor="phoneNumber" className="text-base font-medium mb-2 block text-gray-900 dark:text-gray-100">
                  TeleBirr Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0912345678 or +251912345678"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errors.phoneNumber) {
                      setErrors({});
                    }
                  }}
                  disabled={loading}
                  className={cn(
                    "h-12 text-base",
                    "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900",
                    "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
                    "focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0",
                    errors.phoneNumber && "border-red-500 focus:border-red-500"
                  )}
                  aria-invalid={errors.phoneNumber ? "true" : "false"}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.phoneNumber}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  You'll receive a payment request on this number
                </p>
              </div>
            )}

            {/* Chapa Info */}
            {selectedGateway === 'chapa' && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      You'll be redirected to Chapa's secure payment page to complete your transaction using card, mobile money, or bank transfer.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedGateway}
            className={cn(
              "w-full h-14 text-lg font-semibold",
              // Explicit blue colors for better visibility
              "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
              "text-white dark:text-white", // Force white text
              "border-2 border-transparent hover:border-blue-800 dark:hover:border-blue-400", // Add border interaction
              "shadow-lg hover:shadow-xl transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-700"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Proceed to Payment ({selectedOption?.amount} {service.currency || 'ETB'})
              </>
            )}
          </Button>
        </div>

        {/* Booking Summary Sidebar */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Order Summary
            </h3>

            <div className="space-y-4">
              {/* Service */}
              <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Service</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {service.name}
                </p>
                {service.provider && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    with {service.provider.name}
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(selectedDate, 'long')}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mt-1">
                  {formattedTime}
                </p>
              </div>

              {/* Patient */}
              <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">Patient</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {userName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {userEmail}
                </p>
              </div>

              {/* Price Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Service Fee</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {totalPrice} {service.currency || 'ETB'}
                  </span>
                </div>
                
                {selectedPaymentType === 'partial' && (
                  <>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Paying Now (30%)</span>
                      <span className="text-primary-600 dark:text-primary-400 font-semibold">
                        -{reservationFee} {service.currency || 'ETB'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Pay on-site</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {balanceDue} {service.currency || 'ETB'}
                      </span>
                    </div>
                  </>
                )}

                <div className="pt-4 mt-4 border-t-2 border-gray-300 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedPaymentType === 'full' ? 'Total' : 'Due Now'}
                    </span>
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {selectedOption?.amount} {service.currency || 'ETB'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>Secure payment processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

