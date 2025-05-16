import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
}

export function Card({ children }: CardProps) {
    return <div className="glass-card">{children}</div>;
}
