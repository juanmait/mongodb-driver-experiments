// borrowed from:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/globals.d.ts
//
// Augment the regular ProcessEnv declaration with custom ENVS
declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test'
    BABEL_ENV?: 'development' | 'production' | 'test'
  }
}

// -----------------------------------------------------------------------------
