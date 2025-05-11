import { ButtonHTMLAttributes, FC, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

export const Button: FC<ButtonProps> = ({ children, onClick, className }) => {
  return (
    <button className={`${className}`} onClick={onClick}>
      {children}
    </button>
  );
};
