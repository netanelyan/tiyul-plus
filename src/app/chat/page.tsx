import type { Metadata } from 'next';
import AgentWorkspace from '@/components/AgentWorkspace';
import { pageMetadata } from '@/lib/seo/site';

export const metadata: Metadata = pageMetadata({
  path: '/chat',
  title: 'תכנון טיול | טיול+',
  noindex: true,
});

export default function ChatPage() {
  return <AgentWorkspace />;
}
