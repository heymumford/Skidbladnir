import React, { ReactNode } from 'react';
import { Box, styled } from '@mui/material';
import { NavigationBar } from './NavigationBar';
import { ActivityLog } from './ActivityLog';
import { StatusBar } from './StatusBar';

interface AppLayoutProps {
  children: ReactNode;
}

const AppContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const ContentContainer = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
});

const MainWorkspace = styled(Box)(({ theme }) => ({
  flex: 3,
  overflow: 'auto',
  padding: theme.spacing(2),
  borderRight: `1px solid ${theme.palette.divider}`,
}));

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <AppContainer data-testid="app-container">
      <NavigationBar />
      <ContentContainer data-testid="content-container">
        <MainWorkspace data-testid="main-workspace">
          {children}
        </MainWorkspace>
        <ActivityLog />
      </ContentContainer>
      <StatusBar />
    </AppContainer>
  );
};