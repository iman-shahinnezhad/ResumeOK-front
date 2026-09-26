'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import React from 'react';

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (to === -1) router.back();
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  let search = '';
  try {
    const searchParams = useSearchParams();
    if (searchParams) {
      search = `?${searchParams.toString()}`;
    }
  } catch (e) {}

  return {
    pathname: pathname || '/',
    search,
    hash: '',
    state: null
  };
}

export function Link({ to, href, children, ...rest }: any) {
  const destination = href || to || '#';
  return (
    <NextLink href={destination} {...rest}>
      {children}
    </NextLink>
  );
}
