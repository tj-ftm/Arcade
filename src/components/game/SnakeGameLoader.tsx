'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const SnakeClient = dynamic(() => import('@/components/game/SnakeClient').then(mod => mod.SnakeClient), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <Skeleton className="w-[80vw] h-[80vh] max-w-4xl max-h-4xl rounded-xl" />
    </div>
  ),
});

export function SnakeGameLoader() {
  return <SnakeClient />;
}
