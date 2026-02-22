// Minimal type stubs for sandboxed build environments.
// Overridden by proper @types/* once `npm install` runs with registry access.

// ─── Node.js globals ─────────────────────────────────────────────────────────
declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
  version: string;
  platform: string;
};

// ─── JSX ─────────────────────────────────────────────────────────────────────
declare namespace JSX {
  interface Element {
    type: unknown;
    props: Record<string, unknown>;
    key: string | null;
  }
  // Allow `key` on any component element
  interface IntrinsicAttributes {
    key?: string | number | null;
  }
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
  interface ElementChildrenAttribute {
    children: Record<string, unknown>;
  }
}

// ─── React module ─────────────────────────────────────────────────────────────
declare module "react" {
  export type ReactNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactElement
    | ReadonlyArray<ReactNode>;

  export interface ReactElement {
    type: unknown;
    props: Record<string, unknown> & { children?: ReactNode };
    key: string | null;
  }

  export type MouseEventHandler<T = Element> = (
    event: MouseEvent & { currentTarget: T & EventTarget }
  ) => void;

  export type ChangeEventHandler<T = Element> = (
    event: Event & { target: T & { value: string; checked: boolean } }
  ) => void;

  export type HTMLAttributes<T = Element> = {
    className?: string;
    style?: Record<string, string | number>;
    id?: string;
    children?: ReactNode;
    onClick?: MouseEventHandler<T>;
    [key: string]: unknown;
  };

  export type ButtonHTMLAttributes<T = HTMLButtonElement> = HTMLAttributes<T> & {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    form?: string;
  };

  export type InputHTMLAttributes<T = HTMLInputElement> = HTMLAttributes<T> & {
    type?: string;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: ChangeEventHandler<T>;
    placeholder?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    autoFocus?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
  };

  export type TextareaHTMLAttributes<T = HTMLTextAreaElement> = HTMLAttributes<T> & {
    value?: string;
    onChange?: ChangeEventHandler<T>;
    placeholder?: string;
    rows?: number;
    cols?: number;
    readOnly?: boolean;
  };

  export type SelectHTMLAttributes<T = HTMLSelectElement> = HTMLAttributes<T> & {
    value?: string | number;
    onChange?: ChangeEventHandler<T>;
    multiple?: boolean;
  };

  export interface MutableRefObject<T> { current: T; }
  export interface RefObject<T> { readonly current: T | null; }

  export interface Context<T> {
    Provider: (props: { value: T; children?: ReactNode }) => ReactElement | null;
    Consumer: (props: { children: (v: T) => ReactNode }) => ReactElement | null;
  }

  export type FC<P = Record<string, unknown>> = (
    props: P & { children?: ReactNode }
  ) => ReactElement | null;

  export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useCallback<T extends (...args: never[]) => unknown>(fn: T, deps: unknown[]): T;
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useMemo<T>(fn: () => T, deps: unknown[]): T;
  export function useContext<T>(ctx: Context<T>): T;
  export function createContext<T>(initial: T): Context<T>;
  export function createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): ReactElement;
  export const Fragment: symbol;

  // Allow `import React from 'react'` (default import)
  const _default: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    useMemo: typeof useMemo;
    useContext: typeof useContext;
    createContext: typeof createContext;
    createElement: typeof createElement;
    Fragment: typeof Fragment;
  };
  export default _default;
}

// ─── Next.js ──────────────────────────────────────────────────────────────────
declare module "next" {
  import type { ReactNode } from "react";
  export type NextApiRequest = {
    method?: string;
    query: Record<string, string | string[]>;
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
    cookies: Record<string, string>;
    url?: string;
  };
  export type NextApiResponse<T = unknown> = {
    status: (code: number) => NextApiResponse<T>;
    json: (body: T) => void;
    send: (body: string | Buffer) => void;
    end: (data?: string | Buffer) => void;
    setHeader: (name: string, value: string | string[]) => void;
    redirect: (url: string, statusCode?: number) => void;
  };
}

declare module "next/link" {
  import type { ReactNode } from "react";
  export interface LinkProps {
    href: string;
    children?: ReactNode;
    className?: string;
    prefetch?: boolean;
    replace?: boolean;
    scroll?: boolean;
    [key: string]: unknown;
  }
  export default function Link(props: LinkProps): JSX.Element;
}

declare module "next/router" {
  export function useRouter(): {
    pathname: string;
    asPath: string;
    query: Record<string, string | string[]>;
    push: (url: string) => Promise<boolean>;
    replace: (url: string) => Promise<boolean>;
    back: () => void;
    reload: () => void;
    isReady: boolean;
    locale?: string;
  };
}

declare module "next/app" {
  import type { FC, ReactNode } from "react";
  export type AppProps<P = Record<string, unknown>> = {
    Component: FC<P>;
    pageProps: P;
  };
}

declare module "next/head" {
  import type { ReactNode } from "react";
  export default function Head(props: { children?: ReactNode }): JSX.Element;
}
