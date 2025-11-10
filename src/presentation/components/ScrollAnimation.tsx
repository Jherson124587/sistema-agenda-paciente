"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "fade";
};

export function ScrollAnimation({ children, className = "", delay = 0, direction = "up" }: Props) {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            setIsVisible(true);
                        }, delay);
                    }
                });
            },
            { threshold: 0.1 }
        );

        const currentElement = elementRef.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    }, [delay]);

    const getDirectionClass = () => {
        const baseClass = "transition-all duration-1000 ease-out";
        if (!isVisible) {
            switch (direction) {
                case "up":
                    return `${baseClass} translate-y-10 opacity-0`;
                case "down":
                    return `${baseClass} -translate-y-10 opacity-0`;
                case "left":
                    return `${baseClass} -translate-x-10 opacity-0`;
                case "right":
                    return `${baseClass} translate-x-10 opacity-0`;
                case "fade":
                    return `${baseClass} opacity-0`;
                default:
                    return `${baseClass} opacity-0`;
            }
        }
        return `${baseClass} translate-y-0 translate-x-0 opacity-100`;
    };

    return (
        <div ref={elementRef} className={`${getDirectionClass()} ${className}`}>
            {children}
        </div>
    );
}


