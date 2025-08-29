// NOTE: Styling must be managed via Fluent UI / Griffel makeStyles
import React from 'react';
import { makeStyles } from '@griffel/react';
import { CodieChatArea } from './CodieChatArea';

const useStyles = makeStyles({
  main: { padding: '12px' },
});

export const CodieChatMain: React.FC = () => {
  const styles = useStyles();
  return (
    <main className={styles.main}>
      <CodieChatArea />
    </main>
  );
};
