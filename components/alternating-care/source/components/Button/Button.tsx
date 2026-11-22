import { Button as Btn, ButtonProps } from '@nextui-org/button';

export const Button = (props: ButtonProps) => {
  const { children, ...restProps } = props;
  return <Btn {...restProps}>{children}</Btn>;
};
