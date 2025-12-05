/**
 * External dependencies
 */
import { useRouteError } from "react-router-dom";
/**
 * Internal dependencies
 */
import { TriangleAlert } from "lucide-react";

const ErrorFallback = () => {
  const error = useRouteError();
  console.error(error);
  
  // Safely extract error message
  let errorMessage = "Something went wrong";
  if (error) {
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || "Something went wrong";
    } else if (typeof error === 'object' && error !== null) {
      // Handle error objects safely
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if ('error' in error) {
        // Handle nested error objects
        const nestedError = (error as { error?: unknown }).error;
        if (typeof nestedError === 'string') {
          errorMessage = nestedError;
        } else if (nestedError instanceof Error) {
          errorMessage = nestedError.message;
        }
      }
    }
  }
  
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className=" rounded-lg p-4 mb-6">
        <div className="flex flex-col items-start ">
          <div className="flex items-center mb-1">
            <TriangleAlert className="text-red-500 h-4 w-4 mr-2" />
            <h3 className="font-medium text-red-500">Something went wrong</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{errorMessage}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
