# Redux Action Matchers

## What it is?
It's a set of functions that allows easier work in reducers and middleware when matching multiple actions at once not only by threir `type` property but also by their content.

## Installation
`npm install action-matchers`

## Example usage

### createReducer()
```typescript
import { createReducer } from "action-matchers";

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

let state = metricsReducer(undefined, setTemperature("3C")); 
// Returned:
// {
//   count: 0,
//   temperature: "3C", <--
//   numberOfCalls: 1, <--
//   numberOfCallsWithSecretString: 0
// }

state = metricsReducer(state, increaseCount(3));
// Returned
// {
//   count: 3, <--
//   temperature: "3C",
//   numberOfCalls: 2, <--
//   numberOfCallsWithSecretString: 0
// }

state = metricsReducer(state, ping());
// Returned
// {
//   count: 3,
//   temperature: "3C",
//   numberOfCalls: 3, <--
//   numberOfCallsWithSecretString: 1 <--
// }

state = metricsReducer(state, signSecretly());
// Returned
// {
//   count: 3,
//   temperature: "3C",
//   numberOfCalls: 3,
//   numberOfCallsWithSecretString: 2 <--
// }
```

## TODO
- More runtime type checking
- Better documentation
- Allow to skip `action` param in reducer

## License
Apache License Version 2.0

## Authors
- Rytis Alekna