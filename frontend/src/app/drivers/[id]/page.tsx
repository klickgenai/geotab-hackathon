'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
export default function Redirect() {
  const router = useRouter();
  const { id } = useParams();
  useEffect(() => { if (id) router.replace(`/operator/drivers/${id}`); }, [router, id]);
  return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" /></div>;
}
