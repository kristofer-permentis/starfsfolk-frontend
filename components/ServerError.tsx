'use client';

interface ServerErrorProps {
  status?: number;
  message?: string;
}

export default function ServerError({ status, message }: ServerErrorProps) {
  return (
    <div className="text-center text-red-700 font-semibold p-4">
      🔧 Villa frá netþjóni {status ? `(HTTP ${status})` : ''}: {message || 'Óþekkt villa'}
    </div>
  );
}