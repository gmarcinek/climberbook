import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Button } from "@/components/climberbook/common/Button";
import styles from "./FormControls.module.css";

type BaseControlProps = {
  className?: string;
  grow?: boolean;
};

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & BaseControlProps;
type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> &
  BaseControlProps;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  BaseControlProps;

type NumericStepperControlProps = {
  value: string;
  onChange: InputHTMLAttributes<HTMLInputElement>["onChange"];
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel?: ReactNode;
  incrementLabel?: ReactNode;
  decrementAriaLabel?: string;
  incrementAriaLabel?: string;
  decrementTitle?: string;
  incrementTitle?: string;
  inputSuffix?: ReactNode;
  trailingActions?: ReactNode;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  >;
  className?: string;
};

type NumericRangeControlProps = {
  value: string;
  onChange: InputHTMLAttributes<HTMLInputElement>["onChange"];
  min: string;
  max: string;
  step: string;
  ariaLabel: string;
  valueLabel: ReactNode;
  className?: string;
};

type InputActionControlProps = TextInputProps & {
  action: ReactNode;
  shellClassName?: string;
};

function joinClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function Input({ className, grow = false, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      className={joinClassNames(styles.control, grow && styles.grow, className)}
    />
  );
}

export function Select({
  className,
  grow = false,
  ...props
}: SelectInputProps) {
  return (
    <select
      {...props}
      className={joinClassNames(styles.control, grow && styles.grow, className)}
    />
  );
}

export function TextArea({ className, grow = false, ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={joinClassNames(
        styles.control,
        styles.textarea,
        grow && styles.grow,
        className,
      )}
    />
  );
}

export function InputActionControl({
  action,
  className,
  shellClassName,
  grow = false,
  ...props
}: InputActionControlProps) {
  return (
    <div className={joinClassNames(styles.inputShell, shellClassName)}>
      <Input
        {...props}
        grow={grow}
        className={joinClassNames(styles.controlWithTrailing, className)}
      />
      {action}
    </div>
  );
}

export function NumericStepperControl({
  value,
  onChange,
  onDecrement,
  onIncrement,
  decrementLabel = "-",
  incrementLabel = "+",
  decrementAriaLabel,
  incrementAriaLabel,
  decrementTitle,
  incrementTitle,
  inputSuffix,
  trailingActions,
  inputProps,
  className,
}: NumericStepperControlProps) {
  return (
    <div className={joinClassNames(styles.controlGroup, className)}>
      <Button
        size="small"
        variant="secondary"
        aria-label={decrementAriaLabel}
        title={decrementTitle}
        onClick={onDecrement}
        className={styles.stepButton}
      >
        {decrementLabel}
      </Button>
      <div className={styles.stepInputShell}>
        <Input
          {...inputProps}
          value={value}
          onChange={onChange}
          grow
          className={joinClassNames(
            Boolean(inputSuffix) && styles.controlWithSuffix,
          )}
        />
        {inputSuffix && (
          <span className={styles.stepInputSuffix}>{inputSuffix}</span>
        )}
      </div>
      <Button
        size="small"
        variant="secondary"
        aria-label={incrementAriaLabel}
        title={incrementTitle}
        onClick={onIncrement}
        className={styles.stepButton}
      >
        {incrementLabel}
      </Button>
      {trailingActions}
    </div>
  );
}

export function NumericRangeControl({
  value,
  onChange,
  min,
  max,
  step,
  ariaLabel,
  valueLabel,
  className,
}: NumericRangeControlProps) {
  return (
    <div className={joinClassNames(styles.rangeControl, className)}>
      <input
        value={value}
        onChange={onChange}
        type="range"
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        className={styles.rangeSlider}
      />
      <output className={styles.rangeValue}>{valueLabel}</output>
    </div>
  );
}

export const formControlClassNames = {
  control: styles.control,
  grow: styles.grow,
  inputShell: styles.inputShell,
  controlWithTrailing: styles.controlWithTrailing,
  trailingAction: styles.trailingAction,
  controlGroup: styles.controlGroup,
  stepButton: styles.stepButton,
  rangeControl: styles.rangeControl,
  rangeSlider: styles.rangeSlider,
  rangeValue: styles.rangeValue,
};
