import React, { FC, InputHTMLAttributes } from "react";
import { Input } from "./input";

interface InputWithLabelProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label: string;
}

export const InputWithLabel: FC<InputWithLabelProps> = ({
  label,
  ...props
}) => {
  return (
    <div className="flex flex-col mb-4">
      <label htmlFor={label.toLocaleLowerCase()}>{label}</label>
      <Input {...props} />
    </div>
  );
};
