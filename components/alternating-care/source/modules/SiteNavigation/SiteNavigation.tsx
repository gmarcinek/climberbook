'use client';

import { useAppContext } from '@app/AppContext';
import { useState } from 'react';
import { NavigationBar } from './NavigationBar/NavigationBar';
import { Sidebar } from './Sidebar/Sidebar';

export const SiteNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { user } = useAppContext();
  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Sidebar isOpen={isOpen} toggle={toggle} />
      <NavigationBar toggle={toggle} user={user} />
    </>
  );
};
