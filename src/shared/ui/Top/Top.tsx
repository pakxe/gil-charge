import { cn } from "@/shared/lib/cn";
import { ComponentPropsWithRef, ReactNode } from "react";

type Props = Omit<ComponentPropsWithRef<"div">, "title"> & {
    title?: ReactNode;
    description?: ReactNode;
};

export function Top({ title, description, className, ...rest }: Props) {
    return (
        <div className={cn("flex flex-col", className)} {...rest}>
            {title && title}
            {description && description}
        </div>
    );
}
