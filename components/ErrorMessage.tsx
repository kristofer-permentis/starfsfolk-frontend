'use client';

import { NotAuthorizedError, NotAuthenticatedError, ServerError } from '@/lib/fetchWithAuth';

interface ErrorMessageProps {
  error: Error | null;
}

export default function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  let message = 'Óþekkt villa hefur komið upp';

  if (error instanceof NotAuthorizedError) {
    message = 'Þú hefur ekki aðgang að þessum hluta kerfisins';
  } else if (error instanceof NotAuthenticatedError) {
    message = 'Þú þarft að skrá þig inn til að halda áfram';
  } else if (error instanceof ServerError) {
    message = error.message;
  } else if (error.message) {
    message = error.message;
  }

  return <div className="text-red-600 font-semibold p-2">⚠ {message}</div>;
}