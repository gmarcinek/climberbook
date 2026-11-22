import { Button as Btn, ButtonProps } from '@nextui-org/button';
import '@styles/globals.css';

export const Button = (props: ButtonProps) => {
  const { children, ...restProps } = props;
  return <Btn {...restProps}>{children}</Btn>;
};
