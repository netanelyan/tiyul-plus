import type * as React from 'react';

// Allows <blackz-signature> to be used inside JSX
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
