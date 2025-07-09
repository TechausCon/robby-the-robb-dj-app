/// <reference types="vite/client" />

declare module 'bpm-detective';

declare namespace React {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    directory?: string;
    webkitdirectory?: string;
  }
}
