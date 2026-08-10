import Image from 'next/image';
import type { ReactNode } from 'react';
import { asset } from '@/lib/base-path';
import styles from './ScreenHeader.module.css';

type Props = {
  title: string;
  /** One line under the title — scope, period, department. */
  meta?: ReactNode;
  /** Sits left of the logo. Usually the date, sometimes a control. */
  aside?: ReactNode;
};

/**
 * The logo sits top-right on interior screens, at 120–180px wide in print
 * contexts; the app header uses 104px, which is what the screens were drawn at.
 */
export function ScreenHeader({ title, meta, aside }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <h2 className="screen-heading">{title}</h2>
        {meta ? <div className={styles.meta}>{meta}</div> : null}
      </div>
      <div className={styles.right}>
        {aside}
        <Image
          src={asset('/m3m-logo.png')}
          alt="M3M"
          width={104}
          height={40}
          priority
          className={styles.logo}
        />
      </div>
    </header>
  );
}
