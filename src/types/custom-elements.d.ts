import type * as React from 'react';

// מאפשר להשתמש ב-<blackz-signature> בתוך JSX
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'blackz-signature': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
