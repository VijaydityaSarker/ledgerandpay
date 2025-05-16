import React, { ButtonHTMLAttributes } from 'react';

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button className="btn-primary" {...props} />;
}
