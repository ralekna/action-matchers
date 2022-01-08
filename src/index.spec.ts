/**
  Copyright 2021 Rytis Alekna <r.alekna@gmail.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  @author Rytis Alekna
 */
import "jest";
import { Action, createMatcher, createReducer, matchAndReduce } from ".";

describe(`action-matchers unit tests`, () => {
  describe(`match() `, () => {
    const passingAction = {
      type: "passing",
    };

    const withMeta = {
      type: "with-meta",
      meta: "matchThis",
    };

    const withSameNamespace0 = {
      type: "myaction/0",
    };
    const withSameNamespace1 = {
      type: "myaction/1",
    };
    const withSameNamespace2 = {
      type: "myaction/22",
    };

    afterEach(() => {
      jest.clearAllMocks();
    });

    it(`should match action type with string`, () => {
      expect(createMatcher("passing")(passingAction)).toBeTruthy();
    });

    it(`should match action type with regexp`, () => {
      const matchMyAction = createMatcher(/^myaction\/\d+/);
      expect(matchMyAction(withSameNamespace0)).toBeTruthy();
      expect(matchMyAction(withSameNamespace1)).toBeTruthy();
      expect(matchMyAction(withSameNamespace2)).toBeTruthy();
    });

    it(`should not match actions after first match with regexp that has global flag set`, () => {
      const matchMyActionGlobal = createMatcher(/^myaction\/\d+/g);
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      expect(matchMyActionGlobal(withSameNamespace0)).toBeTruthy();
      expect(matchMyActionGlobal(withSameNamespace1)).toBeFalsy();
      // This is trouthy again because regexp lastIndex was reset after previous fail to match
      expect(matchMyActionGlobal(withSameNamespace2)).toBeTruthy();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Do not use global flag (/g) on regex pattern otherwise on other occourence it may not match same string."
      );
    });

    it.each([passingAction, withSameNamespace0])(
      `should match all action with boolean [true] and not match with boolean [false]`,
      (action: Action) => {
        const matchAll = createMatcher(true);
        const matchNone = createMatcher(false);
        expect(matchAll(action)).toBeTruthy();
        expect(matchNone(action)).toBeFalsy();
      }
    );

    it(`should match only those action that has [meta] field with custom mathing function`, () => {
      const matchOnlyWithMeta = createMatcher(
        (action: any) => action?.meta !== undefined
      );
      expect(matchOnlyWithMeta(withMeta)).toBeTruthy();
      expect(matchOnlyWithMeta(passingAction)).toBeFalsy();
    });

    it(`should match with multiple matchers`, () => {
      const multiMatch = createMatcher(
        [["passing"]],
        /^myaction/,
        ({ meta }: any) => meta === "matchThis"
      );
      expect(multiMatch(passingAction)).toBeTruthy();
      expect(multiMatch(withSameNamespace0)).toBeTruthy();
      expect(multiMatch(withSameNamespace1)).toBeTruthy();
      expect(multiMatch(withMeta)).toBeTruthy();
    });
  });

  describe(`matchAndReduce()`, () => {
    type State = {
      count: number;
    };

    let state: State = {
      count: 0,
    };

    function increaseCount(count: number) {
      return {
        type: "increaseCount",
        payload: count,
      };
    }

    function increaseTemperature(temperature: number) {
      return {
        type: "increaseTemperature",
        payload: temperature,
      };
    }

    const reducer = matchAndReduce<State>("increaseCount", (state, action) => {
      return {
        ...state,
        count: state.count + action.payload,
      };
    });

    it(`should alter passed state if reducer matches action`, () => {
      expect(reducer(state, increaseCount(3))).toStrictEqual({ count: 3 });
    });

    it(`should not alter passed state and return it if reducer doesn't match action`, () => {
      expect(reducer(state, increaseTemperature(3))).not.toStrictEqual({
        count: 3,
      });
      expect(reducer(state, increaseTemperature(3))).toBe(state); // same object
    });

    it(`should match with multiple matchers`, () => {
      const reducer = matchAndReduce<State>(
        "increaseCount",
        "increaseTemperature",
        (state, action) => ({
          ...state,
          count: state.count + 1,
        })
      );
      expect(reducer(state, increaseTemperature(3))).toStrictEqual({
        count: 1,
      });
      expect(reducer(state, increaseCount(3))).toStrictEqual({ count: 1 });
    });
  });

  describe(`createReducer()`, () => {
    type State = {
      temperature: string;
      count: number;
      numberOfCalls: number;
      numberOfCallsWithSecretString: number;
    };

    const initialState: State = {
      temperature: "0C",
      count: 0,
      numberOfCalls: 0,
      numberOfCallsWithSecretString: 0,
    };

    function increaseCount(count: number) {
      return {
        type: "increaseCount",
        payload: count,
      };
    }

    function setTemperature(temperature: string) {
      return {
        type: "setTemperature",
        payload: temperature,
      };
    }

    function ping() {
      return {
        type: "ping",
        meta: "secret string",
      };
    }

    function signSecretly() {
      return {
        type: "sign_SECRET",
      };
    }

    type IncreaseCount = ReturnType<typeof increaseCount>;
    type SetTemperature = ReturnType<typeof setTemperature>;

    it(`should create a reducer that passes state to reducers from top to bottom`, () => {

      const metricsReducer = createReducer<State>(
        [
          matchAndReduce<State>(
            "increaseCount",
            (state: State, action: IncreaseCount) => ({
              ...state,
              count: state.count + action.payload,
            })
          ),
          matchAndReduce("setTemperature", (state, action: SetTemperature) => ({
            ...state,
            temperature: action.payload,
          })),
          matchAndReduce(
            "increaseCount",
            "setTemperature",
            "ping",
            (state, action) => ({
              ...state,
              numberOfCalls: state.numberOfCalls + 1,
            })
          ),
          matchAndReduce(
            (action: any) => action.meta === "secret string",
            /_SECRET$/,
            (state, action) => ({
              ...state,
              numberOfCallsWithSecretString:
                state.numberOfCallsWithSecretString + 1,
            })
          ),
        ],
        initialState
      );

      let resultState = metricsReducer(undefined, setTemperature("3C"));
      expect(resultState).toStrictEqual({
        count: 0,
        temperature: "3C",
        numberOfCalls: 1,
        numberOfCallsWithSecretString: 0
      });
      resultState = metricsReducer(resultState, increaseCount(3));
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 2,
        numberOfCallsWithSecretString: 0
      });
      resultState = metricsReducer(resultState, ping());
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 3,
        numberOfCallsWithSecretString: 1
      });
      resultState = metricsReducer(resultState, signSecretly());
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 3,
        numberOfCallsWithSecretString: 2
      });
    });

    it(`should create a reducer by using easier setup`, () => {

      const metricsReducer = createReducer<State>(
        [
          [
            "increaseCount",
            (state, action: IncreaseCount) => ({
              ...state,
              count: state.count + action.payload,
            }),
          ],
          [
            "setTemperature",
            (state, action: SetTemperature) => ({
              ...state,
              temperature: action.payload,
            }),
          ],
          [
            "increaseCount",
            "setTemperature",
            "ping",
            (state, action) => ({
              ...state,
              numberOfCalls: state.numberOfCalls + 1,
            }),
          ],
          [
            (action: any) => action.meta === "secret string",
            /_SECRET$/,
            (state, action) => ({
              ...state,
              numberOfCallsWithSecretString:
                state.numberOfCallsWithSecretString + 1,
            }),
          ],
        ],
        initialState
      );

      let resultState = metricsReducer(undefined, setTemperature("3C"));
      expect(resultState).toStrictEqual({
        count: 0,
        temperature: "3C",
        numberOfCalls: 1,
        numberOfCallsWithSecretString: 0
      });
      resultState = metricsReducer(resultState, increaseCount(3));
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 2,
        numberOfCallsWithSecretString: 0
      });
      resultState = metricsReducer(resultState, ping());
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 3,
        numberOfCallsWithSecretString: 1
      });
      resultState = metricsReducer(resultState, signSecretly());
      expect(resultState).toStrictEqual({
        count: 3,
        temperature: "3C",
        numberOfCalls: 3,
        numberOfCallsWithSecretString: 2
      });
    });
  });
});
