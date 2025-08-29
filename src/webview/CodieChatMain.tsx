// NOTE: Styling must be managed via Fluent UI / Griffel makeStyles
import React from 'react';
import { makeStyles } from '@griffel/react';
import { CodieChatArea } from './CodieChatArea';

const useStyles = makeStyles({
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 0',
    minHeight: 0,
    padding: '12px 0',
    width: '100%',
    boxSizing: 'border-box',
  },
});

export const CodieChatMain: React.FC = () => {
  const styles = useStyles();
  return (
    <main className={styles.main}>
      <CodieChatArea />
    </main>
  );
};
