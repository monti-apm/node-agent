declare global {
  namespace NodeJS {
    interface Process {

      /**
       * @internal
       * @deprecated
       * It is recommended to use `process._getActiveHandles()` instead.
       */
      _getActiveRequests(): any[];

      /**
       * @internal
       */
      _getActiveHandles(): any[];

      /**
       * @internal
       */
      _getActiveStreams(): any[];
    }
  }
}