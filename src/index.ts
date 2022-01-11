/**
  Copyright 2021 Rytis Alekna <r.alekna@gmail.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  @author Rytis Alekna
 */
export type Action<T extends string = string> = {
  type: T;
  [key: string | symbol | number]: any;
};

export type MatcherConfig =
  | string
  | RegExp
  | boolean
  | ((action: unknown) => boolean)
  | MatcherConfig[];

export type Matcher = (action: any) => boolean;
export type MatcherProducer<TAction extends Action> = (
  matcherConfig: MatcherConfig
) => Matcher;

export type Reducer<TState> = (state: TState, action: any) => TState;

function isAction(object: unknown): object is Action {
  return (
    typeof object === "object" && typeof (object as any)["type"] === "string"
  );
}

const matchesAction =
  (action: unknown) =>
  (matcherConfig: MatcherConfig): boolean => {
    if (typeof matcherConfig === "boolean") {
      return matcherConfig;
    } else if (typeof matcherConfig === "function") {
      return matcherConfig(action);
    }

    if (isAction(action)) {
      if (typeof matcherConfig === "string") {
        return matcherConfig === action.type;
      } else if (matcherConfig instanceof RegExp) {
        if (matcherConfig.global) {
          console.warn(
            "Do not use global flag (/g) on regex pattern otherwise on other occourence it may not match same string."
          );
        }
        return matcherConfig.test(action.type);
      }
      return false;
    }
    return false;
  };

const multipleMatchesAction = (matchers: MatcherConfig[], action: unknown) =>
  matchers.flat(Number.MAX_VALUE).some(matchesAction(action));

export const createMatcher =
  (...matchers: MatcherConfig[]) =>
  (action: unknown): boolean => {
    return multipleMatchesAction(matchers, action);
  };

export const matchAndReduce = <TState>(
  ...args: [...MatcherConfig[], Reducer<TState>]
) => {
  const matcherConfig = args.slice(0, -1) as MatcherConfig[];
  const matcher = createMatcher(matcherConfig);
  const reducer = args[args.length - 1] as Reducer<TState>;
  if (typeof reducer !== "function") {
    throw new Error("Reducer argument not provided at the end");
  }
  return (state: TState, action: unknown): TState => {
    if (matcher(action)) {
      return reducer(state, action as any);
    }
    return state;
  };
};

export const createReducer = <TState>(
  matchersWithReducers: (
    | Reducer<TState>
    | [...MatcherConfig[], Reducer<TState>]
  )[],
  initialState: TState
) => {
  const preparedReducers: Reducer<TState>[] = matchersWithReducers.map(
    (entry) => {
      if (Array.isArray(entry)) {
        const matcherConfig = entry.slice(0, -1) as MatcherConfig[];
        const reducer = entry[entry.length - 1] as Reducer<TState>;
        return matchAndReduce(matcherConfig, reducer);
      }
      return entry;
    }
  );
  return (state: TState = initialState, action: unknown): TState =>
    preparedReducers.reduce((state, reducer) => reducer(state, action), state);
};
