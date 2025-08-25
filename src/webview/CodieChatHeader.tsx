// CodieChatHeader.tsx
import React from 'react';
import { Card, CardHeader, Avatar, tokens, makeStyles } from '@fluentui/react-components';

const useHeaderStyles = makeStyles({
  card: {
    marginBottom: '0.5em',
    background: tokens.colorNeutralBackground2,
    borderRadius: '10px',
    boxShadow: '0 2px 8px #0002',
    border: 'none',
    padding: 0,
  },
  title: {
    fontWeight: 700,
    fontSize: '1.25em',
    color: tokens.colorBrandForeground2,
    letterSpacing: '0.01em',
    marginBottom: 0,
    marginTop: 0,
    lineHeight: 1.2,
  },
  desc: {
    fontWeight: 400,
    fontSize: '1em',
    color: tokens.colorNeutralForeground3,
    marginTop: '0.1em',
    marginBottom: 0,
    lineHeight: 1.1,
  },
});

export const CodieChatHeader: React.FC = () => {
  const headerStyles = useHeaderStyles();
  return (
    <Card appearance="subtle" className={headerStyles.card}>
      <CardHeader
        image={<Avatar name="Codie" color="brand" size={40} />}
        header={<span className={headerStyles.title}>Codie Chat</span>}
        description={<span className={headerStyles.desc}>Your AI coding assistant</span>}
      />
    </Card>
  );
};
