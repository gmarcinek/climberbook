import { PropsWithChildren } from 'react';

interface ButtonProps extends PropsWithChildren {
  onClick: () => void;
}

export function MenuButton(props: ButtonProps) {
  const { onClick } = props;

  return (
    <button type='button' onClick={onClick}>
      {/* Menu icon */}
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='40'
        height='40'
        viewBox='0 0 24 24'
      >
        <path fill='#333' d='M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2Z' />
      </svg>
    </button>
  );
}
