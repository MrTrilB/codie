// NOTE: Styling must be managed via Fluent UI / Griffel makeStyles
import React from 'react';
import { makeStyles } from '@griffel/react';
import { CodieChatHeader } from './CodieChatHeader';
import { CodieChatMain } from './CodieChatMain';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', minHeight: 0 },
});

export const CodieChat: React.FC = () => {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <CodieChatHeader />
      <CodieChatMain />
    </div>
  );
};
