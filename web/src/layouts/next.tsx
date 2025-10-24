import { PageTransition } from '@/components/page-transition';
import { Outlet } from 'umi';
import { Header } from './next-header';

export default function NextLayout() {
  return (
    <section className="h-full flex flex-col">
      <Header></Header>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </section>
  );
}
